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
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
      <div className="w-full max-w-md p-8 space-y-6 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 opacity-0 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
        <div className="text-center">
            <h1 className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">{translations.loginTitle}</h1>
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
              className="mt-1 block w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
              className="mt-1 block w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center">
              <input id="remember-me" name="remember-me" type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-500 rounded" />
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
        <p className="text-sm text-center text-slate-600 dark:text-slate-400">
          {translations.loginPrompt}{' '}
          <button onClick={onSwitchToSignUp} className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
            {translations.signup}
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;