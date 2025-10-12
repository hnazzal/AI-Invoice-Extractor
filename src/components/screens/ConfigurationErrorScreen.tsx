import React from 'react';

interface ConfigurationErrorScreenProps {
  missingKeys: string[];
}

const ConfigurationErrorScreen: React.FC<ConfigurationErrorScreenProps> = ({ missingKeys }) => {
  // Always display all required keys for user clarity, highlighting which ones the app detected as missing.
  const allRequiredKeys = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_API_KEY'];

  return (
    <div className="flex flex-col justify-center items-center h-screen font-sans bg-slate-100 text-slate-700 p-4">
      <div className="text-center bg-red-50 p-10 rounded-lg border border-red-200 max-w-3xl w-full shadow-lg">
        <h1 className="text-2xl font-bold text-red-700">خطأ في إعدادات التطبيق</h1>
        <h2 className="text-xl font-semibold text-red-700 mt-1">Application Configuration Error</h2>
        
        <div className="mt-6 text-start text-red-800 space-y-4">
          <p>
            فشل تشغيل التطبيق بسبب عدم العثور على المفاتيح السرية المطلوبة.
            <br />
            The application failed to start because it's missing required secret keys. To deploy successfully, please ensure the following environment variables are correctly set in your Netlify site configuration.
          </p>
          
          <div>
            <h3 className="font-bold">Required Environment Variables in Netlify:</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 font-mono bg-red-100 p-3 rounded text-sm">
              {allRequiredKeys.map(key => (
                <li key={key} className={missingKeys.includes(key) ? 'text-red-700 font-bold' : ''}>
                  {key}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs">
              <strong>Important:</strong> Vite requires environment variables intended for client-side code to be prefixed with <code>VITE_</code>. Make sure your variable names and values in the Netlify UI match the list above exactly.
               <br/>
              In Netlify, go to <strong>Site configuration &gt; Build &amp; deploy &gt; Environment variables</strong> to add or verify these variables.
            </p>
          </div>
        </div>

        <p className="mt-6 text-sm text-red-600">
          After adding the variables and redeploying, your app will be live.
          <br />
          بعد إضافة المتغيرات وإعادة النشر، سيعمل تطبيقك.
        </p>
      </div>
    </div>
  );
};

export default ConfigurationErrorScreen;
