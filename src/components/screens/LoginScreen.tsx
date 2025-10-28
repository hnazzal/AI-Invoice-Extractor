import React, { useState } from 'react';
import type { User, Translations } from '../../types';
import * as dbService from '../../services/dbService';
import Spinner from '../shared/Spinner';

interface LoginScreenProps {
  onLogin: (user: User) => void;
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
      onLogin(user);
    } catch (err: any) {
      setError(translations.invalidCredentials);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center p-4">
      <div className="w-full max-w-5xl md:grid md:grid-cols-2 lg:grid-cols-5 rounded-2xl shadow-2xl overflow-hidden min-h-[70vh]">
        <div className="flex flex-col justify-center p-8 md:p-12 lg:col-span-2 bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg">
          <div className="w-full max-w-md mx-auto">
            <div className="mb-8 text-center md:text-start">
              <h1 className="text-4xl font-bold text-slate-900 dark:text-white">{translations.loginTitle}</h1>
              <p className="mt-2 text-slate-500 dark:text-slate-400">{translations.loginSubtitle}</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 text-start">{translations.email}</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={translations.emailPlaceholder}
                  required
                  className="mt-1 block w-full px-4 py-3 bg-white/50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 text-start">{translations.password}</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={translations.passwordPlaceholder}
                  required
                  className="mt-1 block w-full px-4 py-3 bg-white/50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center">
                  <input id="remember-me" name="remember-me" type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-500 rounded bg-transparent" />
                  <label htmlFor="remember-me" className="ms-2 block text-sm text-slate-900 dark:text-slate-300">{translations.rememberMe}</label>
              </div>
              
              <div className="h-5 pt-1">
                {error && <p className="text-sm text-red-500 text-start">{error}</p>}
              </div>

              <div>
                <button 
                  type="submit" 
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-lg font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
                  disabled={isLoading}
                >
                  {isLoading ? <Spinner /> : translations.login}
                </button>
              </div>
            </form>
            <p className="mt-8 text-sm text-center text-slate-600 dark:text-slate-400">
              {translations.loginPrompt}{' '}
              <button onClick={onSwitchToSignUp} className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
                {translations.signup}
              </button>
            </p>
          </div>
        </div>
        <div className="hidden md:flex flex-col items-center justify-center p-12 bg-indigo-600/50 dark:bg-indigo-900/20 lg:col-span-3">
          <div className="w-48 h-48 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm mb-8 animate-glow">
              <svg className="w-28 h-28 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
          </div>
          <h2 className="text-4xl font-bold text-white text-center">{translations.appName}</h2>
          <p className="text-white/80 mt-2 max-w-sm text-center">
              {translations.signupSubtitle}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;