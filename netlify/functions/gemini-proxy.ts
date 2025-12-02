

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
  processingCost?: number;
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

const anomalySchema = {
    type: Type.OBJECT,
    properties: {
        anomalies: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    invoiceNumber: { type: Type.STRING },
                    issue: { type: Type.STRING, description: "Description of the anomaly (e.g., Duplicate, Unusually High Amount)" },
                    severity: { type: Type.STRING, enum: ["high", "medium", "low"] }
                },
                required: ["invoiceNumber", "issue", "severity"]
            }
        }
    },
    required: ["anomalies"]
};

const kpiSchema = {
    type: Type.OBJECT,
    properties: {
        label: { type: Type.STRING, description: "Short label for the KPI (e.g., 'Total Coffee Spend')" },
        value: { type: Type.STRING, description: "The calculated value (e.g., '150.00 JOD')" }
    },
    required: ["label", "value"]
};


// --- Helpers ---

/**
 * Safely parses a value into a float, handling numbers, strings with commas, and invalid inputs.
 */
const safeParseFloat = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return 0;
    // Remove commas and other non-numeric characters except for the decimal point
    const cleanedValue = value.replace(/[^0-9.-]+/g, '');
    const num = parseFloat(cleanedValue);
    return isNaN(num) ? 0 : num;
};

/**
 * Cleans a string to ensure it is valid JSON, stripping Markdown code blocks if present.
 */
const cleanJsonString = (str: string | undefined): string => {
    if (!str) return "{}";
    let cleaned = str.trim();
    // Remove markdown code blocks (e.g. ```json ... ```)
    if (cleaned.startsWith("```json")) {
        cleaned = cleaned.replace(/^```json/, "").replace(/```$/, "");
    } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```/, "").replace(/```$/, "");
    }
    return cleaned.trim();
};

// --- Handlers for different AI tasks ---

const handleExtract = async (ai: GoogleGenAI, body: any) => {
    const { fileBase64, mimeType, textData } = body;
    
    let parts;

    if (textData) {
        // Case 1: Extracted text from Word/Excel
        parts = [{ text: `Extract structured invoice data from the following text content. \n\nTEXT CONTENT:\n${textData}` }];
    } else if (fileBase64 && mimeType) {
        // Case 2: Image or PDF file
        const filePart = { inlineData: { mimeType, data: fileBase64 } };
        const textPart = { text: "Extract all key information from this invoice. Provide details for each line item including description, quantity, unit price, and total. Ensure the total amount matches the sum of line items if possible." };
        parts = [filePart, textPart];
    } else {
        throw new Error('Missing file data or text data for extraction.');
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts },
        config: { responseMimeType: "application/json", responseSchema: extractSchema },
    });

    const responseText = response.text;
    
    if (!responseText) {
        throw new Error("The AI model could not process this invoice. It might be flagged by safety filters or contains no readable data.");
    }
    
    // Calculate Estimated Cost
    // Based on public pricing for Gemini 1.5 Flash (often similar to 2.5 Flash Preview pricing tiers)
    // Input: ~$0.075 per 1 million tokens
    // Output: ~$0.30 per 1 million tokens
    let processingCost = 0;
    if (response.usageMetadata) {
        const inputTokens = response.usageMetadata.promptTokenCount || 0;
        const outputTokens = response.usageMetadata.candidatesTokenCount || 0;
        const inputCost = (inputTokens / 1000000) * 0.075;
        const outputCost = (outputTokens / 1000000) * 0.30;
        processingCost = inputCost + outputCost;
    }

    const cleanedText = cleanJsonString(responseText);
    let parsedJson;
    
    try {
        parsedJson = JSON.parse(cleanedText);
    } catch (error) {
        console.error("JSON Parse Error on text:", responseText);
        throw new Error("The AI extracted data but the format was invalid.");
    }

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
        sourceFileBase64: fileBase64 || '', 
        sourceFileMimeType: mimeType || 'text/plain',
        processingCost: processingCost,
    };

    if (!sanitizedData.invoiceNumber && !sanitizedData.vendorName && sanitizedData.items.length === 0) {
        throw new Error("The AI processed the input but couldn't find sufficient invoice details.");
    }
    
    return sanitizedData;
};

const handleChat = async (ai: GoogleGenAI, body: any) => {
    const { query, invoices, language } = body;
    if (!query || !invoices) throw new Error('Missing query or invoices for chat task.');

    const contextData = JSON.stringify(invoices);
    const langInstruction = language === 'ar' ? "Answer in Arabic." : "Answer in English.";

    const prompt = `
    You are a helpful data analyst assistant for an invoice management app.
    ${langInstruction}
    
    Here is the dataset of invoices:
    ${contextData}

    User Question: "${query}"

    Instructions:
    1. Analyze the provided invoice data to answer the user's question accurately.
    2. If the user asks for "most purchased item", look at the 'items' array in all invoices and sum up quantities or frequencies.
    3. If the user asks for "top vendor", sum up the 'totalAmount' per 'vendorName'.
    4. Provide the answer in a friendly, conversational tone.
    5. If the data needed to answer is missing, politeley say you don't have that information.
    6. Format numbers clearly (e.g., currency).
    7. Keep the response concise but informative.
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }] },
    });

    return { result: response.text };
};

const handleSummary = async (ai: GoogleGenAI, body: any) => {
    const { invoices, language } = body;
    const langInstruction = language === 'ar' ? "Write the summary in Arabic." : "Write the summary in English.";
    
    const prompt = `
    Analyze this list of invoices and provide a concise executive summary.
    ${langInstruction}
    
    Invoices: ${JSON.stringify(invoices)}
    
    Focus on:
    1. Total spend.
    2. Major spending categories or vendors.
    3. Any recent trends (e.g., spending increasing).
    4. Keep it under 100 words.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }] },
    });
    return { result: response.text };
};

const handleAnomalies = async (ai: GoogleGenAI, body: any) => {
    const { invoices, language } = body;
     const langInstruction = language === 'ar' ? "Describe issues in Arabic." : "Describe issues in English.";

    const prompt = `
    Detect anomalies in this invoice dataset.
    ${langInstruction}
    
    Invoices: ${JSON.stringify(invoices)}
    
    Look for:
    1. Duplicate invoice numbers.
    2. Duplicate amounts for the same vendor on the same day.
    3. Unusually high amounts compared to the average.
    4. Missing critical fields (like Invoice Number).
    
    Return a list of anomalies found. If none, return an empty array.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }] },
        config: { responseMimeType: "application/json", responseSchema: anomalySchema },
    });
    
    const cleanedText = cleanJsonString(response.text);
    return JSON.parse(cleanedText); // Returns { anomalies: [...] }
};

const handleKPI = async (ai: GoogleGenAI, body: any) => {
    const { query, invoices, language } = body;
    const langInstruction = language === 'ar' ? "Label in Arabic." : "Label in English.";
    
    const prompt = `
    Calculate a specific KPI based on the user request.
    ${langInstruction}
    
    Invoices: ${JSON.stringify(invoices)}
    Request: "${query}"
    
    Return a JSON object with a short 'label' and the calculated 'value'.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }] },
         config: { responseMimeType: "application/json", responseSchema: kpiSchema },
    });
    
    const cleanedText = cleanJsonString(response.text);
    return JSON.parse(cleanedText); // Returns { label: "...", value: "..." }
};


const handler: Handler = async (event: HandlerEvent) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }
    if (!API_KEY) {
        return { statusCode: 500, body: JSON.stringify({ error: "Server Configuration Error: VITE_API_KEY is missing." }) };
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
            case 'chat':
                responseData = await handleChat(ai, body);
                break;
            case 'summary':
                responseData = await handleSummary(ai, body);
                break;
            case 'anomalies':
                responseData = await handleAnomalies(ai, body);
                break;
            case 'kpi':
                responseData = await handleKPI(ai, body);
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
        
        let clientMessage = error.message || "An unexpected error occurred during processing.";

        if (typeof clientMessage === 'string') {
             if (clientMessage.includes("API key was reported as leaked") || clientMessage.includes("PERMISSION_DENIED")) {
                 clientMessage = "Service Error: The API Key has been disabled by Google due to security reasons. Please update the app configuration with a new key.";
             } else if (clientMessage.includes("429") || clientMessage.includes("Too Many Requests") || clientMessage.includes("RESOURCE_EXHAUSTED")) {
                 clientMessage = "The AI service is currently busy (Quota Exceeded). Please try again in a minute.";
             } else if (clientMessage.includes("Safety") || clientMessage.includes("blocked")) {
                 clientMessage = "The document was flagged by safety filters and could not be processed. Please try a different file.";
             }
        }

        return { 
            statusCode: 500, 
            body: JSON.stringify({ 
                error: clientMessage
            })
        };
    }
};

export { handler };