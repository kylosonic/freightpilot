"""SQLAlchemy model registry with lazy imports.

Importing ``app.models.user`` no longer registers every unrelated table. This
keeps Cloudflare's grouped API isolates below their memory limit. The regular
application, tests, and Alembic still work because they load model modules when
the relevant routers or ``load_all_models`` require them.
"""

from __future__ import annotations

from importlib import import_module
from typing import Any

_EXPORTS = {
    'Alert': 'alert',
    'AuditEvent': 'audit_event',
    'BillingCounter': 'billing_counter',
    'CashCollection': 'cash_collection',
    'CollectionAccount': 'collection_account',
    'Customer': 'dispatch',
    'DeliveryOrder': 'dispatch',
    'DeliveryProof': 'dispatch',
    'DisputeThread': 'dispute_thread',
    'DispatchRun': 'dispatch',
    'DockAppointment': 'dock_appointment',
    'Driver': 'driver',
    'Feedback': 'feedback',
    'FleetAsset': 'fleet_asset',
    'FreightInvoice': 'freight_invoice',
    'HistoricalOrder': 'order',
    'Inventory': 'inventory',
    'InvoiceLineItem': 'invoice_line_item',
    'Item': 'item',
    'MeteredEvent': 'metered_event',
    'Notification': 'notification',
    'Organization': 'organization',
    'OrganizationActivationState': 'activation_state',
    'OrganizationInvitation': 'organization_invitation',
    'OrganizationMembership': 'membership',
    'OrganizationUsageCounter': 'usage_meter',
    'PaymentReceipt': 'payment_receipt',
    'ProviderApiKey': 'provider_key',
    'ReceiptExtraction': 'receipt_extraction',
    'ReplenishmentPlan': 'replenishment',
    'RouteOptimizationRun': 'route_history',
    'RouteSchedule': 'route',
    'RouteStop': 'route',
    'SenderFraudFlag': 'sender_fraud_flag',
    'Shipment': 'shipment',
    'SmsMessage': 'sms_message',
    'SubscriptionInvoice': 'subscription_invoice',
    'ThresholdCrossing': 'threshold_crossing',
    'TrialRecord': 'trial_record',
    'TrustedPayer': 'trusted_payer',
    'User': 'user',
    'WalletCredit': 'wallet_credit',
    'Warehouse': 'warehouse',
}
_MODULES = {
    'activation_state',
    'alert',
    'audit_event',
    'billing_counter',
    'cash_collection',
    'collection_account',
    'common',
    'dispatch',
    'dispute_thread',
    'dock_appointment',
    'driver',
    'feedback',
    'fleet_asset',
    'freight_invoice',
    'inventory',
    'invoice_line_item',
    'item',
    'membership',
    'metered_event',
    'notification',
    'order',
    'organization',
    'organization_invitation',
    'payment_receipt',
    'provider_key',
    'receipt_extraction',
    'replenishment',
    'route',
    'route_history',
    'sender_fraud_flag',
    'shipment',
    'sms_message',
    'subscription_invoice',
    'threshold_crossing',
    'trial_record',
    'trusted_payer',
    'usage_meter',
    'user',
    'wallet_credit',
    'warehouse',
}


def __getattr__(name: str) -> Any:
    if name in _MODULES:
        value = import_module(f'{__name__}.{name}')
    elif name in _EXPORTS:
        value = getattr(import_module(f'{__name__}.{_EXPORTS[name]}'), name)
    else:
        raise AttributeError(name)
    globals()[name] = value
    return value


def load_all_models() -> None:
    """Register every ORM table on ``Base.metadata``."""
    for module_name in sorted(_MODULES - {'common'}):
        import_module(f'{__name__}.{module_name}')


__all__ = [*_EXPORTS, 'load_all_models']
