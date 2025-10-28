import React, { useState, useEffect } from 'react';
import type { Translations } from '../../types';

interface ProcessingLoaderProps {
  translations: Translations;
}

const processingMessages = [
  'analyzingLayout',
  'extractingText',
  'identifyingLineItems',
  'verifyingTotals',
  'almostDone',
];

const ProcessingLoader: React.FC<ProcessingLoaderProps> = ({ translations }) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((prevIndex) => (prevIndex + 1) % processingMessages.length);
    }, 2500); // Change message every 2.5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-12 bg-white/50 dark:bg-gray-800/30 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 min-h-[300px]">
      <style>{`
        .scanner-light {
          animation: scan 3s ease-in-out infinite;
        }
        @keyframes scan {
          0%, 100% { top: -10%; }
          50% { top: 100%; }
        }
      `}</style>
      <div className="relative w-24 h-32 bg-slate-200/50 dark:bg-slate-700/50 rounded-lg border-2 border-slate-300 dark:border-slate-600 overflow-hidden">
        <svg xmlns="http://www.w3.org/2000/svg" className="absolute top-3 left-3 h-6 w-6 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        <div className="absolute top-1/2 left-3 w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
        <div className="absolute top-1/2 mt-3 left-3 w-14 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
        <div className="absolute top-1/2 mt-6 left-3 w-12 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
        <div className="scanner-light absolute left-0 w-full h-2 bg-indigo-400/50 dark:bg-sky-400/50 filter blur-sm"></div>
      </div>
      <h3 className="mt-6 text-xl font-bold text-slate-800 dark:text-slate-100">{translations.processing}</h3>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 text-center transition-opacity duration-500">
        {translations[processingMessages[currentMessageIndex]]}
      </p>
    </div>
  );
};

export default ProcessingLoader;