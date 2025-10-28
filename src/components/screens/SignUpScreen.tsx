import React, { useState } from 'react';
import type { Translations } from '../../types';
import * as dbService from '../../services/dbService';
import Spinner from '../shared/Spinner';

interface SignUpScreenProps {
  onSwitchToLogin: () => void;
  translations: Translations;
}

const SignUpScreen: React.FC<SignUpScreenProps> = ({ onSwitchToLogin, translations }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      await dbService.signUpUser(email, password);
      setSuccess(translations.signupSuccess);
      setTimeout(() => {
        onSwitchToLogin();
      }, 2000);
    } catch (err: any) {
      if (err.message?.includes('User already registered')) {
        setError(translations.userExists);
      } else if (err.message?.includes('should be at least 6 characters')) {
        setError(translations.passwordTooShort);
      } else {
        setError(translations.signupError);
        console.error("Signup Error:", err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full md:grid md:grid-cols-2 lg:grid-cols-5">
      <div className="flex flex-col justify-center p-8 md:p-12 lg:col-span-2">
        <div className="w-full max-w-md mx-auto">
          <div className="mb-8 text-center md:text-start">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">{translations.signupTitle}</h1>
            <p className="mt-2 text-slate-500 dark:text-slate-400">{translations.signupSubtitle}</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="signup-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 text-start">{translations.email}</label>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={translations.emailPlaceholder}
                required
                className="mt-1 block w-full px-4 py-3 bg-slate-100 dark:bg-gray-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="signup-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 text-start">{translations.password}</label>
              <input
                id="signup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={translations.passwordPlaceholder}
                required
                className="mt-1 block w-full px-4 py-3 bg-slate-100 dark:bg-gray-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            
            <div className="h-10 pt-1 text-center">
              {error && <p className="text-sm text-red-500">{error}</p>}
              {success && <p className="text-sm text-green-500">{success}</p>}
            </div>

            <div>
              <button 
                type="submit" 
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-lg font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
                disabled={isLoading || success !== ''}
              >
                {isLoading ? <Spinner /> : translations.signup}
              </button>
            </div>
          </form>
          <p className="mt-8 text-sm text-center text-slate-600 dark:text-slate-400">
            {translations.signupPrompt}{' '}
            <button onClick={onSwitchToLogin} className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
              {translations.login}
            </button>
          </p>
        </div>
      </div>
       <div className="hidden md:flex flex-col items-center justify-center p-12 bg-gradient-to-br from-indigo-600 to-sky-500 lg:col-span-3 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
          <defs>
            <pattern id="pattern-circles" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse" >
              <circle cx="20" cy="20" r="1" fill="white" fillOpacity="0.1"/>
            </pattern>
          </defs>
          <rect x="0" y="0" width="100%" height="100%" fill="url(#pattern-circles)"/>
        </svg>

        <div className="relative z-10 flex flex-col items-center">
            <div className="w-48 h-48 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm mb-8 border border-white/30 shadow-lg">
                <svg className="w-28 h-28 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                </svg>
            </div>
            <h2 className="text-4xl font-bold text-white text-center shadow-sm">{translations.appName}</h2>
            <p className="text-white/80 mt-4 max-w-sm text-center text-lg">
                {translations.signupSubtitle}
            </p>
        </div>
      </div>
    </div>
  );
};

export default SignUpScreen;