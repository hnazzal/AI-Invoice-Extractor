import type { Invoice } from '../types';
import { isAiConfigured } from '../config';

// Export a flag to check if the service is properly configured.
export const isConfigured = isAiConfigured;

const callProxy = async (body: object) => {
    if (!isAiConfigured) {
        throw new Error("Gemini service is not configured. Check VITE_API_KEY environment variable.");
    }
    try {
        const response = await fetch('/.netlify/functions/gemini-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'An unknown server error occurred.' }));
            throw new Error(errorData.details || errorData.error || `Server responded with status: ${response.status}`);
        }
        return response.json();
    } catch (error: any) {
        console.error("Error calling Gemini proxy function:", error);
        throw new Error(error.message || "Failed to communicate with the AI service.");
    }
};

export const extractInvoiceDataFromFile = async (fileBase64: string, mimeType: string): Promise<Invoice> => {
  return callProxy({ task: 'extract', fileBase64, mimeType });
};

export const calculateKpiFromInvoices = async (query: string, invoices: Invoice[]): Promise<{ result: string }> => {
    // Sanitize invoices to send only necessary data
    const relevantData = invoices.map(({ invoiceNumber, vendorName, customerName, invoiceDate, totalAmount, items, paymentStatus }) => 
        ({ invoiceNumber, vendorName, customerName, invoiceDate, totalAmount, items, paymentStatus })
    );
    return callProxy({ task: 'calculate', query, invoices: relevantData });
};
