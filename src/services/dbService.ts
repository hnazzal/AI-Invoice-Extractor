
import type { User, Invoice, InvoiceItem, UserProfile } from '../types';
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

export const signUpUser = async (email: string, password: string, companyName?: string): Promise<any> => {
    return apiFetch('/auth/v1/signup', {
        method: 'POST',
        body: JSON.stringify({ 
            email, 
            password,
            data: { company_name: companyName } // Store company name in user metadata
        }),
    });
};

export const loginUser = async (email: string, password: string): Promise<User> => {
    const response = await apiFetch('/auth/v1/token?grant_type=password', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });

    // Initialize user with a default 'user' role to ensure stability even if profile fetch fails
    const user: User = {
        id: response.user.id,
        email: response.user.email,
        token: response.access_token,
        companyName: response.user.user_metadata?.company_name, // Retrieve company name
        role: 'user', // Default role
    };

    // Fetch Role from profiles table
    try {
        const profileData = await apiFetch(`/rest/v1/profiles?id=eq.${user.id}&select=role`, {
            headers: { 'Authorization': `Bearer ${user.token}` }
        });
        
        // Only update role if we successfully got a record
        if (Array.isArray(profileData) && profileData.length > 0) {
            user.role = profileData[0].role;
        } else {
            console.warn(`No profile found for user ${user.email}. Defaulting to 'user' role. This is expected for legacy users.`);
        }
    } catch (e) {
        console.warn("Could not fetch user role (table might be missing or RLS blocking), defaulting to user.", e);
        // user.role remains 'user' as set initially
    }

    return user;
};

// --- Admin Functions ---

export const getAllProfiles = async (token: string): Promise<UserProfile[]> => {
    // Fetch profiles. RLS should allow admins to see all.
    return apiFetch('/rest/v1/profiles?select=*', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
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
  userId: dbInvoice.user_id, // Map the database user_id to frontend userId
  invoiceNumber: dbInvoice.invoice_number,
  vendorName: dbInvoice.vendor_name,
  customerName: dbInvoice.customer_name,
  invoiceDate: dbInvoice.invoice_date,
  totalAmount: dbInvoice.total_amount,
  paymentStatus: dbInvoice.status || 'unpaid',
  items: dbInvoice.invoice_items ? dbInvoice.invoice_items.map(mapDbItemToAppItem) : [],
  sourceFileBase64: dbInvoice.file_base_64,
  sourceFileMimeType: dbInvoice.file_mime_type,
  processingCost: dbInvoice.processing_cost || 0,
});


export const getInvoicesForUser = async (token: string): Promise<Invoice[]> => {
    // REMOVED: profiles(email,company_name) join which was causing the crash.
    // If Admin, this returns ALL due to RLS.
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

    // Step 1: Insert the main invoice record WITHOUT the large file data.
    const masterInvoicePayload = {
        id: newInvoiceId,
        user_id: user.id,
        invoice_number: invoice.invoiceNumber,
        vendor_name: invoice.vendorName,
        customer_name: invoice.customerName,
        invoice_date: normalizeDate(invoice.invoiceDate),
        total_amount: invoice.totalAmount,
        status: invoice.paymentStatus || 'unpaid',
        processing_cost: invoice.processingCost || 0, // Store cost
    };

    await apiFetch('/rest/v1/invoices', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${user.token}`,
            'Prefer': 'return=minimal'
        },
        body: JSON.stringify(masterInvoicePayload),
    });

    // Step 2: Bulk insert the invoice items using the same client-generated ID.
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
    
    // Step 3: If a file exists, UPDATE the newly created record with the file data.
    if (invoice.sourceFileBase64 && invoice.sourceFileMimeType) {
        await apiFetch(`/rest/v1/invoices?id=eq.${newInvoiceId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${user.token}`,
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ 
                file_base_64: invoice.sourceFileBase64,
                file_mime_type: invoice.sourceFileMimeType,
            }),
        });
    }

    // Return the saved invoice data to update the UI.
    return {
        ...invoice,
        id: newInvoiceId,
        userId: user.id,
        uploaderEmail: user.email,
        uploaderCompany: user.companyName,
    };
};

export const updateInvoicePaymentStatus = async (token: string, invoiceId: string, newStatus: 'paid' | 'unpaid'): Promise<void> => {
    // By using 'return=minimal', we only perform the update and don't ask for the
    // updated record back. This avoids potential schema cache errors.
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

export const deleteMultipleInvoicesForUser = async (token: string, invoiceDbIds: string[]): Promise<void> => {
    if (invoiceDbIds.length === 0) return;
    
    // Supabase allows using the `in` operator for bulk deletes.
    await apiFetch(`/rest/v1/invoices?id=in.(${invoiceDbIds.join(',')})`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
        }
    });
};
