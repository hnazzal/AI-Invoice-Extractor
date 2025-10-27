import type { Invoice } from '../types';
import { isAiConfigured } from '../config';

// Export a flag to check if the service is properly configured.
export const isConfigured = isAiConfigured;

export const extractInvoiceDataFromFile = async (fileBase64: string, mimeType: string): Promise<Invoice> => {
  if (!isConfigured) {
    throw new Error("Gemini service is not configured. Check VITE_API_KEY environment variable.");
  }

  try {
    // Netlify functions are available under this path.
    const response = await fetch('/.netlify/functions/gemini-proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileBase64, mimeType }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'An unknown server error occurred.' }));
        // Use the detailed error message from the proxy if available.
        throw new Error(errorData.details || errorData.error || `Server responded with status: ${response.status}`);
    }

    // The proxy now returns a complete invoice object (sans id/uploader), so we can cast it directly.
    const extractedData: Invoice = await response.json();
    
    return extractedData;

  } catch (error: any) {
    console.error("Error calling Gemini proxy function:", error);
    // Re-throw the original error message, which should be informative.
    throw new Error(error.message || "Failed to extract data. Please check the file and try again.");
  }
};
