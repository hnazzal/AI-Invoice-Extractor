import { GoogleGenAI, Chat } from "@google/genai";
import React, { useState, useEffect, useRef, FormEvent } from 'react';
import type { Invoice, Translations, Currency, Language } from '../../types';
import { config } from '../../config';
import Spinner from './Spinner';

interface ChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: Invoice[];
  translations: Translations;
  currency: Currency;
  lang: Language;
}

interface Message {
  role: 'user' | 'model';
  content: string;
}

const Chatbot: React.FC<ChatbotProps> = ({ isOpen, onClose, invoices, translations, currency, lang }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isVisible = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    if (isOpen && !isVisible.current) {
        isVisible.current = true; // Mark as visible to prevent re-initialization
        setIsLoading(true);
        try {
            const ai = new GoogleGenAI({ apiKey: config.apiKey! });
            
            const currentDate = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
            const invoiceDataString = invoices.length > 0 ? JSON.stringify(invoices, null, 2) : "No invoices to display.";

            const systemPrompt = `You are an intelligent invoice assistant integrated into an application. Your purpose is to help users understand their invoice data by answering their questions. You will be provided with a list of the user's invoices in JSON format. You MUST base your answers strictly on this data. Do not invent or assume any information not present in the provided JSON. When asked for totals or summaries, calculate them accurately from the data. If a question cannot be answered using the provided data, state that clearly and politely. For example, say "I can only answer questions about the invoice data I have." Keep your answers concise and clear. The user's currency is ${currency}. Make sure to mention the currency in your answers when talking about money. Today's date is ${currentDate}. Use this for any time-related questions like "this month". Here is the user's current invoice data: ${invoiceDataString}`;
            
            chatRef.current = ai.chats.create({
                model: 'gemini-2.5-flash',
                history: [
                    { role: 'user', parts: [{ text: systemPrompt }] },
                    { role: 'model', parts: [{ text: translations.chatWelcome }] }
                ]
            });

            setMessages([{ role: 'model', content: translations.chatWelcome }]);
        } catch (error) {
            console.error("Failed to initialize chatbot:", error);
            setMessages([{ role: 'model', content: "Sorry, I couldn't start up correctly. Please check the console for errors." }]);
        } finally {
            setIsLoading(false);
        }
    } else if (!isOpen) {
        // Reset when closed
        isVisible.current = false;
        chatRef.current = null;
        setMessages([]);
    }
  }, [isOpen, invoices, translations, currency]);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    const userMessage = inputValue.trim();
    if (!userMessage || isLoading || !chatRef.current) return;

    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInputValue('');
    setIsLoading(true);

    try {
        const response = await chatRef.current.sendMessage({ message: userMessage });
        const modelResponse = response.text;
        setMessages(prev => [...prev, { role: 'model', content: modelResponse }]);
    } catch (error) {
        console.error("Chatbot error:", error);
        setMessages(prev => [...prev, { role: 'model', content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
        setIsLoading(false);
    }
  };

  const renderContent = (content: string) => {
    // Basic markdown for newlines
    return content.split('\n').map((line, index) => (
        <React.Fragment key={index}>
            {line}
            <br />
        </React.Fragment>
    ));
  };

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/30 dark:bg-black/60 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden={!isOpen}
      ></div>
      <div
        className={`fixed top-0 bottom-0 ${lang === 'ar' ? 'left-0' : 'right-0'} w-full max-w-md bg-white dark:bg-slate-900/95 backdrop-blur-lg border-s border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out z-50 ${isOpen ? 'translate-x-0' : (lang === 'ar' ? '-translate-x-full' : 'translate-x-full')}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="chatbot-title"
      >
        <header className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <h2 id="chatbot-title" className="text-lg font-bold text-slate-800 dark:text-slate-100">{translations.aiAssistant}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
            aria-label={translations.close}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>

        <div className="flex-grow p-4 overflow-y-auto space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs md:max-w-sm lg:max-w-md px-4 py-2 rounded-2xl ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-lg' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-lg'}`}>
                <p className="text-sm">{renderContent(msg.content)}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
               <div className="px-4 py-2 rounded-2xl bg-slate-200 dark:bg-slate-700 rounded-bl-lg">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                </div>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex-shrink-0 bg-white dark:bg-slate-900">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={translations.typeYourMessage}
              className="flex-grow w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed"
              disabled={isLoading || !inputValue.trim()}
              aria-label={translations.send}
            >
              {isLoading ? <Spinner /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.428A1 1 0 009.05 16.43l-2.072-5.889a.5.5 0 01.932-.328l2.978 8.455a1 1 0 001.788 0l7-14a1 1 0 00-1.169-1.409l-5 1.428A1 1 0 0010.95 3.57l2.072 5.889a.5.5 0 01-.932.328l-2.978-8.455z" /></svg>}
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default Chatbot;