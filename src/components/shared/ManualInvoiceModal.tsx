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

// Helper Component for styled inputs with icons
const FormInput = ({ label, icon, id, ...props }: any) => (
    <div className="space-y-1.5">
        <label htmlFor={id} className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            {label} {props.required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
            <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
                {icon}
            </div>
            <input 
                id={id} 
                {...props} 
                className="block w-full ps-10 pe-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-sm"
            />
        </div>
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
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 overflow-y-auto"
        onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="manual-invoice-title"
    >
      <div 
        className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh] animate-fade-in-up" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center flex-shrink-0 bg-white dark:bg-slate-900 rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white" id="manual-invoice-title">
                {translations.manualInvoiceEntry}
            </h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        {/* Scrollable Body */}
        <div className="p-8 flex-grow overflow-y-auto custom-scrollbar">
            
            {/* Section 1: General Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <FormInput 
                    id="invoiceNumber" 
                    label={translations.invoiceNumber} 
                    value={invoice.invoiceNumber} 
                    onChange={(e: any) => handleHeaderChange('invoiceNumber', e.target.value)} 
                    required
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>}
                />
                <FormInput 
                    id="invoiceDate" 
                    type="date" 
                    label={translations.invoiceDate} 
                    value={invoice.invoiceDate} 
                    onChange={(e: any) => handleHeaderChange('invoiceDate', e.target.value)}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                />
                <FormInput 
                    id="vendorName" 
                    label={translations.vendorName} 
                    value={invoice.vendorName} 
                    onChange={(e: any) => handleHeaderChange('vendorName', e.target.value)} 
                    required
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
                />
                <FormInput 
                    id="customerName" 
                    label={translations.customerName} 
                    value={invoice.customerName} 
                    onChange={(e: any) => handleHeaderChange('customerName', e.target.value)} 
                    required
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                />
            </div>

            {/* Section 2: Line Items */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                        {translations.items}
                    </h4>
                    <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">{invoice.items.length} {translations.items}</span>
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                        <div className="col-span-5 text-xs font-bold text-slate-500 uppercase tracking-wider">{translations.description}</div>
                        <div className="col-span-2 text-xs font-bold text-slate-500 uppercase tracking-wider text-end">{translations.quantity}</div>
                        <div className="col-span-2 text-xs font-bold text-slate-500 uppercase tracking-wider text-end">{translations.unitPrice}</div>
                        <div className="col-span-2 text-xs font-bold text-slate-500 uppercase tracking-wider text-end">{translations.total}</div>
                        <div className="col-span-1 text-center"></div>
                    </div>

                    {/* Table Rows */}
                    <div className="divide-y divide-slate-200 dark:divide-slate-800">
                        {invoice.items.map((item, index) => (
                            <div key={index} className="grid grid-cols-12 gap-4 items-center px-4 py-3 hover:bg-white dark:hover:bg-slate-800 transition-colors group">
                                <div className="col-span-5">
                                    <input 
                                        value={item.description} 
                                        onChange={(e) => handleItemChange(index, 'description', e.target.value)} 
                                        placeholder={translations.description} 
                                        className="w-full bg-transparent border-0 border-b border-transparent focus:border-indigo-500 focus:ring-0 px-0 py-1 text-sm font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400 transition-all" 
                                    />
                                </div>
                                <div className="col-span-2">
                                    <input 
                                        type="number" 
                                        value={item.quantity} 
                                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} 
                                        className="w-full bg-transparent border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5 text-sm text-end text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500" 
                                    />
                                </div>
                                <div className="col-span-2">
                                    <input 
                                        type="number" 
                                        value={item.unitPrice} 
                                        onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)} 
                                        className="w-full bg-transparent border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5 text-sm text-end text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500" 
                                    />
                                </div>
                                <div className="col-span-2 text-end font-semibold text-slate-900 dark:text-white text-sm">
                                    {formatCurrency(item.total)}
                                </div>
                                <div className="col-span-1 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => handleRemoveItem(index)} 
                                        disabled={invoice.items.length <= 1} 
                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors disabled:opacity-30"
                                        title={translations.delete}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {/* Add Item Button */}
                    <button 
                        onClick={handleAddItem} 
                        className="w-full py-3 text-sm font-semibold text-indigo-600 dark:text-indigo-400 bg-slate-50 dark:bg-slate-900/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border-t border-dashed border-slate-300 dark:border-slate-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                        {translations.addItem}
                    </button>
                </div>
            </div>

            {/* Section 3: Summary & Status */}
            <div className="flex flex-col md:flex-row justify-end items-end gap-6 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="w-full md:w-auto">
                    <label htmlFor="paymentStatus" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{translations.paymentStatus}</label>
                    <div className="relative">
                        <select 
                            id="paymentStatus" 
                            value={invoice.paymentStatus} 
                            onChange={(e) => handleHeaderChange('paymentStatus', e.target.value)} 
                            className={`appearance-none block w-full md:w-48 px-4 py-2.5 rounded-lg border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${
                                invoice.paymentStatus === 'paid' 
                                ? 'bg-green-50 border-green-200 text-green-700' 
                                : 'bg-amber-50 border-amber-200 text-amber-700'
                            }`}
                        >
                            <option value="unpaid">{translations.unpaid}</option>
                            <option value="paid">{translations.paid}</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center px-2 text-slate-500">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>

                <div className="text-end">
                     <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{translations.totalAmount}</p>
                    <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        {formatCurrency(invoice.totalAmount)}
                    </div>
                </div>
            </div>

        </div>

        {/* Footer */}
        <div className="px-8 py-5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 rounded-b-2xl flex-shrink-0 flex justify-between items-center">
            <div className="text-sm text-red-500 font-medium">
                {error}
            </div>
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    className="px-5 py-2.5 rounded-lg text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    onClick={onClose}
                >
                    {translations.cancel}
                </button>
                <button
                    type="button"
                    className="px-8 py-2.5 rounded-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 transform hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
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