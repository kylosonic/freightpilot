"""Add platform-admin privilege separate from tenant roles.

Revision ID: 20261122_0027
Revises: 20261107_0026
Create Date: 2026-11-22 00:00:00.000000
"""

import sqlalchemy as sa

from alembic import op

revision = '20261122_0027'
down_revision = '20261107_0026'
branch_labels = None
depends_on = None

_FK_INDEXES = (
    ('alerts', 'resolved_by_user_id'),
    ('alerts', 'acknowledged_by_user_id'),
    ('organization_invitations', 'accepted_by_user_id'),
    ('organization_invitations', 'invited_by_user_id'),
    ('subscription_invoices', 'designated_account_id'),
    ('trusted_payers', 'added_by_user_id'),
    ('dispatch_runs', 'created_by_user_id'),
    ('dispatch_runs', 'cash_closed_by_user_id'),
    ('payment_receipts', 'reversed_by_user_id'),
    ('payment_receipts', 'decision_made_by_user_id'),
    ('replenishment_plans', 'approved_by_user_id'),
    ('replenishment_plans', 'created_by_user_id'),
    ('route_schedules', 'assigned_asset_id'),
    ('route_schedules', 'start_warehouse_id'),
    ('delivery_orders', 'item_id'),
    ('dispute_threads', 'submitted_by_user_id'),
    ('dispute_threads', 'receipt_id'),
    ('dispute_threads', 'resolved_by_user_id'),
    ('receipt_extractions', 'receipt_id'),
    ('route_stops', 'warehouse_id'),
    ('shipments', 'route_schedule_id'),
    ('sms_messages', 'receipt_id'),
    ('wallet_credits', 'receipt_id'),
    ('wallet_credits', 'applied_to_invoice_id'),
    ('cash_collections', 'settled_by_id'),
)


def _has_index_covering_column(inspector, table: str, column: str) -> bool:
    if not inspector.has_table(table):
        return True
    return any(
        index.get('column_names') and index['column_names'][0] == column
        for index in inspector.get_indexes(table)
    )


def _ensure_fk_indexes() -> None:
    inspector = sa.inspect(op.get_bind())
    for table, column in _FK_INDEXES:
        if _has_index_covering_column(inspector, table, column):
            continue
        op.create_index(f'ix_{table}_{column}', table, [column])


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    columns = {column['name'] for column in inspector.get_columns('users')}
    if 'is_platform_admin' not in columns:
        with op.batch_alter_table('users') as batch_op:
            batch_op.add_column(
                sa.Column(
                    'is_platform_admin',
                    sa.Boolean(),
                    nullable=False,
                    server_default=sa.false(),
                )
            )

    _ensure_fk_indexes()

    threshold_checks = (
        {constraint['name'] for constraint in inspector.get_check_constraints('threshold_crossings')}
        if inspector.has_table('threshold_crossings')
        else {'ck_threshold_crossing_level'}
    )
    if inspector.has_table('threshold_crossings') and 'ck_threshold_crossing_level' not in threshold_checks:
        with op.batch_alter_table('threshold_crossings') as batch_op:
            batch_op.create_check_constraint(
                'ck_threshold_crossing_level',
                "threshold_level IN ('p60', 'p80')",
            )

    wallet_fks = (
        sa.inspect(op.get_bind()).get_foreign_keys('wallet_credits')
        if sa.inspect(op.get_bind()).has_table('wallet_credits')
        else []
    )
    receipt_fk = next(
        (
            fk
            for fk in wallet_fks
            if fk.get('constrained_columns') == ['receipt_id']
        ),
        None,
    )
    if receipt_fk is not None and receipt_fk.get('options', {}).get('ondelete') != 'CASCADE':
        with op.batch_alter_table('wallet_credits') as batch_op:
            batch_op.drop_constraint(receipt_fk['name'], type_='foreignkey')
            batch_op.create_foreign_key(
                'fk_wallet_credits_receipt_id_payment_receipts',
                'payment_receipts',
                ['receipt_id'],
                ['id'],
                ondelete='CASCADE',
            )


def downgrade() -> None:
    columns = {column['name'] for column in sa.inspect(op.get_bind()).get_columns('users')}
    if 'is_platform_admin' in columns:
        with op.batch_alter_table('users') as batch_op:
            batch_op.drop_column('is_platform_admin')

    inspector = sa.inspect(op.get_bind())
    for table, column in reversed(_FK_INDEXES):
        index_name = f'ix_{table}_{column}'
        existing = (
            {index['name'] for index in inspector.get_indexes(table)}
            if inspector.has_table(table)
            else set()
        )
        if index_name in existing:
            op.drop_index(index_name, table_name=table)
