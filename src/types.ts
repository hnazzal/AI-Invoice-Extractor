
export interface User {
  id: string;
  email: string;
  token: string;
  companyName?: string;
  role?: 'user' | 'admin';
}

export interface UserProfile {
  id: string;
  email: string;
  role: 'user' | 'admin';
  company_name: string;
  created_at: string;
  total_invoices_count?: number;
  total_spent?: number;
}

export type Language = 'en' | 'ar';
export type Theme = 'light' | 'dark';
export type Currency = 'USD' | 'JOD';

export type Screen = 'login' | 'signup' | 'dashboard' | 'admin';

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id?: string; // The database UUID, optional for newly extracted invoices
  clientId?: string; // A temporary client-side ID for unsaved invoices
  invoiceNumber: string;
  vendorName: string;
  customerName: string;
  invoiceDate: string;
  totalAmount: number;
  items: InvoiceItem[];
  uploaderEmail?: string;
  uploaderCompany?: string; // For admin view
  paymentStatus: 'paid' | 'unpaid';
  sourceFileBase64?: string;
  sourceFileMimeType?: string;
  processingCost?: number; // Cost of the AI extraction in USD
}

export interface Anomaly {
  invoiceId?: string;
  invoiceNumber: string;
  issue: string;
  severity: 'high' | 'medium' | 'low';
}

export interface KPIResult {
  label: string;
  value: string | number;
  unit?: string;
}

export interface Translations {
  [key: string]: string;
}
