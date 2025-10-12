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

// This is a serverless function, so the API key is securely accessed from environment variables on the server.
// Netlify makes variables set in the UI available via process.env.
const API_KEY = process.env.VITE_API_KEY;

const responseSchema = {
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

const handler: Handler = async (event: HandlerEvent) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    if (!API_KEY) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Gemini service is not configured on the server. VITE_API_KEY is missing." }),
        };
    }

    try {
        const { fileBase64, mimeType } = JSON.parse(event.body || '{}');

        if (!fileBase64 || !mimeType) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing fileBase64 or mimeType in request body.' }),
            };
        }

        const ai = new GoogleGenAI({ apiKey: API_KEY });

        const filePart = {
            inlineData: {
                mimeType: mimeType,
                data: fileBase64,
            },
        };

        const textPart = {
            text: "Extract all key information from this invoice. Provide details for each line item including description, quantity, unit price, and total. Ensure the total amount matches the sum of line items if possible."
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [textPart, filePart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });

        let jsonText = response.text.trim();
        const jsonMatch = jsonText.match(/```(json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[2]) {
            jsonText = jsonMatch[2];
        }
        const parsedJson = JSON.parse(jsonText);

        const sanitizedData: Omit<Invoice, 'id' | 'uploaderEmail' | 'sourceFileBase64' | 'sourceFileMimeType'> = {
            invoiceNumber: parsedJson.invoiceNumber || parsedJson.invoiceId || '',
            vendorName: parsedJson.vendorName || '',
            customerName: parsedJson.customerName || '',
            invoiceDate: parsedJson.invoiceDate || '',
            totalAmount: parsedJson.totalAmount || 0,
            items: Array.isArray(parsedJson.items) ? parsedJson.items.map((item: any) => ({
                description: item.description || '',
                quantity: item.quantity || 0,
                unitPrice: item.unitPrice || 0,
                total: item.total || 0,
            })) : [],
            paymentStatus: 'unpaid',
        };

        if (!sanitizedData.invoiceNumber && !sanitizedData.vendorName && sanitizedData.items.length === 0) {
            throw new Error("Core invoice details (number, vendor, items) could not be extracted.");
        }

        return {
            statusCode: 200,
            body: JSON.stringify(sanitizedData),
            headers: { 'Content-Type': 'application/json' },
        };

    } catch (error: any) {
        console.error("Error in Gemini proxy function:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to parse or validate data from the AI service.", details: error.message }),
        };
    }
};

export { handler };
