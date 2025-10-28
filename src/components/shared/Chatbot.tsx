import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import type { Translations } from '../../types';
import { config } from '../../config';
import Spinner from './Spinner';

interface ChatBotProps {
  onClose: () => void;
  translations: Translations;
}

const ChatBot: React.FC<ChatBotProps> = ({ onClose, translations }) => {
    const [chat, setChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!config.apiKey) {
            console.error("AI Chatbot is not configured. VITE_API_KEY is missing.");
            return;
        }
        const ai = new GoogleGenAI({ apiKey: config.apiKey });
        const chatSession = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: 'You are a friendly and helpful assistant for an invoice management application. Answer user questions concisely and clearly.',
            },
        });
        setChat(chatSession);
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !chat || isLoading) return;

        const userMessage = { role: 'user' as const, text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const result = await chat.sendMessage({ message: userMessage.text });
            const modelMessage = { role: 'model' as const, text: result.text };
            setMessages(prev => [...prev, modelMessage]);
        } catch (error) {
            console.error("Chatbot error:", error);
            const errorMessage = { role: 'model' as const, text: "Sorry, I encountered an error. Please try again." };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-24 end-8 z-50 w-full max-w-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col h-[60vh] opacity-0 animate-fade-in-up border border-slate-200 dark:border-slate-700">
                <header className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{translations.chatWithAI}</h3>
                    <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">&times;</button>
                </header>
                
                <main className="flex-grow p-4 space-y-4 overflow-y-auto">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'}`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                             <div className="px-4 py-2 rounded-2xl bg-slate-200 dark:bg-slate-700">
                                <div className="animate-pulse flex space-x-2">
                                    <div className="rounded-full bg-slate-400 dark:bg-slate-500 h-2 w-2"></div>
                                    <div className="rounded-full bg-slate-400 dark:bg-slate-500 h-2 w-2"></div>
                                    <div className="rounded-full bg-slate-400 dark:bg-slate-500 h-2 w-2"></div>
                                </div>
                             </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </main>

                <footer className="p-4 border-t border-slate-200 dark:border-slate-700">
                    <form onSubmit={handleSend} className="flex items-center gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={translations.typeYourMessage}
                            className="flex-grow px-4 py-2 bg-slate-100 dark:bg-gray-900 border border-slate-300 dark:border-slate-600 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            disabled={!chat || isLoading}
                        />
                        <button type="submit" className="w-10 h-10 flex-shrink-0 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-700 disabled:bg-indigo-400" disabled={!chat || isLoading}>
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                             <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                           </svg>
                        </button>
                    </form>
                </footer>
            </div>
        </div>
    );
};

export default ChatBot;