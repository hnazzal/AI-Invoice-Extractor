import React, { useState, useEffect, useCallback } from 'react';
import type { User, Language, Screen, Invoice, Theme, Currency } from './types';
import { translations } from './constants';
import * as dbService from './services/dbService';
import { isDbConfigured, isAiConfigured } from './config';
import LoginScreen from './components/screens/LoginScreen';
import SignUpScreen from './components/screens/SignUpScreen';
import DashboardScreen from './components/screens/DashboardScreen';
import Header from './components/shared/Header';
import ConfigurationErrorScreen from './components/screens/ConfigurationErrorScreen';

const App: React.FC = () => {
  const missingKeys: string[] = [];
  if (!isDbConfigured) {
    missingKeys.push('VITE_SUPABASE_URL');
    missingKeys.push('VITE_SUPABASE_ANON_KEY');
  }
  if (!isAiConfigured) {
    missingKeys.push('VITE_API_KEY');
  }


  if (missingKeys.length > 0) {
    return <ConfigurationErrorScreen missingKeys={missingKeys} />;
  }

  const [user, setUser] = useState<User | null>(null);
  const [screen, setScreen] = useState<Screen>('login');
  const [lang, setLang] = useState<Language>('ar');
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'light');
  const [currency, setCurrency] = useState<Currency>(() => (localStorage.getItem('currency') as Currency) || 'JOD');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.body.className = lang === 'ar' ? 'font-arabic' : 'font-sans';
  }, [lang]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(theme === 'light' ? 'dark' : 'light');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('currency', currency);
  }, [currency]);


  const handleLogin = useCallback(async (loggedInUser: User) => {
    setIsLoading(true);
    try {
      // Fetch invoices using the user's auth token
      const userInvoices = await dbService.getInvoicesForUser(loggedInUser.token);
      const invoicesWithUploader = userInvoices.map(invoice => ({
        ...invoice,
        uploaderEmail: loggedInUser.email,
      }));
      setInvoices(invoicesWithUploader);
      setUser(loggedInUser);
      setScreen('dashboard');
    } catch (error) {
      console.error("Failed to load user data:", error);
      // Here you might want to show an error to the user
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const handleLogout = useCallback(() => {
    setUser(null);
    setScreen('login');
    setInvoices([]);
  }, []);

  const t = translations[lang];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-500"></div>
      </div>
    );
  }

  const renderScreen = () => {
    switch (screen) {
      case 'login':
        return <LoginScreen onLogin={handleLogin} onSwitchToSignUp={() => setScreen('signup')} translations={t} />;
      case 'signup':
        return <SignUpScreen onSwitchToLogin={() => setScreen('login')} translations={t} />;
      case 'dashboard':
        return user ? <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto opacity-0 animate-fade-in-up" style={{ animationDelay: '150ms'}}><DashboardScreen user={user} translations={t} invoices={invoices} setInvoices={setInvoices} currency={currency} lang={lang} /></div> : <LoginScreen onLogin={handleLogin} onSwitchToSignUp={() => setScreen('signup')} translations={t} />;
      default:
        return <LoginScreen onLogin={handleLogin} onSwitchToSignUp={() => setScreen('signup')} translations={t} />;
    }
  };

  return (
    <div className={`min-h-screen bg-slate-100 dark:bg-gray-900 text-slate-800 dark:text-slate-200 font-sans transition-colors duration-300 flex flex-col`}>
       <div className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none bg-gradient-to-br from-indigo-100 via-white to-sky-100 dark:from-gray-900 dark:via-gray-900 dark:to-slate-900 bg-[length:200%_200%] animate-background-pan"></div>
      <Header 
        user={user} 
        onLogout={handleLogout} 
        lang={lang}
        setLang={setLang}
        theme={theme}
        setTheme={setTheme}
        currency={currency}
        setCurrency={setCurrency}
        translations={t} 
      />
      <main className="flex-grow">
          {renderScreen()}
      </main>
    </div>
  );
};

export default App;