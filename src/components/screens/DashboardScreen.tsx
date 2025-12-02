
import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { User, Invoice, Translations, Currency, Language } from '../../types';
import * as geminiService from '../../services/geminiService';
import * as dbService from '../../services/dbService';
import InvoiceTable from '../shared/InvoiceTable';
import InvoiceGrid from '../shared/InvoiceGrid';
import ProcessingLoader from '../shared/ProcessingLoader';
import ConfirmationModal from '../shared/ConfirmationModal';
import InvoiceDetailModal from '../shared/InvoiceDetailModal';
import FileViewerModal from '../shared/FileViewerModal';
import ManualInvoiceModal from '../shared/ManualInvoiceModal';
import Chatbot from '../shared/Chatbot';
import SmartAnalysis from '../shared/SmartAnalysis';
import Spinner from '../shared/Spinner';

import { read, utils, writeFile } from 'xlsx';
import mammoth from 'mammoth';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

const readExcelFile = async (file: File): Promise<string> => {
    const data = await file.arrayBuffer();
    const workbook = read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return utils.sheet_to_csv(sheet);
};

const readWordFile = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
};

// --- Modern UI Components ---

const SummaryCard = ({ title, value, icon, colorClass, delay }: { title: string, value: string | number, icon: React.ReactNode, colorClass: string, delay: string }) => (
  <div className={`bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-soft hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 animate-fade-in-up ${delay}`}>
    <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-2xl ${colorClass} text-white shadow-md`}>
            {icon}
        </div>
        {/* Optional decorative element */}
        <div className="h-2 w-2 rounded-full bg-slate-200 dark:bg-slate-700"></div>
    </div>
    <div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{title}</p>
        <p className="text-3xl font-extrabold text-slate-800 dark:text-white mt-1">{value}</p>
    </div>
  </div>
);

const StatusPillFilter = ({ value, onChange, translations }: { value: string, onChange: (value: string) => void, translations: Translations }) => {
  const options = [
    { value: 'all', label: translations.all },
    { value: 'paid', label: translations.paid },
    { value: 'unpaid', label: translations.unpaid },
  ];

  return (
    <div className="flex p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
      {options.map(option => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
            value === option.value 
            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

const UploadOptionCard = ({ icon, title, subtitle, onClick, color }: any) => (
    <div 
        onClick={onClick}
        className="group relative flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border-2 border-transparent hover:border-indigo-100 dark:hover:border-slate-700 cursor-pointer transition-all duration-300 hover:shadow-md h-full min-h-[150px]"
    >
        <div className={`w-14 h-14 mb-4 rounded-2xl ${color} text-white shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
            {icon}
        </div>
        <h3 className="font-bold text-slate-800 dark:text-slate-200">{title}</h3>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 text-center">{subtitle}</p>
    </div>
);

interface DashboardScreenProps {
  user: User;
  translations: Translations;
  invoices: Invoice[];
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  currency: Currency;
  lang: Language;
}

const ALL_COLUMNS = ['invoiceNumber', 'invoiceDate', 'vendorName', 'customerName', 'paymentStatus', 'items', 'totalAmount', 'uploader', 'actions'] as const;
type ColumnKey = typeof ALL_COLUMNS[number];

const DashboardScreen: React.FC<DashboardScreenProps> = ({ user, translations, invoices, setInvoices, currency, lang }) => {
  if (!invoices) invoices = [];

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState('');
  const [newlyExtractedInvoice, setNewlyExtractedInvoice] = useState<Invoice | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [itemSearchTerm, setItemSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);
  const [invoiceToView, setInvoiceToView] = useState<Invoice | null>(null);
  const [invoiceFileToView, setInvoiceFileToView] = useState<{ base64: string; mimeType: string } | null>(null);
  const [isColsDropdownOpen, setIsColsDropdownOpen] = useState(false);
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState(new Set<string>());
  const [isDeleteSelectedConfirmOpen, setIsDeleteSelectedConfirmOpen] = useState(false);

  const colsDropdownRef = useRef<HTMLDivElement>(null);
  
  const docInputRef = useRef<HTMLInputElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const scannerInputRef = useRef<HTMLInputElement>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState('');
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colsDropdownRef.current && !colsDropdownRef.current.contains(event.target as Node)) {
        setIsColsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setProcessingError('');
    setNewlyExtractedInvoice(null);
    try {
      let extractedData: Invoice;
      const fileType = file.type;
      const fileName = file.name.toLowerCase();

      if (fileType === 'application/pdf' || fileType.startsWith('image/')) {
          const base64String = await fileToBase64(file);
          const pureBase64 = base64String.split(',')[1];
          extractedData = await geminiService.extractInvoiceDataFromFile(pureBase64, file.type);
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv') || fileType.includes('spreadsheet') || fileType.includes('excel')) {
          const textData = await readExcelFile(file);
          extractedData = await geminiService.extractInvoiceDataFromText(textData);
          extractedData.sourceFileMimeType = fileType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      } else if (fileName.endsWith('.docx') || fileType.includes('wordprocessing')) {
          const textData = await readWordFile(file);
          extractedData = await geminiService.extractInvoiceDataFromText(textData);
          extractedData.sourceFileMimeType = fileType || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      } else {
          throw new Error("Unsupported file type.");
      }
      
      setNewlyExtractedInvoice({
        ...extractedData,
        sourceFileBase64: (await fileToBase64(file)).split(',')[1],
        sourceFileMimeType: file.type,
      });

    } catch (error: any) {
      setProcessingError(error.message || translations.extractionError);
    } finally {
      setIsProcessing(false);
      if(docInputRef.current) docInputRef.current.value = "";
      if(imgInputRef.current) imgInputRef.current.value = "";
      if(scannerInputRef.current) scannerInputRef.current.value = "";
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setProcessingError('');
      setNewlyExtractedInvoice(null);
      processFile(file);
    }
  };

  const handleOpenCamera = () => { setIsCameraOpen(true); setCameraError(''); setCapturedImage(null); document.body.style.overflow = 'hidden'; };
  const handleCloseCamera = () => { setIsCameraOpen(false); setCapturedImage(null); document.body.style.overflow = ''; };
  
  useEffect(() => {
      let stream: MediaStream | null = null;
      if (isCameraOpen && videoRef.current) {
          navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } })
            .then(s => { stream = s; videoRef.current!.srcObject = s; })
            .catch(() => setCameraError(translations.noCameraAccess));
      }
      return () => { if (stream) stream.getTracks().forEach(track => track.stop()); };
  }, [isCameraOpen]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const v = videoRef.current;
      const c = canvasRef.current;
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      c.getContext('2d')?.drawImage(v, 0, 0);
      setCapturedImage(c.toDataURL('image/jpeg'));
    }
  };

  const handleRetake = () => setCapturedImage(null);

  const handleUsePhoto = () => {
    if (capturedImage) {
      fetch(capturedImage).then(res => res.blob()).then(blob => {
          handleCloseCamera();
          processFile(new File([blob], `scan-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      });
    }
  };

  const handleSaveInvoice = async () => {
    if (!newlyExtractedInvoice) return;
    try {
        const saved = await dbService.saveInvoiceForUser(user, newlyExtractedInvoice);
        setInvoices(prev => [{...saved, uploaderEmail: user.email, uploaderCompany: user.companyName }, ...prev]);
        setNewlyExtractedInvoice(null);
    } catch (error) { console.error(error); }
  };

  const handleSaveManualInvoice = async (inv: Invoice) => {
    const saved = await dbService.saveInvoiceForUser(user, inv);
    setInvoices(prev => [{...saved, uploaderEmail: user.email, uploaderCompany: user.companyName }, ...prev]);
    setIsManualEntryOpen(false);
  };

  const handleDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    await dbService.deleteInvoiceForUser(user.token, invoiceToDelete);
    setInvoices(prev => prev.filter(inv => inv.id !== invoiceToDelete));
    setInvoiceToDelete(null);
  };

  const handleDeleteSelected = async () => {
    await dbService.deleteMultipleInvoicesForUser(user.token, Array.from(selectedInvoiceIds));
    setInvoices(prev => prev.filter(inv => !inv.id || !selectedInvoiceIds.has(inv.id)));
    setSelectedInvoiceIds(new Set());
    setIsDeleteSelectedConfirmOpen(false);
  };

  const handleTogglePaymentStatus = async (invoiceId: string) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;
    const newStatus = invoice.paymentStatus === 'paid' ? 'unpaid' : 'paid';
    setInvoices(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, paymentStatus: newStatus } : inv));
    dbService.updateInvoicePaymentStatus(user.token, invoiceId, newStatus).catch(() => {});
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
        const term = searchTerm.toLowerCase();
        const itemTerm = itemSearchTerm.toLowerCase();
        const matchesSearch = inv.invoiceNumber.toLowerCase().includes(term) || inv.vendorName.toLowerCase().includes(term) || inv.customerName.toLowerCase().includes(term);
        const matchesItem = !itemTerm || inv.items.some(i => i.description.toLowerCase().includes(itemTerm));
        const invDate = new Date(inv.invoiceDate);
        const from = dateFrom ? new Date(dateFrom) : null;
        const to = dateTo ? new Date(dateTo) : null;
        if(to) to.setHours(23,59,59);
        const matchesDate = (!from || invDate >= from) && (!to || invDate <= to);
        const matchesStatus = statusFilter === 'all' || inv.paymentStatus === statusFilter;
        return matchesSearch && matchesItem && matchesDate && matchesStatus;
    });
  }, [invoices, searchTerm, itemSearchTerm, dateFrom, dateTo, statusFilter]);

  const totalAmount = useMemo(() => invoices.reduce((sum, inv) => sum + inv.totalAmount, 0), [invoices]);
  const unpaidAmount = useMemo(() => invoices.filter(inv => inv.paymentStatus === 'unpaid').reduce((sum, inv) => sum + inv.totalAmount, 0), [invoices]);
  
  const topVendor = useMemo(() => {
    if (!invoices.length) return '-';
    const counts: Record<string, number> = {};
    invoices.forEach(inv => counts[inv.vendorName] = (counts[inv.vendorName] || 0) + inv.totalAmount);
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }, [invoices]);

  const topItem = useMemo(() => {
    if (!invoices.length) return '-';
    const counts: Record<string, number> = {};
    invoices.forEach(inv => inv.items.forEach(i => counts[i.description] = (counts[i.description] || 0) + i.quantity));
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted.length ? (sorted[0][0].length > 15 ? sorted[0][0].substring(0,15)+'...' : sorted[0][0]) : '-';
  }, [invoices]);

  const formatCurrency = (val: number) => new Intl.NumberFormat(lang === 'ar' ? 'ar-JO' : 'en-US', { currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

  const [columnVisibility, setColumnVisibility] = useState<Record<ColumnKey, boolean>>({
      invoiceNumber: true, invoiceDate: true, vendorName: true, customerName: true,
      paymentStatus: true, items: false, totalAmount: true, uploader: false, actions: true,
  });

  const handleClearFilters = () => {
    setSearchTerm('');
    setItemSearchTerm('');
    setDateFrom('');
    setDateTo('');
    setStatusFilter('all');
  };

  const handleExportToExcel = () => {
    const dataToExport = filteredInvoices.map(inv => ({
        [translations.invoiceNumber]: inv.invoiceNumber,
        [translations.invoiceDate]: inv.invoiceDate,
        [translations.vendorName]: inv.vendorName,
        [translations.customerName]: inv.customerName,
        [translations.totalAmount]: inv.totalAmount,
        [translations.paymentStatus]: translations[inv.paymentStatus] || inv.paymentStatus,
        [translations.items]: inv.items.map(i => `${i.description} (${i.quantity}x${i.unitPrice})`).join(', ')
    }));

    const ws = utils.json_to_sheet(dataToExport);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Invoices");
    writeFile(wb, `Invoices_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-8 pb-20">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-4 animate-fade-in-up">
             <div>
                 <h1 className="text-4xl font-extrabold text-slate-800 dark:text-white tracking-tight">{translations.dashboardTitle}</h1>
                 <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">{translations.welcome}, <span className="text-indigo-600 dark:text-indigo-400">{user.email}</span></p>
             </div>
        </div>
        
        {/* Stats */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
            <SummaryCard title={translations.totalInvoices} value={invoices.length} colorClass="bg-gradient-to-r from-blue-500 to-cyan-500" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} delay="delay-0" />
            <SummaryCard title={translations.grandTotal} value={formatCurrency(totalAmount)} colorClass="bg-gradient-to-r from-indigo-500 to-purple-500" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} delay="delay-100" />
            <SummaryCard title={translations.totalUnpaidAmount} value={formatCurrency(unpaidAmount)} colorClass="bg-gradient-to-r from-amber-500 to-orange-500" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>} delay="delay-200" />
            <SummaryCard title={translations.topVendorStat} value={topVendor} colorClass="bg-gradient-to-r from-rose-500 to-pink-500" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>} delay="delay-300" />
            <SummaryCard title={translations.topItemStat} value={topItem} colorClass="bg-gradient-to-r from-emerald-500 to-teal-500" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>} delay="delay-400" />
        </section>

        {/* Action Bar / Upload */}
        <section className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md p-8 rounded-3xl animate-fade-in-up delay-500">
            <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-6">{translations.uploadBoxTitle}</h2>
            {isProcessing ? (
                <ProcessingLoader translations={translations} />
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {/* Hidden Inputs */}
                    <input ref={docInputRef} type="file" onChange={handleFileChange} accept="application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" />
                    <input ref={imgInputRef} type="file" onChange={handleFileChange} accept="image/jpeg,image/png,image/webp" className="hidden" />
                    <input ref={scannerInputRef} type="file" onChange={handleFileChange} accept="image/*,application/pdf" capture="environment" className="hidden" />

                    <UploadOptionCard
                        onClick={() => docInputRef.current?.click()}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                        title={translations.uploadDocument}
                        subtitle={translations.docSubtitle}
                        color="bg-blue-500"
                    />
                     <UploadOptionCard
                        onClick={() => imgInputRef.current?.click()}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                        title={translations.uploadImage}
                        subtitle={translations.imgSubtitle}
                        color="bg-violet-500"
                    />
                     <UploadOptionCard
                        onClick={() => scannerInputRef.current?.click()}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>}
                        title={translations.fromScanner}
                        subtitle={translations.chooseFile}
                        color="bg-emerald-500"
                    />
                     <UploadOptionCard
                        onClick={handleOpenCamera}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                        title={translations.scanWithCamera}
                        subtitle={translations.capture}
                        color="bg-rose-500"
                    />
                    <UploadOptionCard
                        onClick={() => setIsManualEntryOpen(true)}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>}
                        title={translations.addManually}
                        subtitle={translations.manualInvoiceEntry}
                        color="bg-amber-500"
                        className="col-span-2 md:col-span-1"
                    />
                </div>
            )}
            {processingError && <p className="mt-4 text-center text-red-500 bg-red-50 dark:bg-red-900/30 p-3 rounded-xl">{processingError}</p>}
        </section>

        {/* Camera Modal */}
        {isCameraOpen && createPortal(
            <div className="fixed inset-0 z-[100] bg-black flex flex-col">
                <video ref={videoRef} autoPlay playsInline className="flex-1 object-cover" />
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Camera UI Overlays */}
                <button onClick={handleCloseCamera} className="absolute top-6 right-6 text-white p-3 bg-black/40 rounded-full backdrop-blur-md">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>

                <div className="absolute bottom-0 w-full p-10 bg-gradient-to-t from-black/90 to-transparent flex justify-center gap-10 items-center">
                    {capturedImage ? (
                        <>
                            <button onClick={handleRetake} className="px-8 py-4 rounded-full bg-slate-700 text-white font-bold">{translations.retake}</button>
                            <button onClick={handleUsePhoto} className="px-8 py-4 rounded-full bg-indigo-600 text-white font-bold">{translations.usePhoto}</button>
                        </>
                    ) : (
                        <button onClick={handleCapture} className="w-24 h-24 rounded-full border-4 border-white bg-white/20 backdrop-blur-sm active:scale-95 transition-transform" />
                    )}
                </div>
                {cameraError && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-xl">{cameraError}</div>}
            </div>,
            document.body
        )}

        {/* New Invoice Confirmation */}
        {newlyExtractedInvoice && !isProcessing && (
            <section className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-lg border-2 border-emerald-400/50">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{translations.newlyExtractedInvoices}</h2>
                    <div className="flex gap-3">
                        <button onClick={() => setNewlyExtractedInvoice(null)} className="px-6 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-colors">{translations.cancel}</button>
                        <button onClick={handleSaveInvoice} className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-500/30 transition-all">{translations.saveInvoice}</button>
                    </div>
                </div>
                <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
                    <InvoiceTable 
                        invoices={[newlyExtractedInvoice]} translations={translations} currency={currency} language={lang}
                        onInvoiceDoubleClick={() => {}} onDeleteClick={() => {}} onViewClick={(inv) => setInvoiceFileToView({base64: inv.sourceFileBase64!, mimeType: inv.sourceFileMimeType!})} onTogglePaymentStatus={() => {}}
                        columnVisibility={{ ...columnVisibility, actions: false, uploader: false }}
                        selectedInvoiceIds={new Set()} onSelectionChange={() => {}}
                    />
                </div>
            </section>
        )}

        {/* Main List & Filters Section */}
        <section className="space-y-6">
            
            {/* Title & Stats */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                        {translations.savedInvoices}
                        <span className="bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400 text-sm px-3 py-1 rounded-full border border-indigo-100 dark:border-slate-700">{invoices.length}</span>
                    </h2>
                </div>
                
                {/* Batch Action */}
                {selectedInvoiceIds.size > 0 && (
                    <div className="flex items-center gap-4 bg-indigo-600 text-white px-4 py-2 rounded-xl shadow-lg shadow-indigo-500/30 animate-fade-in-up">
                        <span className="font-bold text-sm">{translations.countSelected.replace('{count}', selectedInvoiceIds.size.toString())}</span>
                        <div className="h-4 w-px bg-white/30"></div>
                        <button onClick={() => setIsDeleteSelectedConfirmOpen(true)} className="text-sm font-bold hover:text-red-200 transition-colors">
                            {translations.deleteSelected}
                        </button>
                    </div>
                )}
            </div>

            {/* Unified Floating Toolbar */}
            <div className="bg-white dark:bg-slate-800/80 backdrop-blur-xl p-2 rounded-2xl shadow-soft border border-white/50 dark:border-slate-700 flex flex-col xl:flex-row gap-3">
                
                {/* Search Group */}
                <div className="flex flex-col sm:flex-row flex-grow gap-2">
                    <div className="relative flex-grow">
                        <div className="absolute inset-y-0 start-0 flex items-center ps-4 pointer-events-none">
                            <svg className="w-5 h-5 text-slate-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
                            </svg>
                        </div>
                        <input 
                            type="text" 
                            className="block w-full p-3 ps-11 text-sm text-slate-900 border border-slate-200 rounded-xl bg-slate-50 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700/50 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white dark:focus:ring-indigo-500 dark:focus:border-indigo-500 transition-all shadow-sm" 
                            placeholder={translations.searchPlaceholder} 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                        />
                    </div>
                    
                    <input 
                        type="date" 
                        value={dateFrom} 
                        onChange={e => setDateFrom(e.target.value)} 
                        className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:w-auto p-3 dark:bg-slate-700/50 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white" 
                    />
                    <input 
                        type="date" 
                        value={dateTo} 
                        onChange={e => setDateTo(e.target.value)} 
                        className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:w-auto p-3 dark:bg-slate-700/50 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white" 
                    />
                </div>

                <div className="h-px xl:h-auto xl:w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>

                {/* Filter & View Controls */}
                <div className="flex flex-wrap items-center gap-2">
                    
                    <StatusPillFilter value={statusFilter} onChange={setStatusFilter} translations={translations} />

                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/50 p-1 rounded-xl">
                        <button 
                            onClick={() => setViewMode('list')} 
                            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-600 shadow text-indigo-600 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>
                        <button 
                            onClick={() => setViewMode('grid')} 
                            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-600 shadow text-indigo-600 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                        </button>
                    </div>

                    <button 
                        onClick={handleExportToExcel}
                        className="p-3 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors" 
                        title={translations.exportToExcel}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    </button>

                    <button 
                        onClick={handleClearFilters} 
                        className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                        title={translations.clearFilters}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            </div>

            {/* List/Grid Content */}
            {invoices.length > 0 ? (
                viewMode === 'list' ? (
                    <InvoiceTable 
                        invoices={filteredInvoices} translations={translations} currency={currency} language={lang}
                        onInvoiceDoubleClick={(invoice) => setInvoiceToView(invoice)} onDeleteClick={(id) => setInvoiceToDelete(id)}
                        onViewClick={(inv) => setInvoiceFileToView({base64: inv.sourceFileBase64!, mimeType: inv.sourceFileMimeType!})} onTogglePaymentStatus={handleTogglePaymentStatus}
                        columnVisibility={columnVisibility}
                        selectedInvoiceIds={selectedInvoiceIds}
                        onSelectionChange={setSelectedInvoiceIds}
                    />
                ) : (
                    <InvoiceGrid 
                        invoices={filteredInvoices} translations={translations} currency={currency} language={lang}
                        onInvoiceClick={(invoice) => setInvoiceToView(invoice)} onDeleteClick={(id) => setInvoiceToDelete(id)}
                        onViewClick={(inv) => setInvoiceFileToView({base64: inv.sourceFileBase64!, mimeType: inv.sourceFileMimeType!})} onTogglePaymentStatus={handleTogglePaymentStatus}
                    />
                )
            ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center bg-white/50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <p className="text-slate-400 font-medium">{translations.noInvoices}</p>
                </div>
            )}
        </section>

        {/* AI Features */}
        {invoices.length > 0 && <SmartAnalysis invoices={invoices} translations={translations} language={lang} />}
        
        <Chatbot invoices={invoices} translations={translations} language={lang} />

        {/* Modals */}
        <ConfirmationModal 
            isOpen={!!invoiceToDelete} onClose={() => setInvoiceToDelete(null)} onConfirm={handleDeleteInvoice}
            title={translations.deleteConfirmTitle} message={translations.deleteConfirmMessage}
            confirmText={translations.delete} cancelText={translations.cancel}
        />
        <ConfirmationModal 
            isOpen={isDeleteSelectedConfirmOpen} onClose={() => setIsDeleteSelectedConfirmOpen(false)} onConfirm={handleDeleteSelected}
            title={translations.deleteConfirmTitle} message={translations.deleteSelectedConfirmMessage.replace('{count}', selectedInvoiceIds.size.toString())}
            confirmText={translations.delete} cancelText={translations.cancel}
        />
        {invoiceToView && <InvoiceDetailModal isOpen={!!invoiceToView} onClose={() => setInvoiceToView(null)} invoice={invoiceToView} translations={translations} currency={currency} language={lang} />}
        {invoiceFileToView && <FileViewerModal isOpen={!!invoiceFileToView} onClose={() => setInvoiceFileToView(null)} fileBase64={invoiceFileToView.base64} mimeType={invoiceFileToView.mimeType} translations={translations} />}
        <ManualInvoiceModal isOpen={isManualEntryOpen} onClose={() => setIsManualEntryOpen(false)} onSave={handleSaveManualInvoice} translations={translations} currency={currency} language={lang} />
    </div>
  );
};

export default DashboardScreen;
