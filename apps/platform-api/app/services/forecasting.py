from __future__ import annotations

import hashlib
import json
import math
import threading
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from itertools import pairwise
from typing import Any
from uuid import UUID

from app.services.weather import simulated_weather_features
from app.utils.geo import haversine_km


@dataclass
class ForecastResult:
    model_name: str
    predictions: list[dict]
    quality: dict[str, Any]


def _as_date(value: Any) -> date:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value)[:10])


def _week_start(value: Any) -> date:
    current = _as_date(value)
    return current - timedelta(days=current.weekday())


def _number(value: Any, default: float) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return default
    return parsed if math.isfinite(parsed) else default


def _mean(values: list[float], default: float = 0.0) -> float:
    return sum(values) / len(values) if values else default


def _std(values: list[float]) -> float:
    if not values:
        return 0.0
    average = _mean(values)
    return math.sqrt(_mean([(value - average) ** 2 for value in values]))


def build_training_frame(orders: list[dict]) -> list[dict[str, Any]]:
    """Aggregate historical orders into deterministic weekly training rows."""
    if not orders:
        raise ValueError('No historical orders available for forecasting.')

    grouped: dict[tuple[date, str, str], dict[str, list[float]]] = {}
    for order in orders:
        key = (
            _week_start(order['order_date']),
            str(order['warehouse_code']),
            str(order['sku']),
        )
        values = grouped.setdefault(
            key,
            {
                'quantity': [],
                'weather_avg_temp_c': [],
                'weather_precip_mm': [],
                'weather_disruption_index': [],
            },
        )
        values['quantity'].append(_number(order.get('quantity'), 0.0))
        values['weather_avg_temp_c'].append(
            _number(order.get('weather_avg_temp_c'), 20.0)
        )
        values['weather_precip_mm'].append(
            _number(order.get('weather_precip_mm'), 3.0)
        )
        values['weather_disruption_index'].append(
            _number(order.get('weather_disruption_index'), 0.2)
        )

    rows: list[dict[str, Any]] = []
    for (week, warehouse_code, sku), values in sorted(grouped.items()):
        rows.append(
            {
                'week_start': week,
                'warehouse_code': warehouse_code,
                'sku': sku,
                'quantity': sum(values['quantity']),
                'weather_avg_temp_c': _mean(values['weather_avg_temp_c'], 20.0),
                'weather_precip_mm': _mean(values['weather_precip_mm'], 3.0),
                'weather_disruption_index': _mean(
                    values['weather_disruption_index'],
                    0.2,
                ),
                'week_of_year': week.isocalendar().week,
                'month': week.month,
            }
        )
    return rows


def _training_frame_hash(training_rows: list[dict[str, Any]]) -> str:
    columns = (
        'week_start',
        'warehouse_code',
        'sku',
        'quantity',
        'weather_avg_temp_c',
        'weather_precip_mm',
        'weather_disruption_index',
    )
    normalized = [
        {
            column: row[column].isoformat() if isinstance(row[column], date) else row[column]
            for column in columns
        }
        for row in training_rows
    ]
    encoded = json.dumps(
        normalized,
        sort_keys=True,
        separators=(',', ':'),
    ).encode('utf-8')
    return hashlib.sha256(encoded).hexdigest()[:16]


_quality_cache: dict[str, dict[str, Any]] = {}
_QUALITY_CACHE_LIMIT = 10
_QUALITY_CACHE_LOCK = threading.Lock()


def _remember(cache: dict[str, Any], cache_key: str, value: Any, limit: int) -> None:
    if cache_key not in cache and len(cache) >= limit:
        cache.pop(next(iter(cache)))
    cache[cache_key] = value


def _remember_quality(cache_key: str, quality: dict[str, Any]) -> None:
    with _QUALITY_CACHE_LOCK:
        _remember(_quality_cache, cache_key, quality, _QUALITY_CACHE_LIMIT)


def _series(
    training_rows: list[dict[str, Any]],
    warehouse_code: str,
    sku: str,
) -> list[dict[str, Any]]:
    return sorted(
        (
            row
            for row in training_rows
            if row['warehouse_code'] == warehouse_code and row['sku'] == sku
        ),
        key=lambda row: row['week_start'],
    )


def _index_training_rows(
    training_rows: list[dict[str, Any]],
) -> tuple[dict[tuple[str, str], list[dict[str, Any]]], list[date]]:
    series_by_pair: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for row in training_rows:
        key = (str(row['warehouse_code']), str(row['sku']))
        series_by_pair.setdefault(key, []).append(row)
    for series in series_by_pair.values():
        series.sort(key=lambda row: row['week_start'])
    all_weeks = sorted({row['week_start'] for row in training_rows})
    return series_by_pair, all_weeks


def _linear_trend(x_values: list[float], y_values: list[float], future_x: float) -> float:
    if len(y_values) < 2 or max(x_values) == min(x_values):
        return y_values[-1]
    mean_x = _mean(x_values)
    mean_y = _mean(y_values)
    denominator = sum((value - mean_x) ** 2 for value in x_values)
    slope = (
        sum((x - mean_x) * (y - mean_y) for x, y in zip(x_values, y_values, strict=True))
        / denominator
    )
    intercept = mean_y - (slope * mean_x)
    return intercept + (slope * future_x)


def _predict_row(
    training_rows: list[dict[str, Any]],
    warehouse_code: str,
    sku: str,
    target_date: date,
    weather: dict[str, float],
    *,
    series_by_pair: dict[tuple[str, str], list[dict[str, Any]]] | None = None,
    all_weeks: list[date] | None = None,
) -> float:
    series = (
        series_by_pair.get((warehouse_code, sku), [])
        if series_by_pair is not None
        else _series(training_rows, warehouse_code, sku)
    )
    if not series:
        return 0.0

    all_weeks = all_weeks or sorted({row['week_start'] for row in training_rows})
    origin = all_weeks[0]
    x_values = [float((row['week_start'] - origin).days // 7) for row in series]
    y_values = [float(row['quantity']) for row in series]
    future_x = float((target_date - origin).days // 7)
    linear = max(0.0, _linear_trend(x_values, y_values, future_x))

    recent = _mean(y_values[-min(4, len(y_values)) :])
    prediction = (linear * 0.65) + (recent * 0.35)

    baseline_disruption = _mean(
        [float(row['weather_disruption_index']) for row in series],
        0.2,
    )
    baseline_temp = _mean([float(row['weather_avg_temp_c']) for row in series], 20.0)
    target_disruption = _number(weather.get('weather_disruption_index'), 0.2)
    target_temp = _number(weather.get('weather_avg_temp_c'), 20.0)
    disruption_factor = max(
        0.65,
        1.0 - (max(0.0, target_disruption - baseline_disruption) * 1.5),
    )
    temperature_factor = 1.0 - min(0.15, abs(target_temp - baseline_temp) / 200)
    return max(0.0, prediction * disruption_factor * temperature_factor)


def _evaluate_quality(
    training_rows: list[dict[str, Any]],
    cache_key: str,
) -> dict[str, Any]:
    with _QUALITY_CACHE_LOCK:
        cached = _quality_cache.get(cache_key)
        if cached is not None:
            return cached

    weeks = sorted({row['week_start'] for row in training_rows})
    history_weeks = len(weeks)
    result: dict[str, Any] = {
        'status': 'insufficient_history',
        'history_weeks': history_weeks,
        'holdout_weeks': 0,
        'evaluated_rows': 0,
        'mae': None,
        'wape_percent': None,
        'range_basis': 'trend_residual_band',
        'interpretation': 'Treat this forecast as directional until more demand history is available.',
        'caveat': (
            f'Only {history_weeks} week(s) of demand history are available. '
            'No held-out backtest can be reported.'
        ),
    }
    if history_weeks < 3:
        _remember_quality(cache_key, result)
        return result

    holdout_weeks = min(4, max(1, history_weeks // 4))
    cutoff = weeks[-holdout_weeks]
    train_rows = [row for row in training_rows if row['week_start'] < cutoff]
    test_rows = [row for row in training_rows if row['week_start'] >= cutoff]
    if not train_rows or not test_rows:
        _remember_quality(cache_key, result)
        return result

    train_series, train_weeks = _index_training_rows(train_rows)
    predictions: list[float] = []
    actuals: list[float] = []
    for row in test_rows:
        weather = {
            'weather_avg_temp_c': float(row['weather_avg_temp_c']),
            'weather_precip_mm': float(row['weather_precip_mm']),
            'weather_disruption_index': float(row['weather_disruption_index']),
        }
        predictions.append(
            _predict_row(
                train_rows,
                row['warehouse_code'],
                row['sku'],
                row['week_start'],
                weather,
                series_by_pair=train_series,
                all_weeks=train_weeks,
            )
        )
        actuals.append(float(row['quantity']))

    absolute_errors = [
        abs(predicted - actual)
        for predicted, actual in zip(predictions, actuals, strict=True)
    ]
    mae = _mean(absolute_errors)
    actual_total = sum(actuals)
    wape = (sum(absolute_errors) / actual_total * 100) if actual_total > 0 else None
    status = (
        'validated'
        if history_weeks >= 6 and len(test_rows) >= 4 and wape is not None
        else 'limited'
    )

    if wape is None:
        interpretation = 'Backtest demand was zero, so percentage error cannot be calculated.'
    elif wape <= 20:
        interpretation = 'Held-out error is within 20% of actual demand; use normal review before approval.'
    elif wape <= 35:
        interpretation = 'Held-out error is moderate; confirm the plan against recent demand before approval.'
    else:
        interpretation = 'Held-out error is high; treat the forecast as directional and review assumptions.'

    result.update(
        {
            'status': status,
            'holdout_weeks': holdout_weeks,
            'evaluated_rows': len(test_rows),
            'mae': round(mae, 2),
            'wape_percent': round(wape, 1) if wape is not None else None,
            'range_basis': (
                'trend_residual_band_widened_by_holdout_error'
                if wape is not None
                else 'trend_residual_band'
            ),
            'interpretation': interpretation,
            'caveat': (
                f'Backtested on the most recent {holdout_weeks} week(s), held out from training. '
                'This measures error on known demand; it is not a guarantee of future demand. '
                'WAPE is aggregated across all warehouse/SKU rows, so one sparse or volatile '
                'series can have much higher error than the aggregate suggests.'
            ),
        }
    )
    _remember_quality(cache_key, result)
    return result


def _uncertainty(
    training_rows: list[dict[str, Any]],
    warehouse_code: str,
    sku: str,
    predicted: float,
    *,
    series_by_pair: dict[tuple[str, str], list[dict[str, Any]]] | None = None,
) -> float:
    series = (
        series_by_pair.get((warehouse_code, sku), [])
        if series_by_pair is not None
        else _series(training_rows, warehouse_code, sku)
    )
    quantities = [float(row['quantity']) for row in series]
    if len(quantities) < 2:
        return abs(predicted) * 0.15
    differences = [
        later - earlier
        for earlier, later in pairwise(quantities)
    ]
    residual_scale = _std(differences) if len(quantities) > 2 else _std(quantities)
    return max(residual_scale, abs(predicted) * 0.15)


def forecast_weekly_demand(
    orders: list[dict],
    warehouse_weather_lookup: dict[str, dict[str, float]],
    horizon_weeks: int = 4,
) -> ForecastResult:
    training_rows = build_training_frame(orders)
    cache_key = _training_frame_hash(training_rows)
    quality = _evaluate_quality(training_rows, cache_key)
    wape = quality.get('wape_percent')
    series_by_pair, all_weeks = _index_training_rows(training_rows)

    latest_week = max(row['week_start'] for row in training_rows)
    combos = sorted(
        {(row['warehouse_code'], row['sku']) for row in training_rows},
    )
    predictions: list[dict] = []

    for step in range(1, horizon_weeks + 1):
        future_week = latest_week + timedelta(days=7 * step)
        for warehouse_code, sku in combos:
            weather = warehouse_weather_lookup.get(
                warehouse_code,
                {
                    'weather_avg_temp_c': 20.0,
                    'weather_precip_mm': 3.0,
                    'weather_disruption_index': 0.2,
                },
            )
            predicted = _predict_row(
                training_rows,
                warehouse_code,
                sku,
                future_week,
                weather,
                series_by_pair=series_by_pair,
                all_weeks=all_weeks,
            )
            spread = _uncertainty(
                training_rows,
                warehouse_code,
                sku,
                predicted,
                series_by_pair=series_by_pair,
            )
            planning_low = max(0.0, predicted - 1.28 * spread)
            planning_high = predicted + 1.28 * spread
            if wape is not None:
                planning_low = min(
                    planning_low,
                    max(predicted * (1 - wape / 100), 0.0),
                )
                planning_high = max(
                    planning_high,
                    predicted * (1 + wape / 100),
                )
            predictions.append(
                {
                    'week_start': future_week,
                    'warehouse_code': warehouse_code,
                    'sku': sku,
                    'predicted_demand': float(round(predicted, 2)),
                    'planning_low': float(round(planning_low, 2)),
                    'planning_high': float(round(planning_high, 2)),
                }
            )

    return ForecastResult(
        model_name='TrendRegressor',
        predictions=predictions,
        quality=quality,
    )


def calculate_arrival_probability(
    route_id: UUID,
    current_lat: float,
    current_lon: float,
    historical_runs: list[dict],
    route_destination: dict[str, float] | None = None,
) -> dict:
    del route_id
    now = datetime.now(tz=UTC)
    if len(historical_runs) < 10:
        fallback_minutes = 60.0
        if historical_runs:
            fallback_minutes = _mean(
                [
                    _number(run.get('estimated_duration_min'), 60.0)
                    for run in historical_runs
                ],
                60.0,
            )
        return {
            'predicted_eta': (now + timedelta(minutes=fallback_minutes)).isoformat(),
            'confidence_score': 0.1,
        }

    durations = [
        _number(run.get('estimated_duration_min'), 60.0) for run in historical_runs
    ]
    speeds = [_number(run.get('speed_kmh'), 50.0) for run in historical_runs]
    stops = [_number(run.get('stops_count'), 1.0) for run in historical_runs]

    if route_destination:
        remaining_distance_km = haversine_km(
            current_lat,
            current_lon,
            route_destination['latitude'],
            route_destination['longitude'],
        )
    else:
        remaining_distance_km = (
            _mean([_number(run.get('total_distance_km'), 0.0) for run in historical_runs])
            * 0.5
        )

    weather = simulated_weather_features(now.date(), current_lat, current_lon)
    effective_speed = max(_mean(speeds), 10.0)
    travel_minutes = remaining_distance_km / effective_speed * 60
    stop_minutes = _mean(stops) * 5
    disruption_minutes = _number(weather['weather_disruption_index'], 0.2) * 15
    predicted_minutes = max(0.0, travel_minutes + stop_minutes + disruption_minutes)

    mean_duration = _mean(durations)
    coefficient_of_variation = _std(durations) / mean_duration if mean_duration else 1.0
    confidence = round(max(0.0, min(1.0, 1.0 - coefficient_of_variation)), 2)

    return {
        'predicted_eta': (now + timedelta(minutes=predicted_minutes)).isoformat(),
        'confidence_score': confidence,
    }
