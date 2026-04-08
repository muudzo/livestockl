/**
 * BillPay Vendor API v1.33 TypeScript Types
 * Mirrors the Paynow BillPay API request/response shapes exactly.
 */

// ─── API Action Types ───

export type BillPayAction = 'Auth' | 'Pay' | 'Retry' | 'Status';

export type BillPayStatus =
  | 'Authorized'
  | 'BeingProcessed'
  | 'Paid'
  | 'Reversed'
  | 'Failed'
  | 'Flagged';

// ─── Request Types ───

export interface BillPayPaymentRequest {
  Action: BillPayAction;
  BillerCode: string;
  Reference: string;
  MemberNumber: string;
  Products: BillPayProductRequest[];
  TotalAmount: number | '';
  PayerDetails?: PayerDetails;
}

export interface BillPayProductRequest {
  Code: string;
  Quantity: number;
  Price?: number;
  Department?: string;
  RequiresForexPayment?: boolean;
  Metadata?: Record<string, string>[];
}

export interface PayerDetails {
  BankAccountName?: string;
  BankAccountNumber?: string;
  BankName?: string;
  BankBranch?: string;
  BankReference?: string;
  ContactNumber?: string;
  NationalId?: string;
}

export interface BillPayStatusRequest {
  Reference: string;
  Action: 'Status' | 'Retry';
}

export interface BillPayReverseRequest {
  OriginalReference: string;
  Reference: string;
}

// ─── Response Types ───

export interface BillPayPaymentResponse {
  Action: string;
  BillerCode: string;
  Reference: string;
  MemberNumber: string;
  Products: BillPayProductResponse[];
  TotalAmount: number;
  Status: BillPayStatus;
  MemberName: string;
  Narration?: string;
  TechnicalNarration?: string;
  BillPayReference: string;
  BillerPaymentReference?: string;
  AuthData?: AuthResponseData;
  PaymentData?: PaymentResponseData;
  Currency?: string;
  WalletDebitReference?: string;
  WalletBalanceAfterDebit?: number | null;
  WalletDebitReversed?: string | null;
  WalletBalanceAfterReversal?: number | null;
  VendorServiceFeeCurrency?: string;
  VendorServiceFee?: number | null;
  VendorInvoiceReference?: string;
  VendorFiscalSignature?: string;
  VendorFiscalMetadata?: string;
  VendorReversalReference?: string;
}

export interface BillPayProductResponse {
  Code: string;
  Name: string;
  Quantity: number;
  Department?: string;
  Price: number;
  AccountBalance?: number | null;
  RequiresForexPayment: boolean;
  Vouchers?: ProductVoucherData[];
  Metadata?: Record<string, string>[];
  VendorCommission?: number | null;
}

export interface ProductVoucherData {
  SerialNumber: string;
  Pin: string;
  ValidDays?: number | null;
  Batch: string;
  VoucherCode: string;
  ExpiryDate?: string | null;
}

export interface AuthResponseData {
  MemberName: string;
  MemberAddress?: string;
  AccountDetails?: Record<string, string>;
  AccountBalances?: Record<string, string>;
  AccountBalance?: number | null;
}

export interface PaymentResponseData {
  ReceiptHtml?: string[];
  DisplayData?: Record<string, string>;
  ReceiptSmses?: string[];
}

export interface BillPayReverseResponse {
  OriginalReference: string;
  Reference: string;
  ErrorCode: number;
  Narration?: string;
  TechnicalNarration?: string;
  BillpayReference?: string;
  BillerReference?: string;
}

export const REVERSAL_ERROR_CODES: Record<number, string> = {
  0: 'Reversal was successful',
  1: 'Original payment not found',
  2: 'Duplicate vendor reversal reference',
  3: 'Biller failed to reverse payment',
  4: 'Biller does not support reversals',
  5: 'Original payment is already refunded',
  99: 'General error',
};

// ─── ListBillers Types ───

export interface BillerConfig {
  Code: string;
  Name: string;
  Description: string;
  IconUrl: string;
  LogoUrl: string;
  ReferencePrefix: string;
  Enabled: boolean;
  MemberNumberFieldDesc: string;
  MemberNumberFieldLabel: string;
  MemberNumberFieldRegex: string;
  AllowMultipleProductsPerPayment: boolean;
  MetaTitle: string;
  MetaDescription: string;
  Products: BillerProductConfig[];
  VendorMustInvoicePayments: boolean;
}

export interface BillerProductConfig {
  Code: string;
  Name: string;
  Description: string;
  Price: number | null;
  Department: string | null;
  RequiresForex: boolean | null;
  ReturnsVouchers: boolean;
  IconUrl: string;
  LogoUrl: string;
  PrePurchaseInstructions: string | null;
  PostPurchaseInstructions: string | null;
  AmountFieldLabel: string;
  AmountFieldDesc: string;
  MinAmount: number | null;
  MaxAmount: number | null;
  NewProduct: boolean;
  InvoiceTitle: string;
  Enabled: boolean;
  ReminderDays: number | null;
  AuthAmountMandated: boolean | null;
  AllowSpecifyQuantity: boolean;
  QuantityFieldLabel: string;
  QuantityFieldDesc: string;
  MetadataFields: ProductMetaField[];
}

export interface ProductMetaField {
  Name: string;
  Required: boolean;
  Description: string;
}

// ─── Wallet Types ───

export interface WalletInfo {
  Currency: string;
  Balance: number;
  LowBalance: number;
  MinimumBalance: number;
  Status: 'Open' | 'Suspended' | 'Closed';
}

// ─── Member Information Types ───

export interface MemberInfoResponse {
  AuthData: AuthResponseData;
  ResultCode: 0 | 1 | 2;
  Narration?: string;
  TechnicalNarration?: string;
}

// ─── Internal DB Status (lowercase, matches schema CHECK) ───

export type BillPaymentDbStatus =
  | 'pending'
  | 'authorized'
  | 'being_processed'
  | 'paid'
  | 'failed'
  | 'flagged'
  | 'reversed';

/** Map Paynow API status to our DB status */
export function mapApiStatusToDb(apiStatus: BillPayStatus): BillPaymentDbStatus {
  const map: Record<BillPayStatus, BillPaymentDbStatus> = {
    Authorized: 'authorized',
    BeingProcessed: 'being_processed',
    Paid: 'paid',
    Reversed: 'reversed',
    Failed: 'failed',
    Flagged: 'flagged',
  };
  return map[apiStatus] || 'failed';
}

// ─── Curated Biller List (farmer-relevant) ───

export const CURATED_BILLER_CODES = [
  'ZETDC',    // ZESA prepaid electricity
  'AIRTIME',  // Paynow airtime
  'COH',      // City of Harare
  'BCC',      // Bulawayo City Council
  'MAS',      // City of Masvingo
  'GWE',      // Gweru City Council
  'UZ',       // University of Zimbabwe
  'NUST',     // National University of Science & Technology
  'MSU',      // Midlands State University
  'GZU',      // Great Zimbabwe University
  'CIMAS',    // CIMAS Medical Aid
  'FMH',      // First Mutual Health
  'NLAC',     // Nyaradzo Life Assurance
  'DOVES',    // Doves Funeral
  'DSTV',     // DSTV
] as const;
