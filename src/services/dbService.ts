import type { User, Invoice, InvoiceItem } from '../types';
import { config, isDbConfigured } from '../config';

// Export a flag to check if the service is properly configured.
export const isConfigured = isDbConfigured;


// --- API Helper ---
const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    if (!isConfigured) {
        throw new Error("Supabase is not configured. Check environment variables.");
    }
    const defaultHeaders: Record<string, string> = {
        // Use config object and non-null assertion as isConfigured check guarantees the key exists.
        'apikey': config.supabaseAnonKey!,
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
    
    const response = await fetch(`${config.supabaseUrl!}${endpoint}`, mergedOptions);

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

/**
 * Tries to parse a date string from various common formats and returns it as 'YYYY-MM-DD'.
 * Throws an error with a clear message if the date is invalid.
 */
const normalizeDate = (dateString: string): string => {
    if (!dateString || typeof dateString !== 'string') {
        throw new Error('Invoice date is missing or invalid.');
    }
    // Attempt to parse the date. This is robust against formats like "MM/DD/YYYY", "DD-MM-YYYY", "YYYY-MM-DD", etc.
    const date = new Date(dateString);

    // Check if the parsed date is valid. `isNaN(date.getTime())` is a reliable way to check.
    if (isNaN(date.getTime())) {
        throw new Error(`Invalid date format: "${dateString}". Please correct it to YYYY-MM-DD format.`);
    }

    // Format the date to 'YYYY-MM-DD'
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};


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
  sourceFileBase64: dbInvoice.source_file_base_64,
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
    const newInvoiceId = crypto.randomUUID();

    // Create the master invoice payload.
    const masterInvoicePayload = {
        id: newInvoiceId,
        user_id: user.id,
        invoice_number: invoice.invoiceNumber,
        vendor_name: invoice.vendorName,
        customer_name: invoice.customerName,
        invoice_date: normalizeDate(invoice.invoiceDate),
        total_amount: invoice.totalAmount,
        status: invoice.paymentStatus || 'unpaid',
        source_file_base_64: invoice.sourceFileBase64,
        source_file_mime_type: invoice.sourceFileMimeType,
    };

    // Post the master invoice record. `return=minimal` is efficient and avoids RLS select issues.
    await apiFetch('/rest/v1/invoices', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${user.token}`,
            'Prefer': 'return=minimal'
        },
        body: JSON.stringify(masterInvoicePayload),
    });

    // Bulk insert the invoice items using the same client-generated ID.
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
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify(itemsPayload),
        });
    }

    // Return the saved invoice data (without file data) to update the UI.
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