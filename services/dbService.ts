import type { User, Invoice, InvoiceItem } from '../types';
import { SUPABASE_URL as configUrl, SUPABASE_ANON_KEY as configKey } from '../config';

// --- Supabase Credentials ---
const SUPABASE_URL = configUrl;
const SUPABASE_ANON_KEY = configKey;

// Export a flag to check if the service is properly configured.
export const isConfigured = !!SUPABASE_URL && !!SUPABASE_ANON_KEY && !SUPABASE_URL.includes('YOUR_SUPABASE_URL');


// --- API Helper ---
const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const defaultHeaders: Record<string, string> = {
        'apikey': SUPABASE_ANON_KEY,
    };

    if (options.body) {
        defaultHeaders['Content-Type'] = 'application/json';
    }

    const mergedOptions: RequestInit = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
    };
    
    const response = await fetch(`${SUPABASE_URL}${endpoint}`, mergedOptions);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred.' }));
        throw new Error(errorData.msg || errorData.error_description || errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    if (response.status === 204 || response.headers.get('content-length') === '0') {
        return null;
    }

    return response.json();
};


// --- User Management ---

export const signUpUser = async (email: string, password: string): Promise<any> => {
    return apiFetch('/auth/v1/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
};

export const loginUser = async (email: string, password: string): Promise<User> => {
    const response = await apiFetch('/auth/v1/token?grant_type=password', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });

    return {
        id: response.user.id,
        email: response.user.email,
        token: response.access_token,
    };
};

// --- Invoice Management ---

const mapDbItemToAppItem = (dbItem: any): InvoiceItem => ({
  description: dbItem.description,
  quantity: dbItem.quantity,
  unitPrice: dbItem.unit_price,
  total: dbItem.total,
});

const mapDbInvoiceToAppInvoice = (dbInvoice: any): Invoice => ({
  id: dbInvoice.id,
  invoiceNumber: dbInvoice.invoice_number,
  vendorName: dbInvoice.vendor_name,
  customerName: dbInvoice.customer_name,
  invoiceDate: dbInvoice.invoice_date,
  totalAmount: dbInvoice.total_amount,
  paymentStatus: dbInvoice.status || 'unpaid',
  items: dbInvoice.invoice_items ? dbInvoice.invoice_items.map(mapDbItemToAppItem) : [],
  sourceFileBase64: dbInvoice.source_file_base64,
  sourceFileMimeType: dbInvoice.source_file_mime_type,
});


export const getInvoicesForUser = async (token: string): Promise<Invoice[]> => {
    // Use Supabase foreign table embedding to get invoices and their items in one call.
    const data = await apiFetch('/rest/v1/invoices?select=*,invoice_items(*)&order=created_at.desc', {
        headers: {
            'Authorization': `Bearer ${token}`,
        }
    });
    // Map the database response to the application's Invoice type
    return data.map(mapDbInvoiceToAppInvoice);
};

export const saveInvoiceForUser = async (user: User, invoice: Invoice): Promise<Invoice> => {
    // 1. Prepare and insert the master invoice data
    const masterInvoicePayload = {
        user_id: user.id,
        invoice_number: invoice.invoiceNumber,
        vendor_name: invoice.vendorName,
        customer_name: invoice.customerName,
        invoice_date: invoice.invoiceDate,
        total_amount: invoice.totalAmount,
        status: invoice.paymentStatus || 'unpaid',
        source_file_base_64: invoice.sourceFileBase64,
        source_file_mime_type: invoice.sourceFileMimeType,
    };

    const [savedMasterInvoice] = await apiFetch('/rest/v1/invoices', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${user.token}`,
            'Prefer': 'return=representation'
        },
        body: JSON.stringify(masterInvoicePayload),
    });

    const newInvoiceId = savedMasterInvoice.id;

    // 2. Prepare and bulk insert the invoice items
    if (invoice.items && invoice.items.length > 0) {
        const itemsPayload = invoice.items.map(item => ({
            invoice_id: newInvoiceId,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            total: item.total,
        }));

        await apiFetch('/rest/v1/invoice_items', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${user.token}`,
            },
            body: JSON.stringify(itemsPayload),
        });
    }

    // 3. Return the complete invoice object as it should exist in the app state
    return {
        ...invoice,
        id: newInvoiceId,
        uploaderEmail: user.email,
    };
};

export const updateInvoicePaymentStatus = async (token: string, invoiceId: string, newStatus: 'paid' | 'unpaid'): Promise<void> => {
    // By using 'return=minimal', we only perform the update and don't ask for the
    // updated record back. This avoids the schema cache error which happens when
    // PostgREST tries to SELECT the data after the update.
    await apiFetch(`/rest/v1/invoices?id=eq.${invoiceId}`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ status: newStatus }),
    });
};


export const deleteInvoiceForUser = async (token: string, invoiceDbId: string): Promise<void> => {
    // This remains the same. ON DELETE CASCADE in the DB will handle deleting the items.
    await apiFetch(`/rest/v1/invoices?id=eq.${invoiceDbId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
        }
    });
};
