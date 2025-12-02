
import React, { useState, useMemo } from 'react';
import type { Invoice, Translations, Language, Anomaly, KPIResult } from '../../types';
import * as geminiService from '../../services/geminiService';
import Spinner from './Spinner';

interface SmartAnalysisProps {
  invoices: Invoice[];
  translations: Translations;
  language: Language;
}

const AnalysisCard = ({ title, icon, children, className = "" }: { title: string, icon: React.ReactNode, children?: React.ReactNode, className?: string }) => (
    <div className={`bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col ${className}`}>
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-800/50">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                {icon}
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">{title}</h3>
        </div>
        <div className="p-6 flex-grow flex flex-col">
            {children}
        </div>
    </div>
);

const SmartAnalysis: React.FC<SmartAnalysisProps> = ({ invoices, translations, language }) => {
  // --- Summary State ---
  const [summaryText, setSummaryText] = useState('');
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

  // --- Anomalies State ---
  const [anomalies, setAnomalies] = useState<Anomaly[] | null>(null);
  const [isAnomaliesLoading, setIsAnomaliesLoading] = useState(false);

  // --- KPI State ---
  const [kpiQuery, setKpiQuery] = useState('');
  const [kpiResult, setKpiResult] = useState<KPIResult | null>(null);
  const [isKpiLoading, setIsKpiLoading] = useState(false);

  // --- Chart State ---
  const [xAxis, setXAxis] = useState<'vendorName' | 'invoiceDate' | 'paymentStatus'>('vendorName');

  // --- Handlers ---
  const handleGenerateSummary = async () => {
    setIsSummaryLoading(true);
    try {
        const text = await geminiService.generateSummary(invoices, language);
        setSummaryText(text);
    } catch (e) {
        setSummaryText("Failed to generate summary.");
    } finally {
        setIsSummaryLoading(false);
    }
  };

  const handleDetectAnomalies = async () => {
      setIsAnomaliesLoading(true);
      try {
          const result = await geminiService.detectAnomalies(invoices, language);
          setAnomalies(result);
      } catch (e) {
          console.error(e);
          setAnomalies([]);
      } finally {
          setIsAnomaliesLoading(false);
      }
  };

  const handleGenerateKPI = async (query?: string) => {
      const q = query || kpiQuery;
      if (!q.trim()) return;
      
      setIsKpiLoading(true);
      setKpiResult(null);
      try {
          const result = await geminiService.generateKPI(q, invoices, language);
          setKpiResult(result);
      } catch (e) {
          console.error(e);
      } finally {
          setIsKpiLoading(false);
      }
  };

  // --- Chart Logic ---
  const chartData = useMemo(() => {
    const dataMap = new Map<string, number>();
    
    invoices.forEach(inv => {
        let key = inv[xAxis] as string;
        if (xAxis === 'invoiceDate') {
            key = key.substring(0, 7); // YYYY-MM
        }
        if (!key) key = "Unknown";
        
        dataMap.set(key, (dataMap.get(key) || 0) + inv.totalAmount);
    });

    const data = Array.from(dataMap.entries()).map(([label, value]) => ({ label, value }));
    return data.sort((a, b) => b.value - a.value).slice(0, 5); // Top 5 only for cleaner UI
  }, [invoices, xAxis]);
  
  const maxChartValue = Math.max(...chartData.map(d => d.value), 1);
  const chartColors = ['bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-fuchsia-500', 'bg-pink-500'];

  return (
    <div className="space-y-6 animate-fade-in-up">
        <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg text-white shadow-lg shadow-indigo-500/30">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{translations.smartAnalysisTitle}</h2>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. AI Summary */}
        <AnalysisCard 
            title={translations.aiSummary} 
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
        >
            {!summaryText ? (
                <div className="flex flex-col items-center justify-center flex-grow py-8 text-center">
                    <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-xs mx-auto text-sm">
                        Generate a concise executive summary of your spending habits and invoice data using AI.
                    </p>
                    <button 
                        onClick={handleGenerateSummary}
                        disabled={isSummaryLoading}
                        className="group relative inline-flex items-center justify-center px-8 py-3 font-semibold text-white transition-all duration-200 bg-indigo-600 rounded-full hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isSummaryLoading ? <Spinner /> : (
                            <>
                                {translations.generate}
                                <svg className="w-5 h-5 ml-2 -mr-1 group-hover:animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                            </>
                        )}
                    </button>
                </div>
            ) : (
                <div className="relative bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-6 border border-indigo-100 dark:border-indigo-800/50">
                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 rounded-l-xl"></div>
                    <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-sm md:text-base">
                        {summaryText}
                    </p>
                    <div className="mt-4 flex justify-end">
                        <button onClick={() => setSummaryText('')} className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                            {translations.hideSummary}
                        </button>
                    </div>
                </div>
            )}
        </AnalysisCard>

        {/* 2. KPI Generator */}
        <AnalysisCard 
            title={translations.kpiGenerator}
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
        >
             <div className="flex gap-2 mb-4">
                <input 
                    type="text" 
                    value={kpiQuery}
                    onChange={(e) => setKpiQuery(e.target.value)}
                    placeholder={translations.kpiPlaceholder}
                    className="flex-grow px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/50 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
                />
                <button 
                    onClick={() => handleGenerateKPI()}
                    disabled={isKpiLoading || !kpiQuery.trim()}
                    className="px-6 py-2 bg-slate-800 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                    {isKpiLoading ? <Spinner /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>}
                </button>
            </div>
            
            {kpiResult && (
                 <div className="mt-2 p-6 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-2xl text-white shadow-lg shadow-violet-500/20 text-center animate-fade-in-up">
                    <p className="text-white/80 text-sm font-medium uppercase tracking-wider mb-1">{kpiResult.label}</p>
                    <p className="text-4xl font-extrabold">{kpiResult.value}</p>
                </div>
            )}
            
            {!kpiResult && (
                <div className="mt-4">
                     <p className="text-xs font-semibold text-slate-400 mb-2 uppercase">{translations.suggestMore}</p>
                    <div className="flex flex-wrap gap-2">
                        {["Total unpaid invoices", "Average invoice amount", "Spend this month"].map((q, i) => (
                             <button key={i} onClick={() => handleGenerateKPI(q)} className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors border border-slate-200 dark:border-slate-600">
                                {q}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </AnalysisCard>

        {/* 3. Anomaly Detection */}
        <AnalysisCard 
            title={translations.anomalyDetection}
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
        >
             {anomalies === null ? (
                <div className="flex flex-col items-center justify-center flex-grow py-6 text-center">
                    <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-xs mx-auto text-sm">
                        Scan your invoices for potential errors, duplicates, or unusual spending patterns.
                    </p>
                    <button 
                        onClick={handleDetectAnomalies}
                        disabled={isAnomaliesLoading}
                        className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold shadow-lg shadow-amber-500/30 transition-all hover:-translate-y-0.5"
                    >
                         {isAnomaliesLoading ? <Spinner /> : translations.showAnomalies}
                    </button>
                </div>
             ) : anomalies.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-900/50">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center text-green-600 dark:text-green-300 mb-3">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    </div>
                    <p className="text-green-800 dark:text-green-200 font-medium">{translations.noAnomaliesFound}</p>
                </div>
             ) : (
                <div className="space-y-3">
                    {anomalies.map((anom, idx) => (
                        <div key={idx} className="flex gap-4 p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30">
                            <div className={`shrink-0 w-1.5 rounded-full ${anom.severity === 'high' ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{anom.issue}</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{translations.invoiceNumber}: <span className="font-mono bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">{anom.invoiceNumber}</span></p>
                            </div>
                        </div>
                    ))}
                </div>
             )}
        </AnalysisCard>

        {/* 4. Data Visualization Chart */}
        <AnalysisCard 
            title={translations.dataVisualization}
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
        >
             <div className="mb-6">
                <div className="relative">
                     <select 
                        value={xAxis} 
                        onChange={(e) => setXAxis(e.target.value as any)}
                        className="w-full appearance-none px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                        <option value="vendorName">{translations.axisVendor}</option>
                        <option value="invoiceDate">{translations.axisDate}</option>
                        <option value="paymentStatus">{translations.axisStatus}</option>
                    </select>
                     <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center px-4 text-slate-500">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </div>
            </div>

            <div className="space-y-5">
                {chartData.length > 0 ? chartData.map((item, idx) => (
                    <div key={idx} className="group">
                        <div className="flex justify-between text-sm mb-1.5">
                            <span className="font-semibold text-slate-700 dark:text-slate-300 truncate pr-4">{item.label}</span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white">{item.value.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-700/50 rounded-full h-3 overflow-hidden">
                            <div 
                                className={`h-full rounded-full transition-all duration-1000 ease-out group-hover:brightness-110 ${chartColors[idx % chartColors.length]}`}
                                style={{ width: `${(item.value / maxChartValue) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                )) : (
                     <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        <p className="text-sm">No data available for this dimension</p>
                     </div>
                )}
            </div>
        </AnalysisCard>

      </div>
    </div>
  );
};

export default SmartAnalysis;
