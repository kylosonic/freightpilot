import type { LargeSurplusDecision, ReceiptQueueItem, Verdict } from '../../types/api';

export const CASH_FLAG = 'Cash deposit. Ask the customer to confirm this was the transfer they intended to make.';
export const LARGE_SURPLUS_FLAG = 'This amount is much higher than expected. An admin must review it.';
export const LOW_CONFIDENCE_HINT = 'was hard to read. Please check it.';
export const REVERSED_CREDIT_CHIP = 'An earlier credit from this sender was reversed';

export const FIELD_LABELS: Record<string, string> = {
  sender_name: 'Sender name',
  sender_account_number: 'Sender account',
  receiver_account_number: 'Receiver account',
  receiver_name: 'Receiver name',
  transfer_amount: 'Amount',
  transfer_date: 'Transfer date',
  reference_number: 'Reference',
  bank_identifier: 'Bank',
};

export const VERDICT_LABELS: Record<Verdict, string> = {
  verify: 'Verify payment',
  reject_wrong_bank: 'Wrong bank',
  reject_duplicate: 'Duplicate payment',
  reject_illegible: 'Cannot read receipt',
  escalate: 'Ask the customer',
};

export const SURPLUS_LABELS: Record<LargeSurplusDecision, string> = {
  credit_forward: 'Keep the extra credit',
  credit_backward: 'Apply it to an older bill',
  partial_ignore: 'Credit only part of the payment',
};

export function verdictTone(status: ReceiptQueueItem['status']) {
  if (status === 'escalated') return 'warning';
  return 'neutral';
}
