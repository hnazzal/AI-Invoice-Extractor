import React from 'react';

interface ConfigurationErrorScreenProps {
  missingKeys: string[];
}

const ConfigurationErrorScreen: React.FC<ConfigurationErrorScreenProps> = ({ missingKeys }) => {
  return (
    <div className="flex flex-col justify-center items-center h-screen font-sans bg-slate-100 text-slate-700 p-4">
      <div className="text-center bg-red-50 p-10 rounded-lg border border-red-200 max-w-3xl w-full shadow-lg">
        <h1 className="text-2xl font-bold text-red-700">خطأ في إعدادات التطبيق</h1>
        <h2 className="text-xl font-semibold text-red-700 mt-1">Application Configuration Error</h2>
        
        <div className="mt-6 text-start text-red-800 space-y-4">
          <p>
            فشل تشغيل التطبيق بسبب عدم العثور على المفاتيح السرية. لنشر التطبيق بنجاح على Netlify، يرجى إضافة متغيرات البيئة التالية.
            <br />
            The application failed to start because it's missing secret keys. To deploy successfully on Netlify, please add the following environment variables.
          </p>
          
          <div>
            <h3 className="font-bold">Required Environment Variables:</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 font-mono bg-red-100 p-3 rounded text-sm">
              {missingKeys.map(key => (
                <li key={key}>{key}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs">
              In Netlify, go to <strong>Site configuration &gt; Build &amp; deploy &gt; Environment</strong> to add these variables.
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