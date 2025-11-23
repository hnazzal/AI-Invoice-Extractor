import React, { useState, useRef, useEffect } from 'react';
import type { Invoice, Translations, Language } from '../../types';
import * as geminiService from '../../services/geminiService';

interface ChatbotProps {
  invoices: Invoice[];
  translations: Translations;
  language: Language;
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

const Chatbot: React.FC<ChatbotProps> = ({ invoices, translations, language }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: translations.chatWelcome }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestions = [
    { label: translations.suggestionTotalSpend, query: "What is the total amount of all invoices?" },
    { label: translations.suggestionTopVendor, query: "Which vendor have I spent the most with?" },
    { label: translations.suggestionMostPurchased, query: "What is the most frequently purchased item?" },
    { label: translations.suggestionUnpaid, query: "What is the total of unpaid invoices?" },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (queryOverride?: string) => {
    const textToSend = queryOverride || input;
    if (!textToSend.trim()) return;

    // Add user message
    setMessages(prev => [...prev, { role: 'user', text: textToSend }]);
    setInput('');
    setIsTyping(true);

    try {
      const responseText = await geminiService.chatWithInvoices(textToSend, invoices, language);
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error analyzing your data." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const toggleChat = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={toggleChat}
        className={`fixed bottom-6 ${language === 'ar' ? 'left-6' : 'right-6'} z-50 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-indigo-300`}
        aria-label="Open AI Assistant"
      >
        {isOpen ? (
           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        ) : (
           <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div 
            className={`fixed bottom-24 ${language === 'ar' ? 'left-4' : 'right-4'} z-50 w-full max-w-sm md:max-w-md h-[500px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden animate-fade-in-up`}
            dir={language === 'ar' ? 'rtl' : 'ltr'}
        >
          {/* Header */}
          <div className="p-4 bg-indigo-600 text-white flex justify-between items-center">
             <div className="flex items-center gap-2">
                 <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                 </div>
                 <h3 className="font-bold text-lg">{translations.aiAssistant}</h3>
             </div>
             <button onClick={toggleChat} className="text-white/80 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
          </div>

          {/* Messages Area */}
          <div className="flex-grow p-4 overflow-y-auto bg-slate-50 dark:bg-slate-800 space-y-4">
             {messages.map((msg, idx) => (
               <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                      msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-br-none' 
                      : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-sm border border-slate-100 dark:border-slate-600 rounded-bl-none'
                  }`}>
                    {msg.text}
                  </div>
               </div>
             ))}
             {isTyping && (
                 <div className="flex justify-start">
                     <div className="bg-white dark:bg-slate-700 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm border border-slate-100 dark:border-slate-600">
                        <div className="flex gap-1">
                            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></span>
                        </div>
                     </div>
                 </div>
             )}
             <div ref={messagesEndRef} />
          </div>
          
          {/* Suggestions */}
          {messages.length === 1 && (
              <div className="px-4 pb-2 bg-slate-50 dark:bg-slate-800">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 px-1">{translations.suggestionTitle}</p>
                  <div className="flex flex-wrap gap-2">
                      {suggestions.map((s, i) => (
                          <button 
                            key={i} 
                            onClick={() => handleSend(s.query)}
                            className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-full border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                          >
                              {s.label}
                          </button>
                      ))}
                  </div>
              </div>
          )}

          {/* Input Area */}
          <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex items-center gap-2"
              >
                  <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={translations.chatPlaceholder}
                    className="flex-grow bg-slate-100 dark:bg-slate-800 border-0 rounded-full px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white placeholder:text-slate-400"
                  />
                  <button 
                    type="submit"
                    disabled={!input.trim() || isTyping}
                    className="p-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 rtl:rotate-180" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                     </svg>
                  </button>
              </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;
