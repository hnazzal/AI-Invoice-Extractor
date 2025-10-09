import React from 'react';
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
  // FIX: Use 'as const' to ensure the array is inferred as a tuple, matching the ToggleSwitch component's 'options' prop type.
  const languageOptions = [
    { value: 'ar', label: 'العربية' },
    { value: 'en', label: 'English' },
  ] as const;

  // FIX: Use 'as const' to ensure the array is inferred as a tuple, matching the ToggleSwitch component's 'options' prop type.
  const currencyOptions = [
    { value: 'JOD', label: translations.jod },
    { value: 'USD', label: translations.usd },
  ] as const;
  
  const AppLogo = () => (
    <div className="flex items-center">
        <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
        </div>
        <span className="font-bold text-xl ms-3 text-slate-800 dark:text-slate-200">{translations.appName}</span>
    </div>
  );


  if (!user) {
    return (
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-20">
                    <AppLogo />
              </div>
          </div>
      </header>
    );
  }

  return (
    <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm sticky top-0 z-50 shadow-sm border-b border-slate-200 dark:border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center">
             <AppLogo />
          </div>
          <div className="flex items-center gap-4">
            
            <ToggleSwitch options={languageOptions} value={lang} onChange={(value) => setLang(value as Language)} />
            <ToggleSwitch options={currencyOptions} value={currency} onChange={(value) => setCurrency(value as Currency)} />

            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-10 w-10 flex items-center justify-center rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              )}
            </button>
             
            <button onClick={onLogout} className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors">
              {translations.logout}
            </button>
            <div className="hidden sm:block border-s border-slate-200 dark:border-slate-700 h-8"></div>
            <div className='hidden sm:flex items-center gap-2'>
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-300 uppercase">
                {user.email.substring(0, 2)}
              </div>
              <span className="font-semibold text-sm text-slate-700 dark:text-slate-300 hidden md:block">{user.email}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;