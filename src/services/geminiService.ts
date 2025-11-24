
import type { Invoice, Anomaly, KPIResult } from '../types';
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

const prepareInvoicesForAI = (invoices: Invoice[]) => {
     // Sanitize invoices to send only necessary data to save tokens and bandwidth.
    return invoices.map(({ invoiceNumber, vendorName, customerName, invoiceDate, totalAmount, items, paymentStatus }) => 
        ({ invoiceNumber, vendorName, customerName, invoiceDate, totalAmount, items, paymentStatus })
    );
};

export const extractInvoiceDataFromFile = async (fileBase64: string, mimeType: string): Promise<Invoice> => {
  return callProxy({ task: 'extract', fileBase64, mimeType });
};

export const extractInvoiceDataFromText = async (textData: string): Promise<Invoice> => {
    return callProxy({ task: 'extract', textData });
};

export const chatWithInvoices = async (query: string, invoices: Invoice[], language: string): Promise<string> => {
    const relevantData = prepareInvoicesForAI(invoices);
    const response = await callProxy({ task: 'chat', query, invoices: relevantData, language });
    return response.result;
};

export const generateSummary = async (invoices: Invoice[], language: string): Promise<string> => {
    const relevantData = prepareInvoicesForAI(invoices);
    const response = await callProxy({ task: 'summary', invoices: relevantData, language });
    return response.result;
};

export const detectAnomalies = async (invoices: Invoice[], language: string): Promise<Anomaly[]> => {
    const relevantData = prepareInvoicesForAI(invoices);
    const response = await callProxy({ task: 'anomalies', invoices: relevantData, language });
    return response.anomalies;
};

export const generateKPI = async (query: string, invoices: Invoice[], language: string): Promise<KPIResult> => {
    const relevantData = prepareInvoicesForAI(invoices);
    const response = await callProxy({ task: 'kpi', query, invoices: relevantData, language });
    return response;
};