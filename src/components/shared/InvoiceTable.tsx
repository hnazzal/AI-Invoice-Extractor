import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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
  selectedInvoiceIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
  isAdminView?: boolean;
}

const MIN_COLUMN_WIDTH = 80;

const InvoiceTable: React.FC<InvoiceTableProps> = ({ invoices, translations, currency, language, onInvoiceDoubleClick, onDeleteClick, onViewClick, onTogglePaymentStatus, columnVisibility, selectedInvoiceIds, onSelectionChange, isAdminView = false }) => {
  
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  const formatCurrency = (amount: number) => {
      const locale = language === 'ar' ? 'ar-JO' : 'en-US';
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSelectedIds = new Set<string>();
    if (e.target.checked) {
        invoices.forEach(invoice => {
            if (invoice.id) newSelectedIds.add(invoice.id);
        });
    }
    onSelectionChange(newSelectedIds);
  };

  const handleSelectOne = (invoiceId: string) => {
      const newSelectedIds = new Set(selectedInvoiceIds);
      if (newSelectedIds.has(invoiceId)) {
          newSelectedIds.delete(invoiceId);
      } else {
          newSelectedIds.add(invoiceId);
      }
      onSelectionChange(newSelectedIds);
  };

  const isAllSelected = useMemo(() => {
    const visibleInvoiceIds = invoices.map(inv => inv.id).filter(Boolean);
    return visibleInvoiceIds.length > 0 && visibleInvoiceIds.every(id => selectedInvoiceIds.has(id!));
  }, [invoices, selectedInvoiceIds]);

  const isIndeterminate = useMemo(() => {
    return selectedInvoiceIds.size > 0 && !isAllSelected;
  }, [selectedInvoiceIds, isAllSelected]);

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);


  const canPerformActions = !!onDeleteClick && !!onInvoiceDoubleClick;

  const ALL_COLUMNS_CONFIG = useMemo(() => {
      const cols = [
        { key: 'invoiceNumber', label: translations.invoiceNumber, width: 140, align: 'start' },
        { key: 'invoiceDate', label: translations.invoiceDate, width: 130, align: 'start' },
        { key: 'vendorName', label: translations.vendorName, width: 200, align: 'start' },
        { key: 'customerName', label: translations.customerName, width: 200, align: 'start' },
        { key: 'paymentStatus', label: translations.paymentStatus, width: 140, align: 'center' },
        { key: 'items', label: translations.items, width: 100, align: 'center' },
        { key: 'totalAmount', label: translations.totalAmount, width: 160, align: 'end' },
      ];

      if (isAdminView) {
          cols.push({ key: 'uploader', label: translations.uploader, width: 220, align: 'start' });
          cols.push({ key: 'processingCost', label: translations.processingCost, width: 140, align: 'end' });
      } else {
          cols.push({ key: 'uploader', label: translations.uploader, width: 220, align: 'start' });
      }

      if (canPerformActions) {
          cols.push({ key: 'actions', label: translations.actions, width: 120, align: 'end' });
      }
      
      return cols;
  }, [translations, canPerformActions, isAdminView]);

  const visibleColumns = useMemo(() => {
    return ALL_COLUMNS_CONFIG.filter(col => {
        if (col.key === 'processingCost' && isAdminView) return true;
        return columnVisibility[col.key] !== false; 
    });
  }, [ALL_COLUMNS_CONFIG, columnVisibility, isAdminView]);

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
      setColumnWidths(prev => ({ ...prev, [key]: newWidth }));
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
      case 'invoiceNumber': return <span className="font-bold text-slate-800 dark:text-slate-100">{invoice.invoiceNumber}</span>;
      case 'invoiceDate': return <span className="text-slate-500 dark:text-slate-400">{invoice.invoiceDate}</span>;
      case 'vendorName': return <span className="font-medium text-slate-700 dark:text-slate-200">{invoice.vendorName}</span>;
      case 'customerName': return <span className="text-slate-600 dark:text-slate-300">{invoice.customerName}</span>;
      case 'items': return <span className="inline-block bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-xs font-semibold">{invoice.items?.length || 0}</span>;
      case 'paymentStatus':
        const isPaid = invoice.paymentStatus === 'paid';
        return (
            <span className={`px-4 py-1.5 inline-flex text-xs font-bold uppercase tracking-wide rounded-full ${
                isPaid ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'
            }`}>
                {translations[invoice.paymentStatus]}
            </span>
        );
      case 'totalAmount': return <span className="font-bold text-indigo-600 dark:text-indigo-400 text-base">{formatCurrency(invoice.totalAmount)}</span>;
      case 'uploader': 
        return (
            <div className="flex flex-col">
                <span className="text-sm text-slate-700 dark:text-slate-200 font-medium">{invoice.uploaderEmail}</span>
                {invoice.uploaderCompany && <span className="text-xs text-slate-400 uppercase tracking-wider">{invoice.uploaderCompany}</span>}
            </div>
        );
      case 'processingCost':
        return invoice.processingCost !== undefined 
            ? <span className="font-mono text-slate-500 text-xs">${invoice.processingCost.toFixed(6)}</span> 
            : '-';
      case 'actions': return (
        <div className="flex justify-end items-center gap-2">
            {invoice.paymentStatus === 'unpaid' && invoice.id && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onTogglePaymentStatus(invoice.id!); }}
                    className="p-2 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all" 
                    title={translations.markAsPaid}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                </button>
            )}
            <button 
                onClick={(e) => { e.stopPropagation(); onViewClick(invoice); }} 
                disabled={!invoice.sourceFileBase64}
                className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all disabled:opacity-30" 
                title={translations.show}>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            </button>
            <button onClick={(e) => { e.stopPropagation(); if (invoice.id) onDeleteClick(invoice.id); }} className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all" title={translations.deleteInvoice}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
        </div>
      );
      default: return null;
    }
  }
  
  const grandTotal = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

  if (!invoices || invoices.length === 0 || (visibleColumns.length === 0 && canPerformActions)) {
    return null;
  }
  
  const numVisible = visibleColumns.length;
  const actionsColSpan = (canPerformActions && (isAdminView || columnVisibility.actions !== false)) ? 1 : 0;
  const totalColSpan = 2;
  const summaryColSpan = numVisible - totalColSpan - actionsColSpan;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-700" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          {canPerformActions && <col style={{ width: '60px' }} />}
          {visibleColumns.map(col => (
            <col key={col.key} style={{ width: `${columnWidths[col.key]}px` }} />
          ))}
        </colgroup>
        <thead>
          <tr className="bg-slate-50/50 dark:bg-slate-800/50">
            {canPerformActions && (
              <th scope="col" className="px-6 py-5">
                <input
                    type="checkbox"
                    className="w-5 h-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
                    ref={headerCheckboxRef}
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                />
              </th>
            )}
            {visibleColumns.map(col => (
               <th 
                key={col.key} 
                scope="col" 
                className={`px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest relative text-${col.align || 'start'}`}
              >
                {col.label}
                 <div
                    onMouseDown={(e) => handleMouseDown(e, col.key)}
                    className="absolute top-0 right-0 h-full w-4 cursor-col-resize group flex justify-center"
                  >
                    <div className={`w-0.5 h-full ${resizingState?.key === col.key ? 'bg-indigo-400' : 'bg-transparent group-hover:bg-slate-200'} transition-colors`} />
                  </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
          {invoices.map((invoice, index) => (
            <tr 
              key={invoice.id || invoice.clientId || invoice.invoiceNumber} 
              onDoubleClick={canPerformActions ? () => onInvoiceDoubleClick(invoice) : undefined}
              className={`${canPerformActions ? "cursor-pointer" : ""} hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors duration-200 ${invoice.id && selectedInvoiceIds.has(invoice.id) ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}
            >
              {canPerformActions && (
                <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                    {invoice.id && (
                        <input
                            type="checkbox"
                            className="w-5 h-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
                            checked={selectedInvoiceIds.has(invoice.id)}
                            onChange={() => handleSelectOne(invoice.id!)}
                        />
                    )}
                </td>
              )}
              {visibleColumns.map(col => (
                <td key={col.key} className={`px-6 py-5 whitespace-nowrap text-sm text-${col.align}`}>
                  {renderCellContent(invoice, col.key)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-slate-50/50 dark:bg-slate-800/50">
          <tr>
             {canPerformActions && <td className="px-6 py-5"></td>}
             {summaryColSpan > 0 && (
                <td colSpan={summaryColSpan} className="px-6 py-5 text-start text-sm font-medium text-slate-500">
                    {`${translations.totalInvoices}: ${invoices.length}`}
                </td>
             )}
            <td colSpan={totalColSpan} className="px-6 py-5 text-end">
                <span className="uppercase text-xs font-bold text-slate-400 tracking-wider me-4">{translations.grandTotal}</span>
                <span className="text-xl font-extrabold text-slate-800 dark:text-white">{formatCurrency(grandTotal)}</span>
            </td>
            {actionsColSpan > 0 && <td className="px-6 py-5"></td>}
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default InvoiceTable;