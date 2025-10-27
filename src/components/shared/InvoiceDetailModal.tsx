import React, { useState, useEffect } from 'react';
import type { Invoice, Translations, Currency, Language } from '../../types';

interface InvoiceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  translations: Translations;
  currency: Currency;
  language: Language;
}

const FileViewer = ({ base64, mimeType, translations }: { base64?: string; mimeType?: string; translations: Translations }) => {
    const [objectUrl, setObjectUrl] = useState<string | null>(null);

    useEffect(() => {
        if (base64 && mimeType) {
            const pureBase64 = base64.split(',')[1] || base64;
            try {
                const sliceSize = 512;
                const byteCharacters = atob(pureBase64);
                const byteArrays: Uint8Array[] = [];
                for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
                    const slice = byteCharacters.slice(offset, offset + sliceSize);
                    const byteNumbers = new Array(slice.length);
                    for (let i = 0; i < slice.length; i++) { byteNumbers[i] = slice.charCodeAt(i); }
                    byteArrays.push(new Uint8Array(byteNumbers));
                }
                const blob = new Blob(byteArrays, { type: mimeType });
                const url = URL.createObjectURL(blob);
                setObjectUrl(url);

                return () => { URL.revokeObjectURL(url); setObjectUrl(null); };
            } catch (e) {
                console.error("Error creating blob from base64", e);
                setObjectUrl(null);
            }
        }
    }, [base64, mimeType]);

    if (!base64 || !mimeType) {
        return <div className="flex items-center justify-center h-full bg-slate-100 dark:bg-slate-900 rounded-lg"><p className="text-slate-500">No file available.</p></div>;
    }
    
    if (!objectUrl) {
         return <div className="flex items-center justify-center h-full bg-slate-100 dark:bg-slate-900 rounded-lg"><p className="text-slate-500">{translations.loading}...</p></div>;
    }

    if (mimeType.startsWith('image/')) {
        return <img src={objectUrl} alt={translations.invoiceFile} className="max-w-full max-h-full mx-auto object-contain" />;
    }

    if (mimeType === 'application/pdf') {
        return <iframe src={objectUrl} title={translations.invoiceFile} className="w-full h-full border-0 rounded-lg" />;
    }

    return (
        <div className="flex items-center justify-center h-full bg-slate-100 dark:bg-slate-900 rounded-lg">
            <p className="text-slate-500">Unsupported file type: {mimeType}</p>
        </div>
    );
};


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
        className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-center p-4" 
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invoice-details-title"
    >
      <div 
        className="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-7xl w-full h-[90vh] m-4 transform transition-all flex flex-col" 
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center flex-shrink-0">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white" id="invoice-details-title">
            {translations.invoiceDetails}
          </h3>
          <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-0 overflow-hidden">
            {/* Left Column: Invoice Data */}
            <div className="p-6 overflow-y-auto">
                <div className="grid grid-cols-2 gap-6 mb-6">
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
            
            {/* Right Column: File Viewer */}
            <div className="p-4 bg-slate-100 dark:bg-slate-900 h-full overflow-hidden hidden md:block border-s border-slate-200 dark:border-slate-700">
                <FileViewer base64={invoice.sourceFileBase64} mimeType={invoice.sourceFileMimeType} translations={translations} />
            </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetailModal;