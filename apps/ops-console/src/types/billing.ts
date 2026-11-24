export type SubscriptionTier = 'free' | 'starter' | 'scale' | 'enterprise';

export type SubscriptionPlan = {
  tier: SubscriptionTier;
  title: string;
  monthly_price_usd: number | null;
  seat_limit: number | null;
  vehicle_limit: number | null;
  included_tasks_per_month: number | null;
  overage_unit_price_usd: number | null;
  flat_price_etb?: string | null;
  billing_cycle?: 'monthly' | 'quarterly' | null;
  overage_unit_price_etb?: string | null;
  includes_sso: boolean;
  includes_priority_support: boolean;
};

export type CurrentSubscription = {
  organization_id: string;
  organization_name: string;
  tier: SubscriptionTier;
  status: 'trialing' | 'active' | 'past_due' | 'canceled';
  preferred_ai_provider: string | null;
  preferred_ai_key_id: string | null;
  contact_phone: string | null;
  updated_at: string | null;
};

export type UsageMetric = 'delivery_tasks';

export type UsageSummary = {
  metric: UsageMetric;
  period_start: string;
  period_end: string;
  included_units: number | null;
  used_units: number;
  overage_units: number;
  utilization_percent: number | null;
  estimated_overage_cost_usd: number | null;
  estimated_overage_cost_etb?: number | null;
};

export type ProviderKey = {
  id: string;
  provider_name: string;
  key_name: string;
  masked_key: string;
  status: string;
  created_at: string;
  revoked_at: string | null;
};

export type ProviderKeyTestResult = {
  key_id: string;
  provider_name: string;
  ok: boolean;
  message: string;
};

export type ProviderPreference = {
  organization_id: string;
  provider_name: string | null;
  key_id: string | null;
};

export type OrganizationRole = 'owner' | 'admin' | 'operator' | 'viewer';

export type OrganizationMember = {
  membership_id: string;
  user_id: string;
  username: string;
  email: string | null;
  full_name: string | null;
  role: OrganizationRole;
  is_active: boolean;
  created_at: string;
};

export type OrganizationInvitation = {
  id: string;
  email: string;
  role: Exclude<OrganizationRole, 'owner'>;
  status: 'pending' | 'accepted' | 'revoked';
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
};

export type InvitationCreated = {
  invitation: OrganizationInvitation;
  token: string;
  invite_url: string;
  email_sent: boolean;
  email_error: string | null;
};
