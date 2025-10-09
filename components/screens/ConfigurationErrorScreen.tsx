import React from 'react';

interface ConfigurationErrorScreenProps {
  missingKeys: string[];
}

const ConfigurationErrorScreen: React.FC<ConfigurationErrorScreenProps> = ({ missingKeys }) => {
  const isDbMissing = missingKeys.includes('SUPABASE_URL');
  const isApiMissing = missingKeys.includes('API_KEY');

  return (
    <div className="flex flex-col justify-center items-center h-screen font-sans bg-slate-100 text-slate-700 p-4">
      <div className="text-center bg-red-50 p-10 rounded-lg border border-red-200 max-w-2xl w-full shadow-lg">
        <h1 className="text-2xl font-bold text-red-700">خطأ في إعدادات التطبيق</h1>
        <h2 className="text-xl font-semibold text-red-700 mt-1">Application Configuration Error</h2>
        
        <div className="mt-6 text-start text-red-800 space-y-4">
          <p>
            فشل تشغيل التطبيق بسبب عدم العثور على مفاتيح الإعدادات الهامة. يرجى مراجعة الإرشادات أدناه لإصلاح المشكلة.
            <br />
            The application failed to start because it's missing important configuration keys. Please review the instructions below to fix the issue.
          </p>
          
          {(isDbMissing || isApiMissing) && (
            <div>
              <h3 className="font-bold">Required Steps:</h3>
              <p className="mt-1">
                - Open the <code className="bg-red-100 p-1 rounded text-sm font-mono">config.ts</code> file in your project.
                <br />
                - Replace the placeholder values for your Supabase credentials and your Gemini API Key.
              </p>
            </div>
          )}

        </div>

        <p className="mt-6 text-sm text-red-600">
          After updating the configuration, please refresh the page.
          <br />
          بعد تحديث الإعدادات، يرجى تحديث الصفحة.
        </p>
      </div>
    </div>
  );
};

export default ConfigurationErrorScreen;
