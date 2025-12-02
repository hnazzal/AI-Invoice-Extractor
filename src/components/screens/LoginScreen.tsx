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
      <div className="w-full max-w-5xl md:grid md:grid-cols-2 lg:grid-cols-5 glass-panel rounded-3xl overflow-hidden shadow-2xl min-h-[600px] animate-fade-in-up">
        {/* Left Side: Form */}
        <div className="flex flex-col justify-center p-8 md:p-12 lg:col-span-2 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl relative">
          <div className="w-full max-w-md mx-auto relative z-10">
            <div className="mb-10 text-center md:text-start">
              <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">{translations.loginTitle}</h1>
              <p className="mt-3 text-slate-500 dark:text-slate-400 font-medium">{translations.loginSubtitle}</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-bold text-slate-700 dark:text-slate-300 text-start">{translations.email}</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={translations.emailPlaceholder}
                  required
                  className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 font-medium"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-bold text-slate-700 dark:text-slate-300 text-start">{translations.password}</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={translations.passwordPlaceholder}
                  required
                  className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 font-medium"
                />
              </div>
              
              <div className="flex items-center">
                  <label className="flex items-center cursor-pointer group">
                    <input id="remember-me" name="remember-me" type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer" />
                    <span className="ms-3 text-sm font-medium text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{translations.rememberMe}</span>
                  </label>
              </div>
              
              <div className="min-h-[24px]">
                {error && <p className="text-sm font-semibold text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30 animate-pulse">{error}</p>}
              </div>

              <button 
                type="submit" 
                className="w-full py-4 px-6 rounded-xl text-lg font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/30 transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {isLoading ? <Spinner /> : translations.login}
              </button>
            </form>
            
            <p className="mt-8 text-center text-slate-600 dark:text-slate-400 font-medium">
              {translations.loginPrompt}{' '}
              <button onClick={onSwitchToSignUp} className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline decoration-2 underline-offset-4">
                {translations.signup}
              </button>
            </p>
          </div>
        </div>

        {/* Right Side: Visual/Art */}
        <div className="hidden md:flex flex-col items-center justify-center p-12 bg-gradient-to-br from-indigo-600 to-purple-700 lg:col-span-3 relative overflow-hidden">
          {/* Animated Background Shapes */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 animate-pulse-slow"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 animate-pulse-slow delay-1000"></div>
          
          <div className="relative z-10 text-center">
            <div className="w-32 h-32 mx-auto bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center mb-8 border border-white/30 shadow-2xl animate-float">
                <svg className="w-16 h-16 text-white drop-shadow-md" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
            </div>
            <h2 className="text-5xl font-black text-white tracking-tight mb-4 drop-shadow-lg">{translations.appName}</h2>
            <p className="text-indigo-100 text-lg max-w-md mx-auto leading-relaxed opacity-90 font-medium">
                {translations.signupSubtitle}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
