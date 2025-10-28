import React from 'react';
import type { Invoice, Translations, Currency, Language } from '../../types';

interface InvoiceGridProps {
  invoices: Invoice[];
  translations: Translations;
  currency: Currency;
  language: Language;
  onInvoiceClick: (invoice: Invoice) => void;
  onDeleteClick: (invoiceDbId: string) => void;
  onViewClick: (invoice: Invoice) => void;
  onTogglePaymentStatus: (invoiceId: string) => void;
}

const InvoiceCard: React.FC<{
  invoice: Invoice;
  translations: Translations;
  formatCurrency: (amount: number) => string;
} & Omit<InvoiceGridProps, 'invoices' | 'currency' | 'language'>> = ({ 
  invoice, 
  translations, 
  formatCurrency, 
  onInvoiceClick, 
  onDeleteClick, 
  onViewClick, 
  onTogglePaymentStatus 
}) => {
  
  const isPaid = invoice.paymentStatus === 'paid';
  const statusClass = isPaid
    ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
    : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
  const statusText = translations[invoice.paymentStatus];

  return (
    <div className="relative group bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-slate-700/50 flex flex-col transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
      <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-indigo-500 transition-all duration-300 pointer-events-none"></div>
       <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 opacity-0 group-hover:opacity-70 transition-opacity duration-500 blur-lg pointer-events-none"></div>
      <div className="relative z-10 flex flex-col flex-grow">
        <div onClick={() => onInvoiceClick(invoice)} className="p-5 flex-grow cursor-pointer">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 truncate" title={invoice.vendorName}>
                {invoice.vendorName}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {translations.invoiceNumber} {invoice.invoiceNumber}
              </p>
            </div>
            <span className={`ms-2 px-3 py-1 text-xs font-semibold rounded-full ${statusClass} flex-shrink-0`}>
                {statusText}
              </span>
          </div>
          <div className="my-4">
              <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(invoice.totalAmount)}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{invoice.invoiceDate}</p>
          </div>
        </div>
        <div className="border-t border-slate-200/50 dark:border-slate-700/50 p-2 flex justify-end items-center gap-1 bg-white/20 dark:bg-slate-900/20 rounded-b-2xl">
          {invoice.paymentStatus === 'unpaid' && invoice.id && (
                  <button 
                      onClick={(e) => { e.stopPropagation(); onTogglePaymentStatus(invoice.id!); }}
                      className="text-slate-500 hover:text-green-600 dark:text-slate-400 dark:hover:text-green-400 p-2 rounded-full hover:bg-white/50 dark:hover:bg-slate-700/50 transition-colors" 
                      title={translations.markAsPaid}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                  </button>
              )}
              <button 
                  onClick={(e) => { e.stopPropagation(); onViewClick(invoice); }} 
                  disabled={!invoice.sourceFileBase64}
                  className="text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 p-2 rounded-full hover:bg-white/50 dark:hover:bg-slate-700/50 disabled:text-slate-300 dark:disabled:text-slate-600 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors" 
                  title={translations.show}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
              </button>
              <button onClick={(e) => { e.stopPropagation(); if (invoice.id) onDeleteClick(invoice.id); }} className="text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-500 p-2 rounded-full hover:bg-white/50 dark:hover:bg-slate-700/50 transition-colors" title={translations.deleteInvoice}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                </svg>
              </button>
        </div>
      </div>
    </div>
  );
};


const InvoiceGrid: React.FC<InvoiceGridProps> = ({ invoices, translations, currency, language, ...handlers }) => {
  const formatCurrency = (amount: number) => {
    const locale = language === 'ar' ? 'ar-JO' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };
  
  if (!invoices || invoices.length === 0) {
      return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 py-4">
      {invoices.map(invoice => (
        <InvoiceCard key={invoice.id || invoice.invoiceNumber} invoice={invoice} translations={translations} formatCurrency={formatCurrency} {...handlers} />
      ))}
    </div>
  );
};

export default InvoiceGrid;