import React from 'react';
import type { Invoice, Translations, Currency, Language } from '../../types';

interface InvoiceGridProps {
  invoices: Invoice[];
  translations: Translations;
  currency: Currency;
  language: Language;
  onInvoiceDoubleClick: (invoice: Invoice) => void;
  onDeleteClick: (invoiceDbId: string) => void;
  onViewClick: (invoice: Invoice) => void;
  onTogglePaymentStatus: (invoiceId: string) => void;
}

const InvoiceGrid: React.FC<InvoiceGridProps> = ({ invoices, translations, currency, language, onInvoiceDoubleClick, onDeleteClick, onViewClick, onTogglePaymentStatus }) => {
  
  const formatCurrency = (amount: number) => {
      const locale = language === 'ar' ? 'ar-JO' : 'en-US';
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {invoices.map(invoice => {
        const isPaid = invoice.paymentStatus === 'paid';
        const statusBorderClass = isPaid ? 'border-green-500' : 'border-red-500';
        const statusTextClass = isPaid 
            ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' 
            : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
        
        return (
            <div 
                key={invoice.id} 
                onClick={() => onInvoiceDoubleClick(invoice)} 
                className={`flex flex-col bg-white dark:bg-gray-800/50 rounded-xl shadow-md overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-t-4 ${statusBorderClass}`}
            >
                <div className="p-4 flex-grow">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{translations.invoiceNumber}</p>
                            <p className="font-bold text-lg text-slate-800 dark:text-slate-100 truncate">{invoice.invoiceNumber}</p>
                        </div>
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusTextClass}`}>
                            {translations[invoice.paymentStatus]}
                        </span>
                    </div>

                    <div className="mt-4">
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{translations.vendorName}</p>
                        <p className="font-semibold text-slate-700 dark:text-slate-200 truncate">{invoice.vendorName}</p>
                    </div>

                    <div className="mt-4">
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{translations.invoiceDate}</p>
                        <p className="font-semibold text-slate-700 dark:text-slate-200">{invoice.invoiceDate}</p>
                    </div>
                </div>

                <div className="p-4 bg-slate-50/50 dark:bg-gray-900/40">
                    <div className="flex justify-between items-center">
                        <div className="text-sm font-bold text-slate-600 dark:text-slate-300">{translations.totalAmount}</div>
                        <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(invoice.totalAmount)}</div>
                    </div>
                </div>

                <div className="p-2 bg-slate-100/50 dark:bg-gray-900/50 flex justify-end items-center gap-1">
                    {invoice.paymentStatus === 'unpaid' && invoice.id && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onTogglePaymentStatus(invoice.id!); }}
                            className="text-slate-500 hover:text-green-600 dark:text-slate-400 dark:hover:text-green-400 p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700" 
                            title={translations.markAsPaid}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        </button>
                    )}
                    <button 
                        onClick={(e) => { e.stopPropagation(); onViewClick(invoice); }} 
                        disabled={!invoice.sourceFileBase64}
                        className="text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 disabled:text-slate-300 dark:disabled:text-slate-600 disabled:cursor-not-allowed disabled:hover:bg-transparent" 
                        title={translations.show}>
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); if (invoice.id) onDeleteClick(invoice.id); }} className="text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-500 p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" title={translations.deleteInvoice}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                      </svg>
                    </button>
                </div>
            </div>
        );
      })}
    </div>
  );
};

export default InvoiceGrid;