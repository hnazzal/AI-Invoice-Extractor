import { GoogleGenAI } from "@google/genai";
import type { Handler, HandlerEvent } from "@netlify/functions";

const API_KEY = process.env.VITE_API_KEY;

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
        const { prompt, invoicesJson } = JSON.parse(event.body || '{}');

        if (!prompt) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing prompt in request body.' }),
            };
        }

        const ai = new GoogleGenAI({ apiKey: API_KEY });
        
        const systemInstruction = `You are a helpful AI assistant for managing invoices. The user will provide you with a list of their invoices in a summarized JSON format, followed by a question.
        - Answer the question based *only* on the provided invoice data.
        - Be concise and friendly in your response.
        - If the question cannot be answered from the data, state that clearly and politely.
        - Do not invent information.
        - All monetary values are in the user's local currency. Do not add currency symbols.
        - Perform calculations if asked (e.g., total amount of unpaid invoices).
        - Today's date is ${new Date().toISOString().slice(0, 10)}.`;

        const fullPrompt = `Here is the current list of invoices:
${invoicesJson}

---

My question is: ${prompt}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: fullPrompt,
            config: {
                systemInstruction: systemInstruction,
            },
        });
        
        const responseText = response.text;

        return {
            statusCode: 200,
            body: JSON.stringify({ response: responseText }),
            headers: { 'Content-Type': 'application/json' },
        };

    } catch (error: any) {
        console.error("Error in Gemini chat function:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to get response from AI service.", details: error.message }),
        };
    }
};

export { handler };