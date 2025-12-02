
import React, { useState, useEffect } from 'react';
import type { Translations } from '../../types';

interface FileViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileBase64: string;
  mimeType: string;
  translations: Translations;
}

// Helper function to convert a base64 string to a Blob
const base64toBlob = (base64Data: string, contentType: string = ''): Blob => {
    const sliceSize = 512;
    const byteCharacters = atob(base64Data);
    const byteArrays: Uint8Array[] = [];

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        const slice = byteCharacters.slice(offset, offset + sliceSize);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type: contentType });
}


const FileViewerModal: React.FC<FileViewerModalProps> = ({ isOpen, onClose, fileBase64, mimeType, translations }) => {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && fileBase64 && mimeType) {
        const pureBase64 = fileBase64.split(',')[1] || fileBase64;
        const blob = base64toBlob(pureBase64, mimeType);
        const url = URL.createObjectURL(blob);
        setObjectUrl(url);

        return () => {
            URL.revokeObjectURL(url);
            setObjectUrl(null);
        };
    }
  }, [isOpen, fileBase64, mimeType]);

  const handleDownload = () => {
    if (objectUrl) {
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `invoice-file.${mimeType.split('/')[1]}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 z-[60] flex flex-col bg-slate-900/95 backdrop-blur-sm animate-fade-in-up"
        role="dialog"
        aria-modal="true"
    >
      {/* Header Toolbar */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-700 shadow-md z-10">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
           {translations.invoiceFile}
        </h3>
        
        <div className="flex items-center gap-3">
             {/* Download Button */}
             <button 
                onClick={handleDownload}
                className="p-2 rounded-full text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                title="Download"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            </button>

            {/* Close Button */}
            <button 
                onClick={onClose} 
                className="p-2 rounded-full text-slate-300 hover:text-white hover:bg-red-500/20 hover:text-red-500 transition-colors"
                title={translations.close}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-grow flex items-center justify-center p-4 overflow-hidden relative bg-black/50" onClick={onClose}>
        
        {/* The actual file container - stops click propagation so clicking image doesn't close modal */}
        <div className="w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
             {!objectUrl && (
                <div className="flex flex-col items-center text-white">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mb-4"></div>
                    <p>{translations.loading}...</p>
                </div>
            )}
            
            {objectUrl && mimeType.startsWith('image/') && (
                <img 
                    src={objectUrl} 
                    alt={translations.invoiceFile} 
                    className="max-w-full max-h-full object-contain shadow-2xl rounded-lg" 
                />
            )}
            
            {objectUrl && mimeType === 'application/pdf' && (
                <iframe 
                    src={objectUrl} 
                    title={translations.invoiceFile} 
                    className="w-full h-full bg-white rounded-lg shadow-2xl border-0" 
                />
            )}

            {objectUrl && !mimeType.startsWith('image/') && mimeType !== 'application/pdf' && (
                <div className="text-center text-slate-300 bg-slate-800 p-8 rounded-xl shadow-lg border border-slate-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 mb-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <p className="text-lg font-semibold">Unsupported file type for preview</p>
                    <p className="text-sm text-slate-500 mb-4">{mimeType}</p>
                    <button onClick={handleDownload} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors">
                        Download File
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default FileViewerModal;
