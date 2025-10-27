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
  items: [], // Items will be fetched on demand.
  sourceFileBase64: undefined, // File content will be fetched on demand.
  sourceFileMimeType: dbInvoice.source_file_mime_type, // We only fetch this to know if a file exists.
});


export const getInvoicesForUser = async (token: string): Promise<Invoice[]> => {
    // Fetch only the necessary fields for the main table view to ensure a fast and reliable login.
    const query = '/rest/v1/invoices?select=id,invoice_number,vendor_name,customer_name,invoice_date,total_amount,status,source_file_mime_type&order=created_at.desc';
    const data = await apiFetch(query, {
        headers: {
            'Authorization': `Bearer ${token}`,
        }
    });
    return data.map(mapDbInvoiceToAppInvoice);
};

export const getInvoiceItems = async (token: string, invoiceId: string): Promise<InvoiceItem[]> => {
    const data = await apiFetch(`/rest/v1/invoice_items?invoice_id=eq.${invoiceId}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        }
    });
    return data.map(mapDbItemToAppItem);
};

export const getInvoiceFile = async (token: string, invoiceId: string): Promise<{ source_file_base_64: string; source_file_mime_type: string; }> => {
    const [data] = await apiFetch(`/rest/v1/invoices?id=eq.${invoiceId}&select=source_file_base_64,source_file_mime_type`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        }
    });
    return data;
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
    await apiFetch(`/rest/v1/invoices?id=eq.${invoiceDbId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
        }
    });
};