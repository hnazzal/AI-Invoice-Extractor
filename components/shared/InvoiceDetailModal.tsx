
import React from 'react';
import type { Invoice, Translations, Currency, Language } from '../../types';

interface InvoiceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  translations: Translations;
  currency: Currency;
  language: Language;
}

const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({ isOpen, onClose, invoice, translations, currency, language }) => {
  if (!isOpen) return null;

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
    <div 
        className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-center" 
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invoice-details-title"
    >
      <div 
        className="relative bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full m-4 transform transition-all" 
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white" id="invoice-details-title">
            {translations.invoiceDetails}
          </h3>
          <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="p-6 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                <div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">{translations.invoiceNumber}</div>
                    <div className="font-semibold text-slate-800 dark:text-slate-100">{invoice.invoiceNumber}</div>
                </div>
                <div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">{translations.invoiceDate}</div>
                    <div className="font-semibold text-slate-800 dark:text-slate-100">{invoice.invoiceDate}</div>
                </div>
                 <div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">{translations.vendorName}</div>
                    <div className="font-semibold text-slate-800 dark:text-slate-100">{invoice.vendorName}</div>
                </div>
                <div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">{translations.customerName}</div>
                    <div className="font-semibold text-slate-800 dark:text-slate-100">{invoice.customerName}</div>
                </div>
                {invoice.uploaderEmail && (
                    <div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">{translations.uploader}</div>
                        <div className="font-semibold text-slate-800 dark:text-slate-100">{invoice.uploaderEmail}</div>
                    </div>
                )}
            </div>

            <h4 className="text-lg font-semibold mt-4 mb-2 pt-4 border-t border-slate-200 dark:border-slate-600">{translations.items}</h4>
            <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-600">
                <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                    <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">{translations.description}</th>
                    <th scope="col" className="px-6 py-3 text-end text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">{translations.quantity}</th>
                    <th scope="col" className="px-6 py-3 text-end text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">{translations.unitPrice}</th>
                    <th scope="col" className="px-6 py-3 text-end text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">{translations.total}</th>
                </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {invoice.items.map((item, index) => (
                    <tr key={index} className="even:bg-slate-50/50 dark:even:bg-slate-800/50">
                    <td className="px-6 py-4 whitespace-normal text-sm text-slate-800 dark:text-slate-200">{item.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-end text-slate-500 dark:text-slate-400">{item.quantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-end text-slate-500 dark:text-slate-400">{formatCurrency(item.unitPrice)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-end font-medium text-slate-800 dark:text-slate-200">{formatCurrency(item.total)}</td>
                    </tr>
                ))}
                </tbody>
            </table>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-600 flex justify-end">
                <div className="text-end">
                     <div className="text-sm text-slate-500 dark:text-slate-400">{translations.totalAmount}</div>
                    <div className="font-bold text-2xl text-indigo-600 dark:text-indigo-400">{formatCurrency(invoice.totalAmount)}</div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetailModal;