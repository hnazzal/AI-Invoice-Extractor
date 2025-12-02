
import React, { useState, useEffect, useMemo } from 'react';
import type { User, Invoice, Translations, Currency, Language, UserProfile } from '../../types';
import * as dbService from '../../services/dbService';
import InvoiceTable from '../shared/InvoiceTable';
import Spinner from '../shared/Spinner';
import FileViewerModal from '../shared/FileViewerModal';
import InvoiceDetailModal from '../shared/InvoiceDetailModal';

interface AdminScreenProps {
  user: User;
  translations: Translations;
  currency: Currency;
  lang: Language;
}

const AdminScreen: React.FC<AdminScreenProps> = ({ user, translations, currency, lang }) => {
  const [activeTab, setActiveTab] = useState<'invoices' | 'users'>('invoices');
  const [isLoading, setIsLoading] = useState(false);
  
  // Data State
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  
  // View/Delete State (reusing components)
  const [invoiceToView, setInvoiceToView] = useState<Invoice | null>(null);
  const [invoiceFileToView, setInvoiceFileToView] = useState<{ base64: string; mimeType: string } | null>(null);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState(new Set<string>());

  useEffect(() => {
      fetchData();
  }, []);

  const fetchData = async () => {
      setIsLoading(true);
      try {
          const [invData, profData] = await Promise.all([
              dbService.getInvoicesForUser(user.token), // RLS returns all for admin
              dbService.getAllProfiles(user.token)
          ]);
          setAllInvoices(invData);
          setProfiles(profData);
      } catch (error) {
          console.error("Failed to fetch admin data", error);
      } finally {
          setIsLoading(false);
      }
  };

  // Helper to delete invoice (Admin power)
  const handleDeleteInvoice = async (id: string) => {
      if(!confirm("Are you sure you want to delete this invoice?")) return;
      try {
          await dbService.deleteInvoiceForUser(user.token, id);
          setAllInvoices(prev => prev.filter(inv => inv.id !== id));
      } catch (e) {
          console.error(e);
      }
  };

  const handleViewInvoiceFile = (invoice: Invoice) => {
    if (invoice.sourceFileBase64 && invoice.sourceFileMimeType) {
        setInvoiceFileToView({ base64: invoice.sourceFileBase64, mimeType: invoice.sourceFileMimeType });
    }
  };

  // Derived stats for Users tab
  const profilesWithStats = useMemo(() => {
      return profiles.map(profile => {
          const userInvoices = allInvoices.filter(inv => inv.uploaderEmail === profile.email);
          const totalSpent = userInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
          return {
              ...profile,
              total_invoices_count: userInvoices.length,
              total_spent: totalSpent
          };
      });
  }, [profiles, allInvoices]);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in-up">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{translations.adminPanel}</h1>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg mt-4 md:mt-0">
                <button 
                    onClick={() => setActiveTab('invoices')}
                    className={`px-4 py-2 rounded-md font-medium transition-all ${activeTab === 'invoices' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}
                >
                    {translations.allInvoices}
                </button>
                <button 
                    onClick={() => setActiveTab('users')}
                    className={`px-4 py-2 rounded-md font-medium transition-all ${activeTab === 'users' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}
                >
                    {translations.userManagement}
                </button>
            </div>
        </div>

        {isLoading ? (
            <div className="flex justify-center py-20"><Spinner /></div>
        ) : (
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
                {activeTab === 'invoices' && (
                    <div className="space-y-4">
                         <h2 className="text-xl font-semibold mb-4">{translations.allInvoices} ({allInvoices.length})</h2>
                         <InvoiceTable 
                            invoices={allInvoices} 
                            translations={translations} 
                            currency={currency} 
                            language={lang}
                            onInvoiceDoubleClick={(invoice) => setInvoiceToView(invoice)} 
                            onDeleteClick={handleDeleteInvoice} 
                            onViewClick={handleViewInvoiceFile} 
                            onTogglePaymentStatus={() => {}} // Read only status for admin? or allow edit? Assuming just view for now
                            columnVisibility={{}}
                            selectedInvoiceIds={selectedInvoiceIds}
                            onSelectionChange={setSelectedInvoiceIds}
                            isAdminView={true}
                        />
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="overflow-x-auto">
                        <h2 className="text-xl font-semibold mb-4">{translations.userManagement}</h2>
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                            <thead className="bg-slate-50 dark:bg-slate-700/50">
                                <tr>
                                    <th className="px-6 py-3 text-start text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">{translations.email}</th>
                                    <th className="px-6 py-3 text-start text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">{translations.companyName}</th>
                                    <th className="px-6 py-3 text-start text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">{translations.role}</th>
                                    <th className="px-6 py-3 text-start text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">{translations.joinedDate}</th>
                                    <th className="px-6 py-3 text-end text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">{translations.invoicesCount}</th>
                                    <th className="px-6 py-3 text-end text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">{translations.totalSpent}</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                                {profilesWithStats.map(profile => (
                                    <tr key={profile.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">{profile.email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{profile.company_name || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${profile.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
                                                {profile.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{new Date(profile.created_at).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-end text-slate-900 dark:text-white">{profile.total_invoices_count}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-end font-mono text-indigo-600 dark:text-indigo-400">
                                            {new Intl.NumberFormat(lang === 'ar' ? 'ar-JO' : 'en-US', { style: 'currency', currency: currency }).format(profile.total_spent || 0)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        )}

        {/* Reusing Viewer Modals */}
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

export default AdminScreen;
