import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { Invoice, Translations, Currency, Language } from '../../types';

interface InvoiceTableProps {
  invoices: Invoice[];
  translations: Translations;
  currency: Currency;
  language: Language;
  onInvoiceDoubleClick: (invoice: Invoice) => void;
  onDeleteClick: (invoiceDbId: string) => void;
  onViewClick: (invoice: Invoice) => void;
  onTogglePaymentStatus: (invoiceId: string) => void;
  columnVisibility: Record<string, boolean>;
}

const MIN_COLUMN_WIDTH = 80;

const InvoiceTable: React.FC<InvoiceTableProps> = ({ invoices, translations, currency, language, onInvoiceDoubleClick, onDeleteClick, onViewClick, onTogglePaymentStatus, columnVisibility }) => {
  
  const formatCurrency = (amount: number) => {
      const locale = language === 'ar' ? 'ar-JO' : 'en-US';
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
  };

  const canPerformActions = !!onDeleteClick && !!onInvoiceDoubleClick;

  const ALL_COLUMNS_CONFIG = useMemo(() => [
    { key: 'invoiceNumber', label: translations.invoiceNumber, width: 150, align: 'start' },
    { key: 'invoiceDate', label: translations.invoiceDate, width: 120, align: 'start' },
    { key: 'vendorName', label: translations.vendorName, width: 200, align: 'start' },
    { key: 'customerName', label: translations.customerName, width: 200, align: 'start' },
    { key: 'paymentStatus', label: translations.paymentStatus, width: 120, align: 'center' },
    { key: 'items', label: translations.items, width: 80, align: 'center' },
    { key: 'totalAmount', label: translations.totalAmount, width: 150, align: 'end' },
    { key: 'uploader', label: translations.uploader, width: 200, align: 'start' },
    ...(canPerformActions ? [{ key: 'actions', label: translations.actions, width: 120, align: 'end' }] : [])
  ], [translations, canPerformActions]);

  const visibleColumns = useMemo(() => {
    return ALL_COLUMNS_CONFIG.filter(col => columnVisibility[col.key]);
  }, [ALL_COLUMNS_CONFIG, columnVisibility]);

  const [columnWidths, setColumnWidths] = useState(() => {
    const initialWidths: { [key: string]: number } = {};
    ALL_COLUMNS_CONFIG.forEach(col => {
      initialWidths[col.key] = col.width;
    });
    return initialWidths;
  });
  
  const [resizingState, setResizingState] = useState<{
    key: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent, key: string) => {
    e.preventDefault();
    setResizingState({
      key,
      startX: e.clientX,
      startWidth: columnWidths[key],
    });
  }, [columnWidths]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingState) return;
      
      const { key, startX, startWidth } = resizingState;
      const newWidth = Math.max(startWidth + e.clientX - startX, MIN_COLUMN_WIDTH);
      
      setColumnWidths(prev => ({
        ...prev,
        [key]: newWidth,
      }));
    };

    const handleMouseUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setResizingState(null);
    };

    if (resizingState) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingState]);


  const renderCellContent = (invoice: Invoice, columnKey: string) => {
    switch(columnKey) {
      case 'invoiceNumber': return <span className="font-medium text-slate-900 dark:text-slate-100">{invoice.invoiceNumber}</span>;
      case 'invoiceDate': return invoice.invoiceDate;
      case 'vendorName': return invoice.vendorName;
      case 'customerName': return invoice.customerName;
      case 'items': return invoice.items?.length || 0;
      case 'paymentStatus':
        const isPaid = invoice.paymentStatus === 'paid';
        const statusClass = isPaid 
            ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' 
            : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
        return (
            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}`}>
                {translations[invoice.paymentStatus]}
            </span>
        );
      case 'totalAmount': return <span className="font-semibold text-indigo-600 dark:text-indigo-400">{formatCurrency(invoice.totalAmount)}</span>;
      case 'uploader': return invoice.uploaderEmail;
      case 'actions': return (
        <div className="flex justify-end items-center gap-1">
            {invoice.paymentStatus === 'unpaid' && invoice.id && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onTogglePaymentStatus(invoice.id!); }}
                    className="text-slate-500 hover:text-green-600 dark:text-slate-400 dark:hover:text-green-400 p-2 rounded-full hover:bg-white/50 dark:hover:bg-slate-700/50" 
                    title={translations.markAsPaid}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                </button>
            )}
            <button 
                onClick={(e) => { e.stopPropagation(); onViewClick(invoice); }} 
                disabled={!invoice.sourceFileBase64}
                className="text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 p-2 rounded-full hover:bg-white/50 dark:hover:bg-slate-700/50 disabled:text-slate-300 dark:disabled:text-slate-600 disabled:cursor-not-allowed disabled:hover:bg-transparent" 
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
      );
      default: return null;
    }
  }
  
  const grandTotal = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

  if (!invoices || invoices.length === 0 || visibleColumns.length === 0) {
    return null;
  }
  
  const numVisible = visibleColumns.length;
  const actionsColSpan = (canPerformActions && columnVisibility.actions) ? 1 : 0;
  const totalColSpan = 2;
  const summaryColSpan = numVisible - totalColSpan - actionsColSpan;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200/50 dark:divide-slate-700/50" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          {visibleColumns.map(col => (
            <col key={col.key} style={{ width: `${columnWidths[col.key]}px` }} />
          ))}
        </colgroup>
        <thead className="bg-white/10 dark:bg-slate-700/10">
          <tr>
            {visibleColumns.map(col => (
               <th 
                key={col.key} 
                scope="col" 
                className={`px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider relative text-${col.align || 'start'}`}
              >
                {col.label}
                 <div
                    onMouseDown={(e) => handleMouseDown(e, col.key)}
                    className="absolute top-0 right-0 h-full w-2 cursor-col-resize group"
                    title={`Resize ${col.label} column`}
                  >
                    <div className={`w-px h-full ${resizingState?.key === col.key ? 'bg-indigo-400' : 'bg-transparent group-hover:bg-slate-300 dark:group-hover:bg-slate-500'} transition-colors`} />
                  </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200/50 dark:divide-slate-700/50">
          {invoices.map((invoice, index) => (
            <tr 
              key={invoice.id || invoice.invoiceNumber} 
              onDoubleClick={canPerformActions ? () => onInvoiceDoubleClick(invoice) : undefined}
              className={`${canPerformActions ? "cursor-pointer" : ""} transition-colors duration-150 hover:bg-white/20 dark:hover:bg-white/10`}
            >
              {visibleColumns.map(col => (
                <td key={col.key} className={`px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 text-${col.align}`}>
                  {renderCellContent(invoice, col.key)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t-2 border-slate-300 dark:border-slate-600 bg-white/20 dark:bg-white/10 font-semibold">
          <tr>
             {summaryColSpan > 0 && (
                <td colSpan={summaryColSpan} className="px-6 py-4 text-start text-sm text-slate-700 dark:text-slate-200">
                    {`${translations.totalInvoices}: ${invoices.length}`}
                </td>
             )}
            <td colSpan={totalColSpan} className="px-6 py-4 text-end">
                <span className="uppercase text-sm text-slate-700 dark:text-slate-200 me-4">{translations.grandTotal}</span>
                <span className="text-lg text-indigo-700 dark:text-indigo-400">{formatCurrency(grandTotal)}</span>
            </td>
            {actionsColSpan > 0 && <td className="px-6 py-4"></td>}
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default InvoiceTable;