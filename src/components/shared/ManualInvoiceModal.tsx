import React, { useState, useEffect, useCallback } from 'react';
import type { Invoice, InvoiceItem, Translations, Currency, Language } from '../../types';
import Spinner from './Spinner';

interface ManualInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (invoice: Invoice) => Promise<void>;
  translations: Translations;
  currency: Currency;
  language: Language;
}

const getInitialInvoice = (): Invoice => ({
  invoiceNumber: '',
  vendorName: '',
  customerName: '',
  invoiceDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD
  totalAmount: 0,
  items: [{ description: '', quantity: 1, unitPrice: 0, total: 0 }],
  paymentStatus: 'unpaid',
});

const InputField = ({ label, id, ...props }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{label}</label>
        <input id={id} {...props} className="block w-full px-3 py-2 bg-white/50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
    </div>
);

const ManualInvoiceModal: React.FC<ManualInvoiceModalProps> = ({ isOpen, onClose, onSave, translations, currency, language }) => {
  const [invoice, setInvoice] = useState<Invoice>(getInitialInvoice());
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setInvoice(getInitialInvoice());
      setError('');
      setIsSaving(false);
    }
  }, [isOpen]);

  const formatCurrency = useCallback((amount: number) => {
    const locale = language === 'ar' ? 'ar-JO' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }, [currency, language]);

  const handleHeaderChange = (field: keyof Invoice, value: string) => {
    setInvoice(prev => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (index: number, field: keyof Omit<InvoiceItem, 'total'>, value: string) => {
    const newItems = [...invoice.items];
    const itemToUpdate = { ...newItems[index] };

    if (field === 'quantity' || field === 'unitPrice') {
        itemToUpdate[field] = parseFloat(value) || 0;
    } else {
        itemToUpdate[field] = value;
    }
    
    itemToUpdate.total = itemToUpdate.quantity * itemToUpdate.unitPrice;
    newItems[index] = itemToUpdate;
    
    const newTotalAmount = newItems.reduce((acc, currentItem) => acc + currentItem.total, 0);
    setInvoice(prev => ({ ...prev, items: newItems, totalAmount: newTotalAmount }));
  };

  const handleAddItem = () => {
    setInvoice(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, unitPrice: 0, total: 0 }],
    }));
  };
  
  const handleRemoveItem = (index: number) => {
    if (invoice.items.length <= 1) return;
    const newItems = invoice.items.filter((_, i) => i !== index);
    const newTotalAmount = newItems.reduce((acc, currentItem) => acc + currentItem.total, 0);
    setInvoice(prev => ({ ...prev, items: newItems, totalAmount: newTotalAmount }));
  };
  
  const handleSave = async () => {
    if (!invoice.invoiceNumber.trim() || !invoice.vendorName.trim() || !invoice.customerName.trim()) {
        setError(`${translations.saveError} ${translations.invoiceNumber}, ${translations.vendorName}, and ${translations.customerName} are required.`);
        return;
    }
    if (invoice.items.some(item => !item.description.trim() || item.quantity <= 0 || item.unitPrice < 0)) {
        setError(`${translations.saveError} All items must have a description, positive quantity, and non-negative price.`);
        return;
    }
    
    setError('');
    setIsSaving(true);
    try {
        await onSave(invoice);
    } catch (err: any) {
        setError(err.message || 'An unexpected error occurred during save.');
    } finally {
        setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center p-4" 
        onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="manual-invoice-title"
    >
      <div 
        className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col" 
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200/50 dark:border-slate-700/50 flex justify-between items-center flex-shrink-0">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white" id="manual-invoice-title">
            {translations.manualInvoiceEntry}
          </h3>
          <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="p-6 flex-grow overflow-y-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <InputField id="invoiceNumber" label={translations.invoiceNumber} value={invoice.invoiceNumber} onChange={(e) => handleHeaderChange('invoiceNumber', e.target.value)} required />
                <InputField id="vendorName" label={translations.vendorName} value={invoice.vendorName} onChange={(e) => handleHeaderChange('vendorName', e.target.value)} required />
                <InputField id="customerName" label={translations.customerName} value={invoice.customerName} onChange={(e) => handleHeaderChange('customerName', e.target.value)} required />
                <InputField id="invoiceDate" type="date" label={translations.invoiceDate} value={invoice.invoiceDate} onChange={(e) => handleHeaderChange('invoiceDate', e.target.value)} />
            </div>

            <div>
                <h4 className="text-lg font-semibold mt-4 mb-2 pt-4 border-t border-slate-200/50 dark:border-slate-600/50">{translations.items}</h4>
                <div className="space-y-2">
                    {/* Header */}
                    <div className="grid grid-cols-12 gap-x-4 px-2 pb-2 border-b border-slate-200/50 dark:border-slate-600/50">
                        <div className="col-span-5 text-xs font-medium text-slate-500 dark:text-slate-400">{translations.description}</div>
                        <div className="col-span-2 text-xs font-medium text-slate-500 dark:text-slate-400 text-end">{translations.quantity}</div>
                        <div className="col-span-2 text-xs font-medium text-slate-500 dark:text-slate-400 text-end">{translations.unitPrice}</div>
                        <div className="col-span-2 text-xs font-medium text-slate-500 dark:text-slate-400 text-end">{translations.total}</div>
                    </div>
                    {/* Items */}
                    {invoice.items.map((item, index) => (
                        <div key={index} className="grid grid-cols-12 gap-x-4 items-center p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50">
                            <input value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} placeholder={translations.description} className="col-span-5 bg-transparent border border-slate-300 dark:border-slate-600 rounded-md px-2 py-1.5 focus:ring-indigo-500 focus:border-indigo-500" />
                            <input type="number" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} className="col-span-2 bg-transparent border border-slate-300 dark:border-slate-600 rounded-md px-2 py-1.5 text-end focus:ring-indigo-500 focus:border-indigo-500" />
                            <input type="number" value={item.unitPrice} onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)} className="col-span-2 bg-transparent border border-slate-300 dark:border-slate-600 rounded-md px-2 py-1.5 text-end focus:ring-indigo-500 focus:border-indigo-500" />
                            <div className="col-span-2 text-end font-medium text-slate-700 dark:text-slate-200">{formatCurrency(item.total)}</div>
                            <div className="col-span-1 flex justify-end">
                                <button onClick={() => handleRemoveItem(index)} disabled={invoice.items.length <= 1} className="text-slate-400 hover:text-red-500 disabled:text-slate-300 dark:disabled:text-slate-600 disabled:cursor-not-allowed p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                </button>
                            </div>
                        </div>
                    ))}
                    <button onClick={handleAddItem} className="mt-2 flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-md">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                        {translations.addItem}
                    </button>
                </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200/50 dark:border-slate-600/50 flex flex-col md:flex-row justify-between items-center gap-4">
                 <div>
                    <label htmlFor="paymentStatus" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{translations.paymentStatus}</label>
                    <select id="paymentStatus" value={invoice.paymentStatus} onChange={(e) => handleHeaderChange('paymentStatus', e.target.value)} className="bg-transparent border border-slate-300 dark:border-slate-600 rounded-md px-3 py-1.5 focus:ring-indigo-500 focus:border-indigo-500">
                        <option value="unpaid">{translations.unpaid}</option>
                        <option value="paid">{translations.paid}</option>
                    </select>
                </div>
                <div className="text-end">
                     <div className="text-sm text-slate-500 dark:text-slate-400">{translations.totalAmount}</div>
                    <div className="font-bold text-2xl text-indigo-600 dark:text-indigo-400">{formatCurrency(invoice.totalAmount)}</div>
                </div>
            </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200/50 dark:border-slate-700/50 flex-shrink-0">
          {error && <p className="text-sm text-red-500 mb-3 text-center">{error}</p>}
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
                className="w-28 flex justify-center px-4 py-2 rounded-lg font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-700 hover:to-blue-600 transition-all shadow-md disabled:from-slate-400 disabled:to-slate-500"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? <Spinner /> : translations.saveInvoice}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualInvoiceModal;