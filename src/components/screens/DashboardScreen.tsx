import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import type { User, Invoice, Translations, Currency, Language } from '../../types';
import * as geminiService from '../../services/geminiService';
import * as dbService from '../../services/dbService';
import InvoiceTable from '../shared/InvoiceTable';
import InvoiceGrid from '../shared/InvoiceGrid';
import ProcessingLoader from '../shared/ProcessingLoader';
import ConfirmationModal from '../shared/ConfirmationModal';
import InvoiceDetailModal from '../shared/InvoiceDetailModal';
import FileViewerModal from '../shared/FileViewerModal';
import Spinner from '../shared/Spinner';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

const SummaryCard = ({ title, value, icon, gradient }) => (
  <div className={`relative p-6 rounded-2xl overflow-hidden text-white transition-transform transform hover:scale-105 duration-300 shadow-lg ${gradient}`}>
    <div className="absolute -top-4 -right-4 w-24 h-24 text-white/10">{icon}</div>
    <div className="relative z-10">
      <p className="text-sm font-medium uppercase opacity-80">{title}</p>
      <p className="text-4xl font-bold mt-2">{value}</p>
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

const UploadOptionCard = ({ icon, title, subtitle, onClick }) => (
    <div 
        onClick={onClick}
        className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-300 cursor-pointer text-center group"
    >
        <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700/50 rounded-full flex items-center justify-center mb-4 transition-colors duration-300 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50">
            {icon}
        </div>
        <h3 className="font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
    </div>
);

const ViewModeToggle = ({ value, onChange, translations }: { value: 'list' | 'grid', onChange: (mode: 'list' | 'grid') => void, translations: Translations }) => (
  <div className="flex items-center rounded-lg bg-slate-200 dark:bg-slate-900/50 p-1">
    <button 
      onClick={() => onChange('list')}
      className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors duration-200 ${value === 'list' ? 'bg-white dark:bg-slate-700/50 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
      aria-pressed={value === 'list'}
      title={translations.listView}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
    </button>
    <button 
      onClick={() => onChange('grid')}
      className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors duration-200 ${value === 'grid' ? 'bg-white dark:bg-slate-700/50 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
      aria-pressed={value === 'grid'}
      title={translations.gridView}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
    </button>
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [processingError, setProcessingError] = useState('');
  const [newlyExtractedInvoice, setNewlyExtractedInvoice] = useState<Invoice | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);
  const [invoiceToView, setInvoiceToView] = useState<Invoice | null>(null);
  const [invoiceFileToView, setInvoiceFileToView] = useState<{ base64: string; mimeType: string } | null>(null);
  const [isColsDropdownOpen, setIsColsDropdownOpen] = useState(false);
  const colsDropdownRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
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
      const base64String = await fileToBase64(file);
      const pureBase64 = base64String.split(',')[1];
      
      const extractedData = await geminiService.extractInvoiceDataFromFile(pureBase64, file.type);
      
      setNewlyExtractedInvoice({
        ...extractedData,
        sourceFileBase64: pureBase64,
        sourceFileMimeType: file.type,
      });

    } catch (error: any) {
      setProcessingError(translations.extractionError);
      console.error(error);
    } finally {
      setIsProcessing(false);
      if(fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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
  
  // --- Camera Logic ---
  useEffect(() => {
      let stream: MediaStream | null = null;
      const startCamera = async () => {
          if (isCameraOpen && videoRef.current) {
              try {
                  stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                  videoRef.current.srcObject = stream;
              } catch (err) {
                  console.error("Camera access denied:", err);
                  setCameraError(translations.noCameraAccess);
                  setIsCameraOpen(false);
              }
          }
      };
      
      const stopCamera = () => {
          if (stream) {
              stream.getTracks().forEach(track => track.stop());
          }
          if (videoRef.current) {
              videoRef.current.srcObject = null;
          }
      };

      if (isCameraOpen) {
          startCamera();
      } else {
          stopCamera();
      }

      return () => {
          stopCamera();
      };
  }, [isCameraOpen, translations.noCameraAccess]);
  
  const handleOpenCamera = () => {
      setCameraError('');
      setCapturedImage(null);
      setIsCameraOpen(true);
  };

  const handleCloseCamera = () => {
      setIsCameraOpen(false);
      setCapturedImage(null);
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        setCapturedImage(canvas.toDataURL('image/jpeg'));
      }
    }
  };

  const handleRetake = () => setCapturedImage(null);

  const handleUsePhoto = () => {
    if (capturedImage) {
      fetch(capturedImage)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `scan-${Date.now()}.jpg`, { type: 'image/jpeg' });
          handleCloseCamera();
          processFile(file);
        });
    }
  };
  // --- End Camera Logic ---

  const handleSaveInvoice = async () => {
    if (!newlyExtractedInvoice) return;
    setIsSaving(true);
    setProcessingError('');
    
    try {
        const savedInvoice = await dbService.saveInvoiceForUser(user, newlyExtractedInvoice);
        setInvoices(prevInvoices => [{...savedInvoice, uploaderEmail: user.email }, ...prevInvoices]);
        setNewlyExtractedInvoice(null);
    } catch (error: any) {
        console.error("Failed to save invoice:", error);
        setProcessingError(`${translations.saveError}${error.message}`);
    } finally {
        setIsSaving(false);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!invoiceToDelete) return;

    try {
        await dbService.deleteInvoiceForUser(user.token, invoiceToDelete);
        setInvoices(prev => prev.filter(inv => inv.id !== invoiceToDelete));
    } catch (error) {
        console.error("Failed to delete invoice:", error);
    } finally {
        setInvoiceToDelete(null);
    }
  };
  
  const handleTogglePaymentStatus = async (invoiceId: string) => {
    const originalInvoices = [...invoices];
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;

    const newStatus = invoice.paymentStatus === 'paid' ? 'unpaid' : 'paid';

    setInvoices(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, paymentStatus: newStatus } : inv));
    
    try {
      await dbService.updateInvoicePaymentStatus(user.token, invoiceId, newStatus);
    } catch (error) {
      console.error("Failed to update payment status:", error);
      setInvoices(originalInvoices); // Revert on failure
    }
  };

  const handleViewInvoiceFile = useCallback((invoice: Invoice) => {
    if (invoice.sourceFileBase64 && invoice.sourceFileMimeType) {
        setInvoiceFileToView({ base64: invoice.sourceFileBase64, mimeType: invoice.sourceFileMimeType });
    }
  }, []);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
        const lowerSearchTerm = searchTerm.toLowerCase();
        const matchesSearch = 
            invoice.invoiceNumber.toLowerCase().includes(lowerSearchTerm) ||
            invoice.vendorName.toLowerCase().includes(lowerSearchTerm) ||
            invoice.customerName.toLowerCase().includes(lowerSearchTerm) ||
            invoice.items.some(item => item.description.toLowerCase().includes(lowerSearchTerm));

        const invoiceDate = new Date(invoice.invoiceDate);
        const fromDate = dateFrom ? new Date(dateFrom) : null;
        const toDate = dateTo ? new Date(dateTo) : null;
        if(fromDate) fromDate.setHours(0,0,0,0);
        if(toDate) toDate.setHours(23,59,59,999);

        const matchesDate = 
            (!fromDate || invoiceDate >= fromDate) &&
            (!toDate || invoiceDate <= toDate);
        
        const matchesStatus = statusFilter === 'all' || invoice.paymentStatus === statusFilter;

        const min = minAmount ? parseFloat(minAmount) : -Infinity;
        const max = maxAmount ? parseFloat(maxAmount) : Infinity;
        const matchesAmount = invoice.totalAmount >= min && invoice.totalAmount <= max;

        return matchesSearch && matchesDate && matchesStatus && matchesAmount;
    });
  }, [invoices, searchTerm, dateFrom, dateTo, statusFilter, minAmount, maxAmount]);
  
  const [columnVisibility, setColumnVisibility] = useState<Record<ColumnKey, boolean>>({
      invoiceNumber: true, invoiceDate: true, vendorName: true, customerName: true,
      paymentStatus: true, items: false, totalAmount: true, uploader: false, actions: true,
  });

  const handleClearFilters = () => {
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
    setStatusFilter('all');
    setMinAmount('');
    setMaxAmount('');
  };

  const formatCurrency = useCallback((amount: number) => {
      const locale = lang === 'ar' ? 'ar-JO' : 'en-US';
      return new Intl.NumberFormat(locale, { currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  }, [currency, lang]);

  const totalAmount = useMemo(() => invoices.reduce((sum, inv) => sum + inv.totalAmount, 0), [invoices]);
  const paidCount = useMemo(() => invoices.filter(inv => inv.paymentStatus === 'paid').length, [invoices]);
  const unpaidCount = useMemo(() => invoices.filter(inv => inv.paymentStatus === 'unpaid').length, [invoices]);

  return (
    <div className="space-y-8">
        <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100">{translations.dashboardTitle}</h1>
        
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <SummaryCard title={translations.totalInvoices} value={invoices.length} gradient="bg-gradient-to-br from-indigo-500 to-blue-500" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0A2.25 2.25 0 015.625 7.5h12.75c1.13 0 2.063.784 2.227 1.883" /></svg>} />
            <SummaryCard title={translations.grandTotal} value={formatCurrency(totalAmount)} gradient="bg-gradient-to-br from-sky-500 to-cyan-500" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.75A.75.75 0 013 4.5h.75m0 0a9 9 0 0118 0m-9 7.5h1.5m-1.5 0h.375m-1.125 0h.375m-1.125 0h.375M9 12v9.75M15 12v9.75M21 12v9.75M2.25 6h19.5" /></svg>} />
            <SummaryCard title={translations.paidInvoices} value={paidCount} gradient="bg-gradient-to-br from-green-500 to-emerald-500" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
            <SummaryCard title={translations.unpaidInvoices} value={unpaidCount} gradient="bg-gradient-to-br from-amber-500 to-orange-500" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" /></svg>} />
        </section>

        <section className="p-6 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold mb-4">{translations.uploadBoxTitle}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{translations.uploadBoxSubtitle}</p>

            {isProcessing ? (
                <ProcessingLoader translations={translations} />
            ) : (
                <div className="flex flex-col md:flex-row items-stretch gap-6">
                     <UploadOptionCard
                        onClick={() => fileInputRef.current?.click()}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>}
                        title={translations.uploadImageOrPDF}
                        subtitle={translations.chooseFile}
                    />
                    <input
                        ref={fileInputRef} type="file" onChange={handleFileChange}
                        accept="application/pdf,image/jpeg,image/png,image/webp"
                        className="hidden"
                    />
                     <UploadOptionCard
                        onClick={handleOpenCamera}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                        title={translations.scanWithCamera}
                        subtitle={translations.or}
                    />
                </div>
            )}
            {processingError && !newlyExtractedInvoice && <p className="mt-4 text-sm text-red-500">{processingError}</p>}
        </section>

        {isCameraOpen && (
            <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
                <video ref={videoRef} autoPlay playsInline className={`w-full h-full object-cover ${capturedImage ? 'hidden' : 'block'}`}></video>
                {capturedImage && <img src={capturedImage} alt="Captured" className="w-full h-full object-contain" />}
                <canvas ref={canvasRef} className="hidden"></canvas>
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/50 flex justify-center items-center gap-4">
                    <button onClick={handleCloseCamera} className="absolute top-4 right-4 text-white text-2xl">&times;</button>
                    {capturedImage ? (
                        <>
                            <button onClick={handleRetake} className="px-4 py-2 text-white bg-slate-600 rounded-lg">{translations.retake}</button>
                            <button onClick={handleUsePhoto} className="px-4 py-2 text-white bg-indigo-600 rounded-lg">{translations.usePhoto}</button>
                        </>
                    ) : (
                        <button onClick={handleCapture} className="w-20 h-20 rounded-full bg-white border-4 border-slate-400" aria-label={translations.capture}></button>
                    )}
                </div>
                {cameraError && <p className="absolute top-4 text-center text-sm text-red-500 bg-black/50 p-2 rounded">{cameraError}</p>}
            </div>
        )}

        {newlyExtractedInvoice && !isProcessing && (
            <section className="p-6 bg-green-50/50 dark:bg-green-900/20 rounded-2xl shadow-lg border border-green-200 dark:border-green-700/50 opacity-0 animate-fade-in-up">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-green-800 dark:text-green-300">{translations.newlyExtractedInvoice}</h2>
                    <div className="flex gap-2">
                        <button onClick={() => { setNewlyExtractedInvoice(null); setProcessingError(''); }} className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors">{translations.cancel}</button>
                        <button 
                            onClick={handleSaveInvoice}
                            disabled={isSaving}
                            className="px-4 py-2 w-28 flex justify-center items-center rounded-lg text-white font-semibold bg-green-600 hover:bg-green-700 transition-colors disabled:bg-green-400 disabled:cursor-not-allowed"
                        >
                            {isSaving ? <Spinner /> : translations.saveInvoice}
                        </button>
                    </div>
                </div>
                {processingError && <p className="mb-4 text-sm text-center font-medium text-red-600 dark:text-red-400 p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">{processingError}</p>}
                <InvoiceTable 
                    invoices={[newlyExtractedInvoice]} translations={translations} currency={currency} language={lang}
                    onInvoiceDoubleClick={() => {}} onDeleteClick={() => {}} onViewClick={handleViewInvoiceFile} onTogglePaymentStatus={() => {}}
                    columnVisibility={{ ...columnVisibility, actions: false, uploader: false }}
                />
            </section>
        )}

        <section className="p-6 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
                <h2 className="text-xl font-semibold">{translations.savedInvoices}</h2>
                <div className="flex items-center gap-4">
                  {viewMode === 'list' && (
                    <div className="relative" ref={colsDropdownRef}>
                        <button onClick={() => setIsColsDropdownOpen(prev => !prev)} className="px-4 py-2 flex items-center gap-2 rounded-lg text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors border border-slate-300 dark:border-slate-700">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" /></svg>
                            {translations.columns}
                        </button>
                        {isColsDropdownOpen && (
                            <div className="absolute top-full end-0 mt-2 w-56 rounded-xl shadow-2xl bg-white dark:bg-slate-800 ring-1 ring-black ring-opacity-5 z-20 p-2">
                                {ALL_COLUMNS.filter(key => key !== 'actions').map(colKey => (
                                    <label key={colKey} className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md cursor-pointer">
                                        <input type="checkbox" checked={columnVisibility[colKey]} onChange={() => setColumnVisibility(prev => ({...prev, [colKey]: !prev[colKey]}))} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                        {translations[colKey] || colKey}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                  )}
                  <ViewModeToggle value={viewMode} onChange={setViewMode} translations={translations} />
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 mb-6">
                    <input type="text" placeholder={translations.searchPlaceholder} value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        className="w-full sm:w-auto flex-grow px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full sm:w-auto px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full sm:w-auto px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    <input
                        type="number"
                        placeholder={translations.minAmount}
                        value={minAmount}
                        onChange={e => setMinAmount(e.target.value)}
                        className="w-full sm:w-28 px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        aria-label={translations.minAmount}
                    />
                    <input
                        type="number"
                        placeholder={translations.maxAmount}
                        value={maxAmount}
                        onChange={e => setMaxAmount(e.target.value)}
                        className="w-full sm:w-28 px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        aria-label={translations.maxAmount}
                    />
                    <StatusPillFilter value={statusFilter} onChange={setStatusFilter} translations={translations} lang={lang} />
                    <button onClick={handleClearFilters} className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors">{translations.clearFilters}</button>
            </div>
            
            {invoices.length > 0 ? (
                viewMode === 'list' ? (
                  <InvoiceTable 
                      invoices={filteredInvoices} translations={translations} currency={currency} language={lang}
                      onInvoiceDoubleClick={(invoice) => setInvoiceToView(invoice)} onDeleteClick={(id) => setInvoiceToDelete(id)}
                      onViewClick={handleViewInvoiceFile} onTogglePaymentStatus={handleTogglePaymentStatus}
                      columnVisibility={columnVisibility}
                  />
                ) : (
                  <InvoiceGrid
                      invoices={filteredInvoices} translations={translations} currency={currency} language={lang}
                      onInvoiceClick={(invoice) => setInvoiceToView(invoice)} onDeleteClick={(id) => setInvoiceToDelete(id)}
                      onViewClick={handleViewInvoiceFile} onTogglePaymentStatus={handleTogglePaymentStatus}
                  />
                )
            ) : (
                <p className="text-center text-slate-500 dark:text-slate-400 py-8">{translations.noInvoices}</p>
            )}
        </section>

        <ConfirmationModal 
            isOpen={!!invoiceToDelete} onClose={() => setInvoiceToDelete(null)} onConfirm={handleDeleteInvoice}
            title={translations.deleteConfirmTitle} message={translations.deleteConfirmMessage}
            confirmText={translations.delete} cancelText={translations.cancel}
        />

        {invoiceToView && (
            <InvoiceDetailModal 
                isOpen={!!invoiceToView} onClose={() => setInvoiceToView(null)} invoice={invoiceToView}
                translations={translations} currency={currency} language={lang}
            />
        )}
        
        {invoiceFileToView && (
            <FileViewerModal 
                isOpen={!!invoiceFileToView} onClose={() => setInvoiceFileToView(null)}
                fileBase64={invoiceFileToView.base64} mimeType={invoiceFileToView.mimeType}
                translations={translations}
            />
        )}
    </div>
  );
};

export default DashboardScreen;