import React from 'react';

interface Option {
  value: string;
  label: string;
}

interface ToggleSwitchProps {
  // FIX: Make the 'options' prop accept a readonly tuple to match the 'as const' assertion in the parent component.
  options: readonly [Option, Option];
  value: string;
  onChange: (value: string) => void;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ options, value, onChange }) => {
  const [option1, option2] = options;
  const isOption1Active = value === option1.value;

  return (
    <div
      className="relative flex items-center w-36 h-10 rounded-full p-1 cursor-pointer bg-slate-200 dark:bg-slate-700 shadow-inner"
      onClick={() => onChange(isOption1Active ? option2.value : option1.value)}
    >
      <div
        className={`absolute bg-white dark:bg-slate-900/70 h-8 w-[calc(50%-4px)] rounded-full shadow-md transition-transform duration-300 ease-in-out ${
          isOption1Active ? 'translate-x-0' : 'translate-x-full'
        }`}
      />
      <div className="flex justify-around w-full">
        <span
          className={`z-10 w-1/2 text-center text-sm font-semibold transition-colors duration-300 ${
            isOption1Active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {option1.label}
        </span>
        <span
          className={`z-10 w-12 text-center text-sm font-semibold transition-colors duration-300 ${
            !isOption1Active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {option2.label}
        </span>
      </div>
    </div>
  );
};

export default ToggleSwitch;