import React, { useState } from 'react';
import type { User, Translations } from '../../types';
import * as dbService from '../../services/dbService';
import Spinner from '../shared/Spinner';

interface LoginScreenProps {
  onLogin: (user: User) => Promise<void>;
  onSwitchToSignUp: () => void;
  translations: Translations;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onSwitchToSignUp, translations }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const user = await dbService.loginUser(email, password);
      await onLogin(user);
    } catch (err: any) {
      console.error("Login process failed:", err);
      const errorMessage = err.message || err.error_description || JSON.stringify(err);
      
      if (!errorMessage.includes("Invalid login credentials")) {
         window.alert(`Login Error: ${errorMessage}`);
      }

      if (errorMessage.includes("Invalid login credentials")) {
          setError(translations.invalidCredentials);
      } else {
          setError(`Login Failed: ${errorMessage}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center p-4 min-h-[calc(100vh-80px)]">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-soft p-10 animate-fade-in-up border border-white/50 relative overflow-hidden">
        
        {/* Decorative background blob */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 dark:bg-indigo-900/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

        <div className="relative z-10">
            <div className="text-center mb-10">
                <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-6 rotate-3">
                    <svg className="w-8 h-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>
                <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">{translations.loginTitle}</h1>
                <p className="mt-2 text-slate-500 dark:text-slate-400 text-sm font-medium">{translations.loginSubtitle}</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 ps-2">{translations.email}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={translations.emailPlaceholder}
                  required
                  className="input-modern"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 ps-2">{translations.password}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={translations.passwordPlaceholder}
                  required
                  className="input-modern"
                />
              </div>
              
              <div className="flex items-center ps-2">
                  <label className="flex items-center cursor-pointer group">
                    <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-5 h-5 rounded-lg border-none bg-slate-100 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                    <span className="ms-3 text-sm font-semibold text-slate-500 group-hover:text-indigo-600 transition-colors">{translations.rememberMe}</span>
                  </label>
              </div>
              
              {error && (
                  <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-2xl border border-rose-100 dark:border-rose-900/30">
                      <p className="text-sm font-bold text-rose-600 dark:text-rose-400 text-center">{error}</p>
                  </div>
              )}

              <button 
                type="submit" 
                className="w-full py-4 rounded-2xl text-lg font-bold text-white bg-slate-900 dark:bg-white dark:text-slate-900 hover:scale-[1.02] active:scale-[0.98] shadow-xl transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                disabled={isLoading}
              >
                {isLoading ? <Spinner /> : translations.login}
              </button>
            </form>
            
            <p className="mt-8 text-center text-slate-500 text-sm font-medium">
              {translations.loginPrompt}{' '}
              <button onClick={onSwitchToSignUp} className="text-indigo-600 font-bold hover:underline decoration-2 underline-offset-4">
                {translations.signup}
              </button>
            </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;