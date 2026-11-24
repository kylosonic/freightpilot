// Phase 4 activation surfaces (blueprint §2.4 / §9)

export type ActivationCategoryStatus = 'real' | 'sample' | 'empty';

export type CategoryMilestone = {
  category: string;
  label: string;
  status: ActivationCategoryStatus;
  real_rows: number;
  sample_rows: number;
  completed: boolean;
};

export type ActivationBanner = {
  visible: boolean;
  n_of_5: number;
  pct_complete: number;
  cta: '/upload' | '/routes' | null;
  demo_mode: boolean;
};

export type FreeCapState = {
  locked: boolean;
  utilization_pct: number | null;
  message: string | null;
};

export type PitchState = {
  banner: 'p100' | 'p80' | 'p60' | null;
  dismissible: boolean;
  fired: string[];
};

export type ActivationState = {
  organization_id: string;
  n_of_5: number;
  pct_complete: number;
  milestones: CategoryMilestone[];
  m6_completed: boolean;
  m6_completed_at: string | null;
  next_step: { category: string; label: string; cta: string } | null;
  banner: ActivationBanner;
  free_cap: FreeCapState;
  pitch: PitchState;
  toast_fired: boolean;
};

export type ResetWorkspaceResult = {
  rows_reseeded: Record<string, number>;
  activation_reset: boolean;
};

export type PitchDismissResult = {
  dismissed: boolean;
};
