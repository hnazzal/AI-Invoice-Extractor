import React from 'react';
import type { Translations } from '../../types';

interface ScannerInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: () => void;
  translations: Translations;
}

const ScannerInstructionsModal: React.FC<ScannerInstructionsModalProps> = ({ isOpen, onClose, onUpload, translations }) => {
  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center p-4" 
        onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="scanner-instructions-title"
    >
      <div 
        className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-lg shadow-xl w-full max-w-2xl flex flex-col" 
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200/50 dark:border-slate-700/50 flex justify-between items-center flex-shrink-0">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white" id="scanner-instructions-title">
            {translations.scannerInstructionsTitle}
          </h3>
          <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="p-8 flex-grow overflow-y-auto space-y-6">
            <div className="flex items-center justify-center">
                <div className="w-24 h-24 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-indigo-600 dark:text-indigo-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12m-7.5-3.75v3.75m-3.75-3.75v3.75m-3.75-3.75h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v7.5A2.25 2.25 0 004.5 16.5z" />
                    </svg>
                </div>
            </div>
            <ol className="list-decimal list-inside space-y-3 text-slate-700 dark:text-slate-300">
                <li>{translations.scannerStep1}</li>
                <li>{translations.scannerStep2}</li>
                <li>{translations.scannerStep3}</li>
                <li>{translations.scannerStep4}</li>
            </ol>
        </div>

        <div className="px-6 py-4 border-t border-slate-200/50 dark:border-slate-700/50 flex-shrink-0">
          <div className="flex justify-end gap-3">
            <button
                type="button"
                className="px-4 py-2 rounded-lg text-slate-700 dark:text-slate-200 font-medium bg-white/50 hover:bg-white/80 dark:bg-slate-800/50 dark:hover:bg-slate-700/50 transition-colors"
                onClick={onClose}
              >
                {translations.cancel}
            </button>
            <button
                type="button"
                className="flex justify-center items-center gap-2 px-4 py-2 rounded-lg font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-700 hover:to-blue-600 transition-all shadow-md"
                onClick={onUpload}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                {translations.uploadScannedFile}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScannerInstructionsModal;
