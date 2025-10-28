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
    // When the modal is open and we have the necessary data, create an object URL.
    if (isOpen && fileBase64 && mimeType) {
        // The base64 string might include the data URL prefix, remove it.
        const pureBase64 = fileBase64.split(',')[1] || fileBase64;
        const blob = base64toBlob(pureBase64, mimeType);
        const url = URL.createObjectURL(blob);
        setObjectUrl(url);

        // Cleanup function to revoke the object URL when the component unmounts
        // or when the source data changes, preventing memory leaks.
        return () => {
            URL.revokeObjectURL(url);
            setObjectUrl(null);
        };
    }
  }, [isOpen, fileBase64, mimeType]);

  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center p-4" 
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="file-viewer-title"
    >
      <div 
        className="relative glass-pane w-full max-w-4xl h-[90vh] flex flex-col" 
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-white/20 dark:border-slate-700/50 flex justify-between items-center flex-shrink-0">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white" id="file-viewer-title">
            {translations.invoiceFile}
          </h3>
          <button onClick={onClose} className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="p-4 flex-grow overflow-auto bg-slate-100/50 dark:bg-slate-900/50 flex items-center justify-center rounded-b-2xl">
            {!objectUrl && <p className="text-slate-500">{translations.loading}...</p>}
            
            {objectUrl && mimeType.startsWith('image/') && (
                <img src={objectUrl} alt={translations.invoiceFile} className="max-w-full max-h-full mx-auto object-contain rounded-lg" />
            )}
            
            {objectUrl && mimeType === 'application/pdf' && (
                <iframe src={objectUrl} title={translations.invoiceFile} className="w-full h-full border-0 rounded-lg" />
            )}

            {objectUrl && !mimeType.startsWith('image/') && mimeType !== 'application/pdf' && (
                <div className="text-center text-slate-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <p className="mt-2">Unsupported file type: {mimeType}</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default FileViewerModal;