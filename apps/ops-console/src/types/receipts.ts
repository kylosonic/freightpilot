export type ReceiptStatus = 'pending' | 'verified' | 'rejected' | 'escalated';
export type Verdict = 'verify' | 'reject_wrong_bank' | 'reject_duplicate' | 'reject_illegible' | 'escalate';
export type TrustedPayerAction = 'added' | 'verified_once';
export type LargeSurplusDecision = 'credit_forward' | 'credit_backward' | 'partial_ignore';
export type ReversalStatus = 'undo' | 'reversed';

export type Receipt = {
  id: string;
  status: ReceiptStatus;
  verdict: Verdict | null;
  invoice_number: string | null;
  reference_number: string | null;
  amount_etb: string | null;
  sender_name: string | null;
  bank_code: string | null;
  rejection_reason: string | null;
  created_at: string;
  decided_at: string | null;
  reversal_status: ReversalStatus | null;
};

export type ReversalRead = {
  receipt_id: string;
  invoice_number: string | null;
  reference_number: string | null;
  amount_etb: string | null;
  reversal_status: ReversalStatus;
  reversal_note: string | null;
  reversed_at: string | null;
  restored_balance_etb: string | null;
  wallet_voided_etb: string | null;
  message: string | null;
};

export type VerifiedReceiptAudit = {
  id: string;
  organization_id: string;
  organization_name: string;
  invoice_number: string | null;
  reference_number: string | null;
  amount_etb: string | null;
  sender_name: string | null;
  decided_at: string | null;
  reversal_status: ReversalStatus | null;
  undo_available: boolean;
  undo_available_until: string | null;
  reverse_available: boolean;
};

export type ReceiptAuditEvent = {
  id: string;
  event_type: string;
  description: string;
  created_at: string;
  payload: Record<string, unknown> | unknown[] | null;
  available_actions: string[];
};

export type ExtractedField = {
  [key: string]: string | null;
};

export type ReceiptQueueItem = {
  id: string;
  organization_id: string;
  organization_name: string;
  invoice_number: string | null;
  invoice_balance_etb: string | null;
  designated_bank_code: string | null;
  status: ReceiptStatus;
  verdict: Verdict | null;
  extracted_fields: ExtractedField;
  confidence: Record<string, number>;
  low_confidence_fields: string[];
  is_new_sender: boolean;
  is_cash_sender: boolean;
  is_wrong_bank_within_portfolio: boolean;
  is_large_surplus: boolean;
  is_duplicate: boolean;
  has_zero_confidence: boolean;
  zero_confidence_warning: string | null;
  recommended_verdict: Verdict | null;
  surplus_etb: string | null;
  large_surplus_decision: LargeSurplusDecision | null;
  partial_credit_amount_etb: string | null;
  trusted_payer_action: TrustedPayerAction | null;
  admin_note: string | null;
  sender_has_reversed_credit: boolean;
  fraud_risk_since: string | null;
  dispute_text: string | null;
  dispute_status: string | null;
  file_name: string;
  content_type: string;
  file_size_bytes: number;
  created_at: string;
};

export type WalletCredit = {
  amount_etb: string;
  status: string;
  applied_to_invoice_number: string | null;
  created_at: string;
};

export type WalletSummary = {
  available_etb: string;
  credits: WalletCredit[];
};
