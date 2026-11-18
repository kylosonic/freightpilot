"""Billing service package with lazy module loading."""

from __future__ import annotations

from importlib import import_module
from typing import Any

_EXPORTS = {
    'TIER_SPECS': ('pricing', 'TIER_SPECS'),
    'billing_cycle_for': ('pricing', 'billing_cycle_for'),
    'flat_price_etb': ('pricing', 'flat_price_etb'),
    'grace_days_for': ('pricing', 'grace_days_for'),
    'included_units': ('pricing', 'included_units'),
    'next_period_start_after': ('pricing', 'next_period_start_after'),
    'overage_rate_etb': ('pricing', 'overage_rate_etb'),
    'period_for_tier': ('pricing', 'period_for_tier'),
    'tier_title': ('pricing', 'tier_title'),
    'trial_period': ('pricing', 'trial_period'),
}
_MODULES = {
    'credits',
    'invoices',
    'lifecycle',
    'locks',
    'money',
    'pricing',
    'receipt_extraction',
    'receipts',
    'reversals',
    'sms',
    'trusted_payers',
    'wallet',
}


def __getattr__(name: str) -> Any:
    if name in _MODULES:
        value = import_module(f'{__name__}.{name}')
    elif name in _EXPORTS:
        module_name, attribute = _EXPORTS[name]
        value = getattr(import_module(f'{__name__}.{module_name}'), attribute)
    else:
        raise AttributeError(name)
    globals()[name] = value
    return value


__all__ = [*_MODULES, *_EXPORTS]
