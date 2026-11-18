"""Activation engine with lazy module loading."""

from __future__ import annotations

from importlib import import_module
from typing import Any

_EXPORTS = {
    'ActivationStateRead': ('state', 'ActivationStateRead'),
    'FreeCapLockedError': ('freecap', 'FreeCapLockedError'),
    'activation_banner_payload': ('banner', 'activation_banner_payload'),
    'activation_state_read': ('state', 'activation_state_read'),
    'assert_free_cap_writable': ('freecap', 'assert_free_cap_writable'),
    'dismiss_pitch': ('freecap', 'dismiss_pitch'),
    'free_cap_state': ('freecap', 'free_cap_state'),
    'pitch_state': ('freecap', 'pitch_state'),
    'record_csv_upload': ('state', 'record_csv_upload'),
    'record_route_optimization': ('state', 'record_route_optimization'),
    'reset_workspace': ('reset', 'reset_workspace'),
    'seed_workspace': ('seeding', 'seed_workspace'),
    'supersede_sample_rows': ('seeding', 'supersede_sample_rows'),
}
_MODULES = {'banner', 'freecap', 'ingest', 'reset', 'seeding', 'state'}


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
