import { GoogleGenAI, Type } from "@google/genai";
import type { Handler, HandlerEvent } from "@netlify/functions";

// Duplicated types to avoid complex relative imports in serverless environment
interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}
interface Invoice {
  id?: string;
  invoiceNumber: string;
  vendorName: string;
  customerName: string;
  invoiceDate: string;
  totalAmount: number;
  items: InvoiceItem[];
  uploaderEmail?: string;
  paymentStatus: 'paid' | 'unpaid';
  sourceFileBase64?: string;
  sourceFileMimeType?: string;
}

const API_KEY = process.env.VITE_API_KEY;

// --- Schemas for different AI tasks ---
const extractSchema = {
  type: Type.OBJECT,
  properties: {
    invoiceNumber: { type: Type.STRING, description: "The invoice identification number." },
    vendorName: { type: Type.STRING, description: "The name of the company that issued the invoice." },
    customerName: { type: Type.STRING, description: "The name of the customer." },
    invoiceDate: { type: Type.STRING, description: "The date the invoice was issued (YYYY-MM-DD)." },
    totalAmount: { type: Type.NUMBER, description: "The total amount due." },
    items: {
      type: Type.ARRAY,
      description: "List of items or services in the invoice.",
      items: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING, description: "Description of the item or service." },
          quantity: { type: Type.NUMBER, description: "Quantity of the item." },
          unitPrice: { type: Type.NUMBER, description: "Price per unit of the item." },
          total: { type: Type.NUMBER, description: "Total price for this line item." },
        },
        required: ["description", "quantity", "unitPrice", "total"]
      }
    }
  },
  required: ["invoiceNumber", "vendorName", "customerName", "invoiceDate", "totalAmount", "items"]
};

const calculateSchema = {
    type: Type.OBJECT,
    properties: {
        result: { type: Type.STRING, description: "The calculated result of the KPI, as a single-value string (e.g., a number, a sentence, or a name). Be concise." }
    },
    required: ["result"]
};

// --- Handlers for different AI tasks ---

/**
 * Safely parses a value into a float, handling numbers, strings with commas, and invalid inputs.
 * @param value The value to parse.
 * @returns The parsed number, or 0 if parsing fails.
 */
const safeParseFloat = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return 0;
    // Remove commas and other non-numeric characters except for the decimal point
    const cleanedValue = value.replace(/[^0-9.-]+/g, '');
    const num = parseFloat(cleanedValue);
    return isNaN(num) ? 0 : num;
};


const handleExtract = async (ai: GoogleGenAI, body: any) => {
    const { fileBase64, mimeType } = body;
    if (!fileBase64 || !mimeType) throw new Error('Missing fileBase64 or mimeType for extract task.');

    const filePart = { inlineData: { mimeType, data: fileBase64 } };
    const textPart = { text: "Extract all key information from this invoice. Provide details for each line item including description, quantity, unit price, and total. Ensure the total amount matches the sum of line items if possible." };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [textPart, filePart] },
        config: { responseMimeType: "application/json", responseSchema: extractSchema },
    });

    const parsedJson = JSON.parse(response.text.trim());
    const sanitizedData: Omit<Invoice, 'id' | 'uploaderEmail'> = {
        invoiceNumber: parsedJson.invoiceNumber || parsedJson.invoiceId || '', 
        vendorName: parsedJson.vendorName || '',
        customerName: parsedJson.customerName || '', 
        invoiceDate: parsedJson.invoiceDate || '',
        totalAmount: safeParseFloat(parsedJson.totalAmount),
        items: Array.isArray(parsedJson.items) ? parsedJson.items.map((item: any) => ({
            description: item.description || '', 
            quantity: safeParseFloat(item.quantity),
            unitPrice: safeParseFloat(item.unitPrice), 
            total: safeParseFloat(item.total),
        })) : [],
        paymentStatus: 'unpaid', 
        sourceFileBase64: fileBase64, 
        sourceFileMimeType: mimeType,
    };
    if (!sanitizedData.invoiceNumber && !sanitizedData.vendorName && sanitizedData.items.length === 0) {
        throw new Error("Core invoice details (number, vendor, items) could not be extracted.");
    }
    return sanitizedData;
};

const handleCalculate = async (ai: GoogleGenAI, body: any) => {
    const { query, invoices } = body;
    if (!query || !invoices) throw new Error('Missing query or invoices for calculate task.');

    const prompt = `Given the following JSON data of invoices, answer this question: "${query}".\n\nProvide a direct, concise answer.\n\nData: ${JSON.stringify(invoices, null, 2)}`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }] },
        config: { responseMimeType: "application/json", responseSchema: calculateSchema },
    });
    return JSON.parse(response.text.trim());
};


const handler: Handler = async (event: HandlerEvent) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }
    if (!API_KEY) {
        return { statusCode: 500, body: JSON.stringify({ error: "Gemini service is not configured on the server. VITE_API_KEY is missing." }) };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const { task } = body;
        
        const ai = new GoogleGenAI({ apiKey: API_KEY });

        let responseData;
        switch (task) {
            case 'extract':
                responseData = await handleExtract(ai, body);
                break;
            case 'calculate':
                responseData = await handleCalculate(ai, body);
                break;
            default:
                return { statusCode: 400, body: JSON.stringify({ error: 'Invalid task specified.' }) };
        }
        
        return {
            statusCode: 200,
            body: JSON.stringify(responseData),
            headers: { 'Content-Type': 'application/json' },
        };
        
    } catch (error: any) {
        console.error("Error in Gemini proxy function:", error);
        // Sanitize error message to avoid exposing sensitive details
        const message = error.message?.includes("Core invoice details") 
            ? error.message 
            : "Failed to process the request with the AI service.";
        return { statusCode: 500, body: JSON.stringify({ error: message, details: error.message })};
    }
};

export { handler };