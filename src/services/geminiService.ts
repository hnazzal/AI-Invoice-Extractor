import type { Invoice } from '../types';

export const extractInvoiceDataFromFile = async (fileBase64: string, mimeType: string): Promise<Invoice> => {
  try {
    const response = await fetch('/.netlify/functions/gemini-proxy', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileBase64, mimeType }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'An unknown error occurred on the server.' }));
        // Provide a more specific error if the proxy function returns one
        if (errorData.error === 'Gemini service is not configured on the server. VITE_API_KEY is missing.') {
             throw new Error("The AI service is not configured correctly by the administrator.");
        }
        throw new Error(errorData.error || `Server responded with status ${response.status}`);
    }

    const extractedData = await response.json();
    return extractedData as Invoice;

  } catch (error) {
    console.error("Error calling Gemini proxy function:", error);
    // Re-throw a user-friendly error message. The actual error is logged for debugging.
    throw new Error("Failed to communicate with the AI service. Please try again later.");
  }
};
