import React, { useState } from 'react';
import type { User, Language, Translations, Theme, Currency } from '../../types';
import ToggleSwitch from './ToggleSwitch';

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
  lang: Language;
  setLang: (lang: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  translations: Translations;
  currentScreen?: 'dashboard' | 'admin';
  onNavigate?: (screen: 'dashboard' | 'admin') => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, lang, setLang, theme, setTheme, currency, setCurrency, translations, currentScreen, onNavigate }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const languageOptions = [
    { value: 'ar', label: 'العربية' },
    { value: 'en', label: 'English' },
  ] as const;

  const currencyOptions = [
    { value: 'JOD', label: translations.jod },
    { value: 'USD', label: translations.usd },
  ] as const;
  
  const AppLogo = () => (
    <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onNavigate && onNavigate('dashboard')}>
        <div className="relative w-10 h-10 flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-xl rotate-6 group-hover:rotate-12 transition-transform duration-300"></div>
            <div className="absolute inset-0 bg-white dark:bg-slate-900 rounded-xl border border-white/20 flex items-center justify-center shadow-md">
                <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
            </div>
        </div>
        <div className="flex flex-col">
            <span className="font-extrabold text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">{translations.appName}</span>
            {user?.companyName && (
                <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-500">{user.companyName}</span>
            )}
        </div>
    </div>
  );

  if (!user) {
    return (
        <header className="absolute top-0 w-full z-50 p-6">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                <AppLogo />
            </div>
        </header>
    );
  }

  return (
    <header className="sticky top-4 z-50 mx-4 lg:mx-8 animate-fade-in-up">
      <div className="glass-panel rounded-2xl px-6 h-20 flex items-center justify-between shadow-2xl shadow-indigo-500/10">
          <div className="flex items-center">
             <AppLogo />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-5">
             {user.role === 'admin' && onNavigate && (
                <button
                    onClick={() => onNavigate(currentScreen === 'admin' ? 'dashboard' : 'admin')}
                    className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${
                        currentScreen === 'admin' 
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                >
                    {currentScreen === 'admin' ? translations.backToInvoices : translations.adminPanel}
                </button>
            )}

            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>

            <ToggleSwitch options={languageOptions} value={lang} onChange={(value) => setLang(value as Language)} />
            <ToggleSwitch options={currencyOptions} value={currency} onChange={(value) => setCurrency(value as Currency)} />

            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              {theme === 'light' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              )}
            </button>
             
            <button onClick={onLogout} className="group flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold text-sm hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
              <span>{translations.logout}</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
            
            <div className="flex items-center gap-3 ps-2">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-0.5">
                  <div className="h-full w-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center">
                    <span className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 to-purple-600 uppercase">{user.email.substring(0, 2)}</span>
                  </div>
              </div>
            </div>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="md:hidden flex items-center gap-3">
             <div className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-xs font-bold text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700">
                {user.email.substring(0, 2).toUpperCase()}
            </div>
            <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
                {isMobileMenuOpen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
                )}
            </button>
          </div>
      </div>

      {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
            <div className="md:hidden absolute top-full left-0 right-0 mt-3 glass-panel rounded-2xl p-5 flex flex-col gap-4 animate-fade-in-up z-50 shadow-2xl">
                 <div className="flex flex-col gap-4">
                    {user.role === 'admin' && onNavigate && (
                        <button
                            onClick={() => {
                                onNavigate(currentScreen === 'admin' ? 'dashboard' : 'admin');
                                setIsMobileMenuOpen(false);
                            }}
                            className="w-full py-3 rounded-xl font-bold bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                        >
                            {currentScreen === 'admin' ? translations.backToInvoices : translations.adminPanel}
                        </button>
                    )}
                    
                    <div className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 px-2">Language</span>
                        <ToggleSwitch options={languageOptions} value={lang} onChange={(value) => setLang(value as Language)} />
                    </div>
                    <div className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 px-2">Currency</span>
                        <ToggleSwitch options={currencyOptions} value={currency} onChange={(value) => setCurrency(value as Currency)} />
                    </div>
                    <button
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className="w-full py-3 flex items-center justify-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold"
                    >
                        {theme === 'light' ? (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg> 
                                Dark Mode
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg> 
                                Light Mode
                            </>
                        )}
                    </button>
                 </div>
                 <div className="h-px bg-slate-200 dark:bg-slate-700/50"></div>
                 <button onClick={onLogout} className="w-full py-3 rounded-xl text-red-600 bg-red-50 dark:bg-red-900/20 font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
                    {translations.logout}
                </button>
            </div>
        )}
    </header>
  );
};

export default Header;
