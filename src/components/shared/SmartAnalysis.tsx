
import React, { useState, useMemo } from 'react';
import type { Invoice, Translations, Language, Anomaly, KPIResult } from '../../types';
import * as geminiService from '../../services/geminiService';
import Spinner from './Spinner';

interface SmartAnalysisProps {
  invoices: Invoice[];
  translations: Translations;
  language: Language;
}

const SmartAnalysis: React.FC<SmartAnalysisProps> = ({ invoices, translations, language }) => {
  // --- Summary State ---
  const [showSummary, setShowSummary] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

  // --- Anomalies State ---
  const [showAnomalies, setShowAnomalies] = useState(false);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [isAnomaliesLoading, setIsAnomaliesLoading] = useState(false);

  // --- KPI State ---
  const [kpiQuery, setKpiQuery] = useState('');
  const [kpiResult, setKpiResult] = useState<KPIResult | null>(null);
  const [isKpiLoading, setIsKpiLoading] = useState(false);

  // --- Chart State ---
  const [showChart, setShowChart] = useState(true);
  const [xAxis, setXAxis] = useState<'vendorName' | 'invoiceDate' | 'paymentStatus'>('vendorName');

  // --- Handlers ---
  const handleGenerateSummary = async () => {
    if (summaryText) {
        setShowSummary(true);
        return;
    }
    setIsSummaryLoading(true);
    setShowSummary(true);
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
      if (anomalies.length > 0 && showAnomalies) {
          return; // Already loaded
      }
      setIsAnomaliesLoading(true);
      setShowAnomalies(true);
      try {
          const result = await geminiService.detectAnomalies(invoices, language);
          setAnomalies(result);
      } catch (e) {
          console.error(e);
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
        // Simplify date to month/year if needed, for now exact date
        if (xAxis === 'invoiceDate') {
            key = key.substring(0, 7); // YYYY-MM
        }
        if (!key) key = "Unknown";
        
        dataMap.set(key, (dataMap.get(key) || 0) + inv.totalAmount);
    });

    const data = Array.from(dataMap.entries()).map(([label, value]) => ({ label, value }));
    // Sort by value desc
    return data.sort((a, b) => b.value - a.value).slice(0, 7); // Top 7
  }, [invoices, xAxis]);
  
  const maxChartValue = Math.max(...chartData.map(d => d.value), 1);

  return (
    <div className="space-y-6">
      
      {/* 1. AI Summary Section */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 dark:text-slate-100">{translations.aiSummary}</h3>
            <button 
                onClick={() => showSummary ? setShowSummary(false) : handleGenerateSummary()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
            >
                {showSummary ? translations.hideSummary : translations.showSummary}
            </button>
        </div>
        {showSummary && (
            <div className="p-6 text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-800">
                {isSummaryLoading ? (
                    <div className="flex items-center gap-2"><Spinner /> <span className="text-sm">{translations.loading}</span></div>
                ) : (
                    <p>{summaryText}</p>
                )}
            </div>
        )}
      </div>

      {/* 2. Anomaly Detection Section */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-800 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 dark:text-slate-100">{translations.anomalyDetection}</h3>
            <button 
                onClick={() => showAnomalies ? setShowAnomalies(false) : handleDetectAnomalies()}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-sm font-medium transition-colors"
            >
                {showAnomalies ? translations.hideAnomalies : translations.showAnomalies}
            </button>
        </div>
        {showAnomalies && (
            <div className="p-6 bg-white dark:bg-slate-800">
                {isAnomaliesLoading ? (
                     <div className="flex items-center gap-2"><Spinner /> <span className="text-sm">{translations.loading}</span></div>
                ) : anomalies.length === 0 ? (
                    <div className="text-green-600 font-medium flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                        {translations.noAnomaliesFound}
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {anomalies.map((anom, idx) => (
                            <li key={idx} className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-100 dark:border-red-900/50">
                                <span className={`shrink-0 w-2 h-2 mt-2 rounded-full ${anom.severity === 'high' ? 'bg-red-600' : 'bg-amber-500'}`}></span>
                                <div>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">{anom.issue}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{translations.invoiceNumber}: {anom.invoiceNumber}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        )}
      </div>

      {/* 3. KPI Generator Section */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2">{translations.kpiGenerator}</h3>
            <div className="flex gap-2">
                <input 
                    type="text" 
                    value={kpiQuery}
                    onChange={(e) => setKpiQuery(e.target.value)}
                    placeholder={translations.kpiPlaceholder}
                    className="flex-grow px-4 py-2 border border-slate-300 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
                <button 
                    onClick={() => handleGenerateKPI()}
                    disabled={isKpiLoading}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium disabled:opacity-50"
                >
                    {isKpiLoading ? <Spinner /> : translations.generateKpiPrompt}
                </button>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                <button onClick={() => handleGenerateKPI("Total unpaid invoices")} className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full whitespace-nowrap">{translations.suggestMore}</button>
                {/* Add fake suggestions for UI demo from screenshot */}
            </div>
        </div>
        {kpiResult && (
            <div className="p-6 bg-indigo-50/50 dark:bg-indigo-900/20 flex flex-col items-center justify-center animate-fade-in-up">
                <span className="text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wide font-semibold">{kpiResult.label}</span>
                <span className="text-4xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-2">{kpiResult.value}</span>
            </div>
        )}
      </div>

       {/* 4. Data Visualization Chart */}
       <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 flex justify-between items-center border-b border-slate-100 dark:border-slate-700">
            <h3 className="font-bold text-slate-800 dark:text-slate-100">{translations.dataVisualization}</h3>
            <button onClick={() => setShowChart(!showChart)} className="text-sm text-blue-600 hover:underline">
                {showChart ? translations.hideChart : translations.show}
            </button>
        </div>
        {showChart && (
            <div className="p-6">
                <div className="flex gap-4 mb-6">
                    <div className="flex-1">
                        <label className="text-xs font-semibold text-slate-500 mb-1 block">{translations.chartXAxis}</label>
                        <select 
                            value={xAxis} 
                            onChange={(e) => setXAxis(e.target.value as any)}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-sm"
                        >
                            <option value="vendorName">{translations.axisVendor}</option>
                            <option value="invoiceDate">{translations.axisDate}</option>
                            <option value="paymentStatus">{translations.axisStatus}</option>
                        </select>
                    </div>
                    <div className="flex-1">
                         <label className="text-xs font-semibold text-slate-500 mb-1 block">{translations.chartYAxis}</label>
                         <select disabled className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 text-sm cursor-not-allowed">
                            <option>{translations.axisTotal}</option>
                        </select>
                    </div>
                </div>

                {/* Simple CSS Bar Chart */}
                <div className="space-y-4">
                    {chartData.map((item, idx) => (
                        <div key={idx} className="relative">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="font-medium truncate max-w-[150px]" title={item.label}>{item.label}</span>
                                <span className="font-bold">{item.value.toLocaleString()}</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-4 overflow-hidden">
                                <div 
                                    className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-out"
                                    style={{ width: `${(item.value / maxChartValue) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    ))}
                    {chartData.length === 0 && <p className="text-center text-slate-500 py-8">No data available to chart.</p>}
                </div>
            </div>
        )}
       </div>

    </div>
  );
};

export default SmartAnalysis;
