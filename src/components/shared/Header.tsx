
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
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, lang, setLang, theme, setTheme, currency, setCurrency, translations }) => {
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
    <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-white/50 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center ring-1 ring-inset ring-white/30 dark:ring-slate-700">
            <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
        </div>
        <div className="flex flex-col">
            <span className="font-bold text-lg leading-tight text-slate-800 dark:text-slate-200">{translations.appName}</span>
            {user?.companyName && (
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{user.companyName}</span>
            )}
        </div>
    </div>
  );

  const AuthHeader = () => (
    <header className="absolute top-0 left-0 right-0 z-40 p-4">
        <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <AppLogo />
            </div>
        </div>
    </header>
  );

  if (!user) {
    return <AuthHeader />;
  }

  return (
    <header className="sticky top-4 z-40 mx-4 my-4">
      <div className="max-w-7xl mx-auto bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-slate-700/50 relative">
        <div className="flex items-center justify-between h-20 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center">
             <AppLogo />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            <ToggleSwitch options={languageOptions} value={lang} onChange={(value) => setLang(value as Language)} />
            <ToggleSwitch options={currencyOptions} value={currency} onChange={(value) => setCurrency(value as Currency)} />

            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-10 w-10 flex items-center justify-center rounded-full text-slate-500 dark:text-slate-400 bg-white/50 hover:bg-white/80 dark:bg-slate-800/50 dark:hover:bg-slate-700/50 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              )}
            </button>
             
            <button onClick={onLogout} className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 font-medium bg-white/50 hover:bg-white/80 dark:bg-slate-800/50 dark:hover:bg-slate-700/50 transition-colors">
              {translations.logout}
            </button>
            <div className="border-s border-slate-200 dark:border-slate-700 h-8"></div>
            <div className='flex items-center gap-2'>
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-300 uppercase ring-1 ring-white/50 dark:ring-slate-600">
                {user.email.substring(0, 2)}
              </div>
            </div>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="md:hidden flex items-center gap-2">
             <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-300 uppercase ring-1 ring-white/50 dark:ring-slate-600">
                {user.email.substring(0, 2)}
            </div>
            <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
                {isMobileMenuOpen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                )}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
            <div className="md:hidden absolute top-full left-0 right-0 mt-2 mx-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col gap-4 animate-fade-in-up z-50">
                 <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Language</span>
                        <ToggleSwitch options={languageOptions} value={lang} onChange={(value) => setLang(value as Language)} />
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Currency</span>
                        <ToggleSwitch options={currencyOptions} value={currency} onChange={(value) => setCurrency(value as Currency)} />
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Theme</span>
                        <button
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className="h-10 w-full flex items-center justify-center rounded-full text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
                        >
                        {theme === 'light' ? (
                            <div className="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg> Dark Mode</div>
                        ) : (
                            <div className="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg> Light Mode</div>
                        )}
                        </button>
                    </div>
                 </div>
                 <div className="h-px bg-slate-200 dark:bg-slate-700 my-1"></div>
                 <button onClick={onLogout} className="w-full py-3 rounded-lg text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    {translations.logout}
                </button>
            </div>
        )}
      </div>
    </header>
  );
};

export default Header;
