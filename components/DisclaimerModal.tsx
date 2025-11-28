
import React from 'react';
import { IconWarning } from './Icons';

interface DisclaimerModalProps {
  onAgree: () => void;
}

const DisclaimerModal: React.FC<DisclaimerModalProps> = ({ onAgree }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-950/95 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-stone-900 max-w-md w-full rounded-3xl shadow-2xl overflow-hidden border-4 border-red-600 animate-fade-in-up relative">
        
        {/* Header */}
        <div className="bg-red-600 p-8 text-center relative overflow-hidden">
            {/* Background pattern effect */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
            
            <div className="relative z-10">
                <div className="inline-flex bg-white/20 p-4 rounded-full mb-4 animate-pulse">
                    <IconWarning className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none filter drop-shadow-md">
                    Liability Disclaimer
                </h2>
            </div>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6 text-stone-800 dark:text-stone-200">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-600 rounded-r-lg">
                <p className="font-bold text-red-700 dark:text-red-400 text-xs uppercase tracking-widest">
                    Read carefully before use
                </p>
            </div>

            <p className="font-medium text-lg leading-relaxed">
                I am <span className="text-red-600 dark:text-red-500 font-bold decoration-red-600/30 underline decoration-2 underline-offset-2">NOT responsible</span> for any injury, death, getting lost, or property damage that occurs while using this app.
            </p>

            <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                TrailSense is an experimental AI tool. It can hallucinate, provide outdated information, or be completely wrong. 
                <br/><br/>
                This is <strong>NOT professional advice</strong>. It is a suggestion tool only. You must always verify conditions with local authorities and carry the 10 essentials.
            </p>

            <button
                onClick={onAgree}
                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest rounded-xl text-lg shadow-xl shadow-red-600/20 hover:shadow-red-600/40 transition-all transform active:scale-[0.98] outline-none focus:ring-4 focus:ring-red-500/50"
            >
                I Agree & Understand
            </button>
        </div>
      </div>
    </div>
  );
};

export default DisclaimerModal;
