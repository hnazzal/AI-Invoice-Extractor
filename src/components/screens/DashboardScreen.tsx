
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

// Helper to read Excel file and convert to CSV string
const readExcelFile = async (file: File): Promise<string> => {
    const data = await file.arrayBuffer();
    const workbook = read(data);
    // Use the first sheet
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    // Convert to CSV text
    return utils.sheet_to_csv(sheet);
};

// Helper to read Word file and extract raw text
const readWordFile = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
};

const SummaryCard = ({ title, value, icon, gradient, titleColor = "text-white/90" }) => (
  <div className={`relative p-5 rounded-2xl overflow-hidden text-white transition-transform transform hover:scale-105 duration-300 shadow-lg ${gradient}`}>
    <div className="absolute -top-4 -right-4 w-20 h-20 text-white/10">{icon}</div>
    <div className="relative z-10">
      <p className={`text-xs font-semibold uppercase tracking-wider ${titleColor}`}>{title}</p>
      <p className="text-2xl lg:text-3xl font-bold mt-1 truncate" title={String(value)}>{value}</p>
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

// Update UploadOptionCard to accept className for grid spanning
const UploadOptionCard = ({ icon, title, subtitle, onClick, className = "" }) => (
    <div 
        onClick={onClick}
        className={`flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-300 cursor-pointer text-center group h-full min-h-[140px] ${className}`}
    >
        <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700/50 rounded-full flex items-center justify-center mb-3 transition-colors duration-300 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50">
            {icon}
        </div>
        <h3 className="font-semibold text-sm md:text-base text-slate-800 dark:text-slate-200 leading-tight">{title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 hidden sm:block">{subtitle}</p>
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
  const [processingError, setProcessingError] = useState('');
  const [newlyExtractedInvoice, setNewlyExtractedInvoice] = useState<Invoice | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
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
  
  // Separate Refs for different upload types
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

      // Determine processing strategy based on file type
      if (fileType === 'application/pdf' || fileType.startsWith('image/')) {
          // Standard Image/PDF processing (Vision)
          const base64String = await fileToBase64(file);
          const pureBase64 = base64String.split(',')[1];
          extractedData = await geminiService.extractInvoiceDataFromFile(pureBase64, file.type);
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv') || fileType.includes('spreadsheet') || fileType.includes('excel')) {
          // Excel processing (Client-side parse -> Text)
          const textData = await readExcelFile(file);
          extractedData = await geminiService.extractInvoiceDataFromText(textData);
          // Attach minimal file info since we can't easily view binary excel in the modal without more work
          extractedData.sourceFileMimeType = fileType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      } else if (fileName.endsWith('.docx') || fileType.includes('wordprocessing')) {
          // Word processing (Client-side parse -> Text)
          const textData = await readWordFile(file);
          extractedData = await geminiService.extractInvoiceDataFromText(textData);
          extractedData.sourceFileMimeType = fileType || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      } else {
          throw new Error("Unsupported file type. Please upload PDF, Image, Excel, or Word documents.");
      }
      
      setNewlyExtractedInvoice({
        ...extractedData,
        // For non-image/pdf files, we assume we processed text, so we might not have a displayable base64
        // But we try to attach one if possible for saving, or handle viewing gracefully later.
        sourceFileBase64: (await fileToBase64(file)).split(',')[1],
        sourceFileMimeType: file.type,
      });

    } catch (error: any) {
      // Use the specific error message from the backend if available, otherwise use the translation
      const errorMessage = error.message || translations.extractionError;
      setProcessingError(errorMessage);
      console.error(error);
    } finally {
      setIsProcessing(false);
      // Reset all inputs
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
  
  // --- Camera Logic ---
  useEffect(() => {
      let stream: MediaStream | null = null;
      const startCamera = async () => {
          if (isCameraOpen && videoRef.current) {
              try {
                  stream = await navigator.mediaDevices.getUserMedia({ 
                      video: { 
                          facingMode: 'environment',
                          width: { ideal: 1920 },
                          height: { ideal: 1080 } 
                      } 
                  });
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
      // Disable scrolling on body when camera is open
      document.body.style.overflow = 'hidden';
  };

  const handleCloseCamera = () => {
      setIsCameraOpen(false);
      setCapturedImage(null);
      // Re-enable scrolling
      document.body.style.overflow = '';
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video stream
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
    
    try {
        const savedInvoice = await dbService.saveInvoiceForUser(user, newlyExtractedInvoice);
        setInvoices(prevInvoices => [{...savedInvoice, uploaderEmail: user.email }, ...prevInvoices]);
        setNewlyExtractedInvoice(null);
    } catch (error) {
        console.error("Failed to save invoice:", error);
    }
  };

  const handleSaveManualInvoice = async (invoiceToSave: Invoice) => {
    try {
        const savedInvoice = await dbService.saveInvoiceForUser(user, invoiceToSave);
        setInvoices(prev => [{...savedInvoice, uploaderEmail: user.email }, ...prev]);
        setIsManualEntryOpen(false);
    } catch (error: any) {
        console.error("Failed to save manual invoice:", error);
        throw error;
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

  const handleDeleteSelected = async () => {
    if (selectedInvoiceIds.size === 0) return;

    try {
        await dbService.deleteMultipleInvoicesForUser(user.token, Array.from(selectedInvoiceIds));
        setInvoices(prev => prev.filter(inv => !inv.id || !selectedInvoiceIds.has(inv.id)));
        setSelectedInvoiceIds(new Set()); // Clear selection
    } catch (error) {
        console.error("Failed to delete selected invoices:", error);
    } finally {
        setIsDeleteSelectedConfirmOpen(false);
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

        return matchesSearch && matchesDate && matchesStatus;
    });
  }, [invoices, searchTerm, dateFrom, dateTo, statusFilter]);
  
  const [columnVisibility, setColumnVisibility] = useState<Record<ColumnKey, boolean>>({
      invoiceNumber: true, invoiceDate: true, vendorName: true, customerName: true,
      paymentStatus: true, items: false, totalAmount: true, uploader: false, actions: true,
  });

  const handleClearFilters = () => {
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
    setStatusFilter('all');
    setSelectedInvoiceIds(new Set());
  };
  
  const handleExportToExcel = () => {
      // 1. Format Data
      const dataToExport = filteredInvoices.map(inv => ({
          [translations.invoiceNumber]: inv.invoiceNumber,
          [translations.vendorName]: inv.vendorName,
          [translations.customerName]: inv.customerName,
          [translations.invoiceDate]: inv.invoiceDate,
          [translations.totalAmount]: inv.totalAmount,
          [translations.paymentStatus]: translations[inv.paymentStatus] || inv.paymentStatus,
          [translations.items]: inv.items.map(i => `${i.description} (${i.quantity})`).join(', '),
          [translations.uploader]: inv.uploaderEmail
      }));

      // 2. Create Sheet
      const ws = utils.json_to_sheet(dataToExport);
      
      // 3. Auto-width columns (simple estimation)
      const wscols = Object.keys(dataToExport[0] || {}).map(() => ({ wch: 25 }));
      ws['!cols'] = wscols;

      // 4. Create Workbook
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "Invoices");

      // 5. Download
      writeFile(wb, `invoices_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const formatCurrency = useCallback((amount: number) => {
      const locale = lang === 'ar' ? 'ar-JO' : 'en-US';
      return new Intl.NumberFormat(locale, { currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  }, [currency, lang]);

  // --- Statistics Calculations ---
  const totalAmount = useMemo(() => invoices.reduce((sum, inv) => sum + inv.totalAmount, 0), [invoices]);
  const unpaidAmount = useMemo(() => invoices.filter(inv => inv.paymentStatus === 'unpaid').reduce((sum, inv) => sum + inv.totalAmount, 0), [invoices]);

  const topVendor = useMemo(() => {
    if (invoices.length === 0) return '-';
    const vendorMap = new Map<string, number>();
    invoices.forEach(inv => {
      const name = inv.vendorName || 'Unknown';
      vendorMap.set(name, (vendorMap.get(name) || 0) + inv.totalAmount);
    });
    let maxName = '-';
    let maxVal = 0;
    vendorMap.forEach((val, key) => {
      if (val > maxVal) {
        maxVal = val;
        maxName = key;
      }
    });
    return maxName;
  }, [invoices]);

  const topItem = useMemo(() => {
    if (invoices.length === 0) return '-';
    const itemMap = new Map<string, number>();
    invoices.forEach(inv => {
      inv.items.forEach(item => {
         const name = item.description.trim();
         if(!name) return;
         // Based on Quantity
         itemMap.set(name, (itemMap.get(name) || 0) + item.quantity);
      });
    });
    let maxName = '-';
    let maxVal = 0;
    itemMap.forEach((val, key) => {
      if (val > maxVal) {
        maxVal = val;
        maxName = key;
      }
    });
    // Truncate if too long
    return maxName.length > 20 ? maxName.substring(0, 18) + '..' : maxName;
  }, [invoices]);

  return (
    <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
             <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100">{translations.dashboardTitle}</h1>
        </div>
        
        {/* Updated Summary Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* 1. Total Invoices */}
            <SummaryCard 
                title={translations.totalInvoices} 
                value={invoices.length} 
                gradient="bg-gradient-to-br from-slate-600 to-slate-800" 
                icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>} 
            />
            {/* 2. Grand Total */}
            <SummaryCard 
                title={translations.grandTotal} 
                value={formatCurrency(totalAmount)} 
                gradient="bg-gradient-to-br from-indigo-500 to-blue-600" 
                icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.75A.75.75 0 013 4.5h.75m0 0a9 9 0 0118 0m-9 7.5h1.5m-1.5 0h.375m-1.125 0h.375m-1.125 0h.375M9 12v9.75M15 12v9.75M21 12v9.75M2.25 6h19.5" /></svg>} 
            />
             {/* 3. Total Unpaid (Value) */}
             <SummaryCard 
                title={translations.totalUnpaidAmount} 
                value={formatCurrency(unpaidAmount)} 
                gradient="bg-gradient-to-br from-amber-500 to-orange-600" 
                icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>} 
            />
             {/* 4. Top Vendor */}
             <SummaryCard 
                title={translations.topVendorStat} 
                value={topVendor} 
                gradient="bg-gradient-to-br from-fuchsia-600 to-purple-700" 
                icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72l1.189-1.19A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" /></svg>} 
            />
            {/* 5. Top Item */}
             <SummaryCard 
                title={translations.topItemStat} 
                value={topItem} 
                gradient="bg-gradient-to-br from-teal-500 to-emerald-600" 
                icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" /></svg>} 
            />
        </section>

        {/* Upload/Add Invoice Section */}
        <section className="p-6 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold mb-4">{translations.uploadBoxTitle}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{translations.uploadBoxSubtitle}</p>

            {isProcessing ? (
                <ProcessingLoader translations={translations} />
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                     {/* 1. Upload Document */}
                     <UploadOptionCard
                        onClick={() => docInputRef.current?.click()}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                        title={translations.uploadDocument}
                        subtitle={translations.docSubtitle}
                    />

                     {/* 2. Upload Image */}
                     <UploadOptionCard
                        onClick={() => imgInputRef.current?.click()}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                        title={translations.uploadImage}
                        subtitle={translations.imgSubtitle}
                    />
                    
                     {/* 3. From Scanner */}
                     <UploadOptionCard
                        onClick={() => scannerInputRef.current?.click()}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>}
                        title={translations.fromScanner}
                        subtitle={translations.chooseFile}
                    />

                    {/* Inputs */}
                    <input
                        ref={docInputRef} type="file" onChange={handleFileChange}
                        accept="application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        className="hidden"
                    />
                     <input
                        ref={imgInputRef} type="file" onChange={handleFileChange}
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                    />
                     <input
                        ref={scannerInputRef} type="file" onChange={handleFileChange}
                        accept="image/*,application/pdf"
                        capture="environment"
                        className="hidden"
                    />
                     
                     {/* 4. Camera */}
                     <UploadOptionCard
                        onClick={handleOpenCamera}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                        title={translations.scanWithCamera}
                        subtitle={translations.capture}
                    />
                    
                    {/* 5. Manual - Span 2 columns on mobile to look centered/better */}
                    <UploadOptionCard
                        onClick={() => setIsManualEntryOpen(true)}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>}
                        title={translations.addManually}
                        subtitle={translations.manualInvoiceEntry}
                        className="col-span-2 md:col-span-1"
                    />
                </div>
            )}
            {processingError && <p className="mt-4 text-sm text-red-500 font-medium bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">{processingError}</p>}
        </section>

        {/* Camera Overlay Portal - Renders outside of Dashboard/App stacking context */}
        {isCameraOpen && createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black">
                <div className="relative w-full h-full max-w-lg mx-auto bg-black flex flex-col">
                    <video ref={videoRef} autoPlay playsInline className={`w-full flex-grow object-cover ${capturedImage ? 'hidden' : 'block'}`}></video>
                    {capturedImage && <img src={capturedImage} alt="Captured" className="w-full flex-grow object-contain bg-black" />}
                    <canvas ref={canvasRef} className="hidden"></canvas>
                    
                    {/* Top Bar */}
                    <div className="absolute top-0 left-0 right-0 p-6 flex justify-end z-10 bg-gradient-to-b from-black/60 to-transparent">
                        <button onClick={handleCloseCamera} className="text-white bg-black/30 hover:bg-black/50 rounded-full p-2 backdrop-blur-md border border-white/10">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    {/* Bottom Controls */}
                    <div className="absolute bottom-0 left-0 right-0 p-8 pb-12 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex justify-center items-center gap-8 z-10">
                        {capturedImage ? (
                            <>
                                <button onClick={handleRetake} className="px-6 py-3 text-white bg-slate-700 hover:bg-slate-600 rounded-full font-medium backdrop-blur-md border border-slate-500/50 shadow-lg">{translations.retake}</button>
                                <button onClick={handleUsePhoto} className="px-6 py-3 text-white bg-indigo-600 hover:bg-indigo-500 rounded-full font-medium shadow-lg shadow-indigo-500/30">{translations.usePhoto}</button>
                            </>
                        ) : (
                            <button 
                                onClick={handleCapture} 
                                className="w-20 h-20 rounded-full bg-white border-[6px] border-slate-300/50 shadow-[0_0_20px_rgba(255,255,255,0.4)] active:scale-95 transition-transform" 
                                aria-label={translations.capture}
                            ></button>
                        )}
                    </div>
                    {cameraError && <p className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center text-sm text-red-500 bg-black/70 px-4 py-2 rounded-lg backdrop-blur-md z-20 border border-red-500/30">{cameraError}</p>}
                </div>
            </div>,
            document.body
        )}

        {newlyExtractedInvoice && !isProcessing && (
            <section className="p-6 bg-green-50/50 dark:bg-green-900/20 rounded-2xl shadow-lg border border-green-200 dark:border-green-700/50 opacity-0 animate-fade-in-up">
                <div className="flex justify-between items-center mb-4">
                     <div className="flex items-center gap-4">
                        <h2 className="text-xl font-semibold text-green-800 dark:text-green-300">{translations.newlyExtractedInvoices}</h2>
                        {newlyExtractedInvoice.processingCost !== undefined && (
                             <span className="hidden sm:inline-block text-xs font-mono bg-white/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 px-2 py-1 rounded border border-slate-200 dark:border-slate-700" title="Estimated AI Processing Cost">
                                {translations.processingCost}: ${newlyExtractedInvoice.processingCost.toFixed(6)}
                             </span>
                         )}
                     </div>
                    <div className="flex gap-2">
                        <button onClick={() => setNewlyExtractedInvoice(null)} className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors">{translations.cancel}</button>
                        <button onClick={handleSaveInvoice} className="px-4 py-2 rounded-lg text-white font-semibold bg-green-600 hover:bg-green-700 transition-colors">{translations.saveInvoice}</button>
                    </div>
                </div>
                {newlyExtractedInvoice.processingCost !== undefined && (
                     <div className="sm:hidden mb-4">
                         <span className="text-xs font-mono bg-white/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                            {translations.processingCost}: ${newlyExtractedInvoice.processingCost.toFixed(6)}
                         </span>
                     </div>
                 )}
                <InvoiceTable 
                    invoices={[newlyExtractedInvoice]} translations={translations} currency={currency} language={lang}
                    onInvoiceDoubleClick={() => {}} onDeleteClick={() => {}} onViewClick={handleViewInvoiceFile} onTogglePaymentStatus={() => {}}
                    columnVisibility={{ ...columnVisibility, actions: false, uploader: false }}
                    selectedInvoiceIds={new Set()} onSelectionChange={() => {}}
                />
            </section>
        )}

        {/* Saved Invoices Section */}
        <section className="p-6 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
                <h2 className="text-xl font-semibold">{translations.savedInvoices}</h2>
                <div className="flex flex-wrap items-center gap-4">
                    <input type="text" placeholder={translations.searchPlaceholder} value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        className="w-full sm:w-auto px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full sm:w-auto px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full sm:w-auto px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    <StatusPillFilter value={statusFilter} onChange={setStatusFilter} translations={translations} lang={lang} />
                    
                     <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                        <button 
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-slate-600 shadow text-indigo-600 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-500'}`}
                            title={translations.listView}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                        </button>
                        <button 
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-slate-600 shadow text-indigo-600 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-500'}`}
                            title={translations.gridView}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                        </button>
                    </div>

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
                    
                    <button onClick={handleExportToExcel} className="px-4 py-2 flex items-center gap-2 rounded-lg text-green-700 dark:text-green-400 font-medium hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors border border-green-200 dark:border-green-800">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        {translations.exportToExcel}
                    </button>

                    <button onClick={handleClearFilters} className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors">{translations.clearFilters}</button>
                </div>
            </div>
            
            {selectedInvoiceIds.size > 0 && (
                <div className="flex items-center gap-4 mb-4 p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                    <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                        {translations.countSelected.replace('{count}', selectedInvoiceIds.size.toString())}
                    </span>
                    <button 
                        onClick={() => setIsDeleteSelectedConfirmOpen(true)}
                        className="px-4 py-2 flex items-center gap-2 text-sm font-semibold text-red-600 bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900 rounded-lg"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                        {translations.deleteSelected}
                    </button>
                </div>
            )}

            {invoices.length > 0 ? (
                viewMode === 'list' ? (
                    <InvoiceTable 
                        invoices={filteredInvoices} translations={translations} currency={currency} language={lang}
                        onInvoiceDoubleClick={(invoice) => setInvoiceToView(invoice)} onDeleteClick={(id) => setInvoiceToDelete(id)}
                        onViewClick={handleViewInvoiceFile} onTogglePaymentStatus={handleTogglePaymentStatus}
                        columnVisibility={columnVisibility}
                        selectedInvoiceIds={selectedInvoiceIds}
                        onSelectionChange={setSelectedInvoiceIds}
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

        {/* Smart Analysis Section - Moved to Bottom */}
        {invoices.length > 0 && (
             <SmartAnalysis invoices={invoices} translations={translations} language={lang} />
        )}

        <Chatbot invoices={invoices} translations={translations} language={lang} />

        <ConfirmationModal 
            isOpen={!!invoiceToDelete} onClose={() => setInvoiceToDelete(null)} onConfirm={handleDeleteInvoice}
            title={translations.deleteConfirmTitle} message={translations.deleteConfirmMessage}
            confirmText={translations.delete} cancelText={translations.cancel}
        />

        <ConfirmationModal 
            isOpen={isDeleteSelectedConfirmOpen}
            onClose={() => setIsDeleteSelectedConfirmOpen(false)}
            onConfirm={handleDeleteSelected}
            title={translations.deleteConfirmTitle}
            message={translations.deleteSelectedConfirmMessage.replace('{count}', selectedInvoiceIds.size.toString())}
            confirmText={translations.delete}
            cancelText={translations.cancel}
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
        <ManualInvoiceModal
            isOpen={isManualEntryOpen}
            onClose={() => setIsManualEntryOpen(false)}
            onSave={handleSaveManualInvoice}
            translations={translations}
            currency={currency}
            language={lang}
        />
    </div>
  );
};

export default DashboardScreen;
