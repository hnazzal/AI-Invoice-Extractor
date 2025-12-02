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
import Spinner from '../shared/Spinner'; // Ensure Spinner is imported

// Import parsing libraries dynamically or assume they are available via global scope due to importmap
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

const SummaryCard = ({ title, value, icon, colorClass }: { title: string, value: string | number, icon: React.ReactNode, colorClass: string }) => (
  <div className="glass-card relative p-6 rounded-2xl overflow-hidden group hover:-translate-y-1 transition-all duration-300">
    <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${colorClass} opacity-10 rounded-bl-full group-hover:scale-110 transition-transform duration-500`}></div>
    <div className="relative z-10 flex items-center justify-between">
        <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">{title}</p>
            <p className="text-2xl lg:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">{value}</p>
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClass} text-white shadow-lg shadow-indigo-500/20`}>
            {icon}
        </div>
    </div>
  </div>
);

const StatusPillFilter = ({ value, onChange, translations, lang }: { value: string, onChange: (value: string) => void, translations: Translations, lang: Language }) => {
  const options = [
    { value: 'all', label: translations.all },
    { value: 'paid', label: translations.paid },
    { value: 'unpaid', label: translations.unpaid },
  ];
  const activeIndex = options.findIndex(opt => opt.value === value);
  const positionStyle = lang === 'ar' 
    ? { right: `calc(${activeIndex} * (100% / 3))` } 
    : { left: `calc(${activeIndex} * (100% / 3))` };

  return (
    <div className="relative flex items-center w-60 h-11 rounded-full p-1 bg-slate-200 dark:bg-slate-900/50 shadow-inner">
      <div
        className="absolute bg-white dark:bg-slate-700/50 h-9 rounded-full shadow-md transition-all duration-300 ease-in-out"
        style={{ width: 'calc(100% / 3 - 4px)', ...positionStyle, margin: '0 2px' }}
      />
      {options.map(option => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`relative z-10 w-1/3 text-center text-sm font-semibold transition-colors duration-300 ${
            value === option.value ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

const UploadOptionCard = ({ icon, title, subtitle, onClick, className = "" }: any) => (
    <div 
        onClick={onClick}
        className={`group relative flex flex-col items-center justify-center p-6 glass-card rounded-2xl cursor-pointer hover:border-indigo-500/50 dark:hover:border-indigo-400/50 transition-all duration-300 h-full min-h-[160px] ${className}`}
    >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
        <div className="relative z-10 w-14 h-14 mb-4 rounded-2xl bg-white dark:bg-slate-700 shadow-md flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
            {icon}
        </div>
        <h3 className="relative z-10 font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors text-center">{title}</h3>
        <p className="relative z-10 text-xs text-slate-500 dark:text-slate-400 mt-2 text-center opacity-80 group-hover:opacity-100">{subtitle}</p>
    </div>
);

// --- Main Dashboard Component ---

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

  // --- Processing Logic (Extract, Save, Delete) ---
  
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

  // --- Camera Handlers ---
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

  // --- Actions ---
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

  // --- Filtering & Stats ---
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
    <div className="space-y-10 pb-20 animate-fade-in-up">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-4">
             <div>
                 <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">{translations.dashboardTitle}</h1>
                 <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">{translations.welcome}, <span className="text-indigo-600 dark:text-indigo-400">{user.email}</span></p>
             </div>
        </div>
        
        {/* Summary Stats Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            <SummaryCard title={translations.totalInvoices} value={invoices.length} colorClass="from-slate-600 to-slate-900" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} />
            <SummaryCard title={translations.grandTotal} value={formatCurrency(totalAmount)} colorClass="from-indigo-500 to-blue-600" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
            <SummaryCard title={translations.totalUnpaidAmount} value={formatCurrency(unpaidAmount)} colorClass="from-amber-500 to-orange-600" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>} />
            <SummaryCard title={translations.topVendorStat} value={topVendor} colorClass="from-fuchsia-600 to-pink-600" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>} />
            <SummaryCard title={translations.topItemStat} value={topItem} colorClass="from-teal-500 to-emerald-600" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>} />
        </section>

        {/* Upload Action Section */}
        <section className="glass-panel p-8 rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{translations.uploadBoxTitle}</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-2">{translations.uploadBoxSubtitle}</p>
            </div>

            {isProcessing ? (
                <ProcessingLoader translations={translations} />
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                     {/* Input Refs (Hidden) */}
                    <input ref={docInputRef} type="file" onChange={handleFileChange} accept="application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" />
                    <input ref={imgInputRef} type="file" onChange={handleFileChange} accept="image/jpeg,image/png,image/webp" className="hidden" />
                    <input ref={scannerInputRef} type="file" onChange={handleFileChange} accept="image/*,application/pdf" capture="environment" className="hidden" />

                    <UploadOptionCard
                        onClick={() => docInputRef.current?.click()}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                        title={translations.uploadDocument}
                        subtitle={translations.docSubtitle}
                    />
                     <UploadOptionCard
                        onClick={() => imgInputRef.current?.click()}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                        title={translations.uploadImage}
                        subtitle={translations.imgSubtitle}
                    />
                     <UploadOptionCard
                        onClick={() => scannerInputRef.current?.click()}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>}
                        title={translations.fromScanner}
                        subtitle={translations.chooseFile}
                    />
                     <UploadOptionCard
                        onClick={handleOpenCamera}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                        title={translations.scanWithCamera}
                        subtitle={translations.capture}
                    />
                    <UploadOptionCard
                        onClick={() => setIsManualEntryOpen(true)}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>}
                        title={translations.addManually}
                        subtitle={translations.manualInvoiceEntry}
                        className="col-span-2 md:col-span-1"
                    />
                </div>
            )}
            {processingError && <p className="mt-6 text-sm font-medium text-red-600 bg-red-100 dark:bg-red-900/30 p-4 rounded-xl border border-red-200 dark:border-red-800 text-center animate-pulse">{processingError}</p>}
        </section>

        {/* Camera Overlay Portal */}
        {isCameraOpen && createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black animate-fade-in-up">
                <div className="relative w-full h-full max-w-lg mx-auto bg-black flex flex-col">
                    <video ref={videoRef} autoPlay playsInline className={`w-full flex-grow object-cover ${capturedImage ? 'hidden' : 'block'}`}></video>
                    {capturedImage && <img src={capturedImage} alt="Captured" className="w-full flex-grow object-contain bg-black" />}
                    <canvas ref={canvasRef} className="hidden"></canvas>
                    
                    <div className="absolute top-0 left-0 right-0 p-6 flex justify-end z-10 bg-gradient-to-b from-black/80 to-transparent">
                        <button onClick={handleCloseCamera} className="text-white bg-white/10 hover:bg-white/20 rounded-full p-3 backdrop-blur-md border border-white/20 transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    
                    <div className="absolute bottom-0 left-0 right-0 p-10 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex justify-center items-center gap-8 z-10">
                        {capturedImage ? (
                            <>
                                <button onClick={handleRetake} className="px-8 py-4 text-white bg-slate-700/80 hover:bg-slate-600 rounded-full font-bold backdrop-blur-md border border-slate-500/50 shadow-lg">{translations.retake}</button>
                                <button onClick={handleUsePhoto} className="px-8 py-4 text-white bg-indigo-600 hover:bg-indigo-500 rounded-full font-bold shadow-lg shadow-indigo-500/50">{translations.usePhoto}</button>
                            </>
                        ) : (
                            <button onClick={handleCapture} className="w-20 h-20 rounded-full bg-white border-4 border-slate-300/30 shadow-[0_0_30px_rgba(255,255,255,0.3)] active:scale-95 transition-transform" aria-label={translations.capture}>
                                <div className="w-full h-full rounded-full border-2 border-black/10"></div>
                            </button>
                        )}
                    </div>
                    {cameraError && <p className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center text-white bg-red-600/90 px-6 py-3 rounded-xl backdrop-blur-md z-20 shadow-xl">{cameraError}</p>}
                </div>
            </div>,
            document.body
        )}

        {/* Newly Extracted Invoice Alert */}
        {newlyExtractedInvoice && !isProcessing && (
            <section className="p-6 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl shadow-lg border border-emerald-200 dark:border-emerald-700/50 animate-fade-in-up">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                     <div className="flex items-center gap-4">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg text-emerald-600 dark:text-emerald-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-emerald-900 dark:text-emerald-100">{translations.newlyExtractedInvoices}</h2>
                            {newlyExtractedInvoice.processingCost !== undefined && (
                                <p className="text-xs font-mono text-emerald-600 dark:text-emerald-400 mt-1 opacity-80">
                                    {translations.processingCost}: ${newlyExtractedInvoice.processingCost.toFixed(6)}
                                </p>
                            )}
                        </div>
                     </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <button onClick={() => setNewlyExtractedInvoice(null)} className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-slate-700 dark:text-slate-200 font-bold hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-300 dark:hover:border-slate-600">{translations.cancel}</button>
                        <button onClick={handleSaveInvoice} className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-white font-bold bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-0.5">{translations.saveInvoice}</button>
                    </div>
                </div>
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-xl overflow-hidden border border-emerald-100 dark:border-emerald-800/50">
                    <InvoiceTable 
                        invoices={[newlyExtractedInvoice]} translations={translations} currency={currency} language={lang}
                        onInvoiceDoubleClick={() => {}} onDeleteClick={() => {}} onViewClick={(inv) => setInvoiceFileToView({base64: inv.sourceFileBase64!, mimeType: inv.sourceFileMimeType!})} onTogglePaymentStatus={() => {}}
                        columnVisibility={{ ...columnVisibility, actions: false, uploader: false }}
                        selectedInvoiceIds={new Set()} onSelectionChange={() => {}}
                    />
                </div>
            </section>
        )}

        {/* Data List Section */}
        <section className="glass-panel p-6 rounded-3xl">
            {/* Toolbar */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        {translations.savedInvoices}
                        <span className="text-sm font-medium bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 px-2.5 py-0.5 rounded-full">{invoices.length}</span>
                    </h2>
                </div>
                
                <div className="flex flex-col lg:flex-row gap-3 w-full xl:w-auto">
                    {/* Search & Date */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-grow sm:w-64">
                            <input type="text" placeholder={translations.searchPlaceholder} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full ps-10 pe-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm" />
                            <svg className="absolute start-3 top-2.5 h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <div className="flex gap-2">
                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full sm:w-auto px-3 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full sm:w-auto px-3 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                    </div>

                    {/* Filters & Actions */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="hidden md:block">
                            <StatusPillFilter value={statusFilter} onChange={setStatusFilter} translations={translations} lang={lang} />
                        </div>
                        
                        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                            <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-indigo-300' : 'text-slate-400 hover:text-slate-600'}`}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg></button>
                            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-indigo-300' : 'text-slate-400 hover:text-slate-600'}`}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg></button>
                        </div>

                        <div className="relative" ref={colsDropdownRef}>
                            <button onClick={() => setIsColsDropdownOpen(prev => !prev)} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 00 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" /></svg>
                            </button>
                            {isColsDropdownOpen && (
                                <div className="absolute top-full end-0 mt-2 w-56 rounded-xl shadow-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 z-20 p-2 animate-fade-in-up">
                                    {ALL_COLUMNS.filter(key => key !== 'actions').map(colKey => (
                                        <label key={colKey} className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg cursor-pointer transition-colors">
                                            <input type="checkbox" checked={columnVisibility[colKey]} onChange={() => setColumnVisibility(prev => ({...prev, [colKey]: !prev[colKey]}))} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                            {translations[colKey] || colKey}
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        <button onClick={handleExportToExcel} className="p-2.5 rounded-xl text-green-600 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 hover:bg-green-100 transition-colors" title={translations.exportToExcel}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        </button>

                        <button onClick={handleClearFilters} className="text-sm font-medium text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 underline decoration-dotted underline-offset-4">{translations.clearFilters}</button>
                    </div>
                </div>
            </div>
            
            {/* Selection Toolbar */}
            {selectedInvoiceIds.size > 0 && (
                <div className="flex items-center justify-between mb-4 p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl border border-indigo-100 dark:border-indigo-800 animate-fade-in-up">
                    <span className="font-semibold text-indigo-700 dark:text-indigo-300 px-2">
                        {translations.countSelected.replace('{count}', selectedInvoiceIds.size.toString())}
                    </span>
                    <button onClick={() => setIsDeleteSelectedConfirmOpen(true)} className="px-4 py-2 flex items-center gap-2 text-sm font-bold text-red-600 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg shadow-sm transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                        {translations.deleteSelected}
                    </button>
                </div>
            )}

            {/* List/Grid View */}
            {invoices.length > 0 ? (
                viewMode === 'list' ? (
                    <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                        <InvoiceTable 
                            invoices={filteredInvoices} translations={translations} currency={currency} language={lang}
                            onInvoiceDoubleClick={(invoice) => setInvoiceToView(invoice)} onDeleteClick={(id) => setInvoiceToDelete(id)}
                            onViewClick={(inv) => setInvoiceFileToView({base64: inv.sourceFileBase64!, mimeType: inv.sourceFileMimeType!})} onTogglePaymentStatus={handleTogglePaymentStatus}
                            columnVisibility={columnVisibility}
                            selectedInvoiceIds={selectedInvoiceIds}
                            onSelectionChange={setSelectedInvoiceIds}
                        />
                    </div>
                ) : (
                    <InvoiceGrid 
                        invoices={filteredInvoices} translations={translations} currency={currency} language={lang}
                        onInvoiceClick={(invoice) => setInvoiceToView(invoice)} onDeleteClick={(id) => setInvoiceToDelete(id)}
                        onViewClick={(inv) => setInvoiceFileToView({base64: inv.sourceFileBase64!, mimeType: inv.sourceFileMimeType!})} onTogglePaymentStatus={handleTogglePaymentStatus}
                    />
                )
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">{translations.noInvoices}</p>
                </div>
            )}
        </section>

        {/* Saved invoices need to be passed here for analysis & chat */}
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