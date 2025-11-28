import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { TripReport } from '../types';
import { IconLink, IconSearch, IconShield, IconCheck, IconWarning, IconStop, IconSend } from './Icons';

interface ReportViewProps {
  report: TripReport | null;
  isLoading: boolean;
  loadingText?: string;
  onDeepCheck: () => void;
  isThinking: boolean;
  safetyVerdict: string | null;
  onFollowUp: (question: string) => void;
}

const ReportView: React.FC<ReportViewProps> = ({ 
  report, 
  isLoading, 
  loadingText, 
  onDeepCheck, 
  isThinking, 
  safetyVerdict,
  onFollowUp
}) => {
  const [question, setQuestion] = useState('');

  const handleSubmitFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim()) {
      onFollowUp(question);
      setQuestion('');
    }
  };

  // Loading Overlay
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] animate-fade-in space-y-4">
        <div className="relative w-16 h-16">
           <div className="absolute inset-0 border-4 border-stone-200 rounded-full"></div>
           <div className="absolute inset-0 border-4 border-forest-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-forest-800 font-medium text-lg animate-pulse">{loadingText || "Planning your hike..."}</p>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="space-y-6 animate-fade-in-up pb-20">
      
      {/* 1. At a Glance Summary Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="bg-forest-50 p-4 border-b border-forest-100 flex items-center justify-between">
            <h3 className="font-bold text-forest-900 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-forest-600">
                    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75V6Z" clipRule="evenodd" />
                </svg>
                Trail Summary
            </h3>
            <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide ${
                report.summary.verdict.toLowerCase().includes('good') ? 'bg-green-100 text-green-800' : 
                report.summary.verdict.toLowerCase().includes('caution') ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
            }`}>
                {report.summary.verdict}
            </span>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <span className="text-xs text-stone-500 uppercase tracking-wider font-semibold block mb-1">Difficulty</span>
                <span className="text-lg font-bold text-stone-800">{report.summary.difficulty}</span>
            </div>
            <div>
                <span className="text-xs text-stone-500 uppercase tracking-wider font-semibold block mb-1">Route Stats</span>
                <span className="text-lg font-bold text-stone-800">{report.summary.stats}</span>
            </div>
            <div>
                <span className="text-xs text-stone-500 uppercase tracking-wider font-semibold block mb-1">Main Risk</span>
                <span className="text-lg font-bold text-stone-800">{report.summary.riskFactor}</span>
            </div>
        </div>
      </div>

      {/* Sources (if any) */}
      {report.sources && report.sources.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
           <span className="flex items-center text-stone-400 font-medium">
             <IconSearch className="w-3 h-3 mr-1" /> DATA SOURCES
           </span>
            {report.sources.slice(0, 3).map((source, idx) => (
              <a 
                key={idx} 
                href={source.uri} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center space-x-1 bg-white border border-stone-200 rounded-full px-3 py-1 text-stone-600 hover:text-forest-600 hover:border-forest-300 transition-colors max-w-[200px]"
              >
                <IconLink className="w-3 h-3" />
                <span className="truncate">{source.title}</span>
              </a>
            ))}
        </div>
      )}

      {/* 2. Detailed Content (Markdown) */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 md:p-8">
        <article className="prose prose-stone prose-headings:text-forest-800 prose-headings:font-bold prose-a:text-forest-600 max-w-none">
           <ReactMarkdown 
            components={{
              h2: ({node, ...props}) => <h2 className="text-xl mt-8 mb-4 border-b border-stone-100 pb-2" {...props} />,
              ul: ({node, ...props}) => <ul className="space-y-2 my-4 list-disc pl-5 marker:text-forest-400" {...props} />,
              li: ({node, ...props}) => <li className="pl-1" {...props} />,
            }}
           >
             {report.markdownContent}
           </ReactMarkdown>
        </article>
      </div>

      {/* 3. Safety Check Panel */}
      <div className="bg-amber-50/50 rounded-2xl border border-amber-100 overflow-hidden">
        <div className="bg-amber-100/50 p-4 border-b border-amber-200">
             <h3 className="text-lg font-bold text-amber-900 flex items-center gap-2">
                <IconShield className="w-5 h-5" />
                Safety Check
             </h3>
        </div>
        <div className="p-6 grid md:grid-cols-3 gap-6">
            {/* Good */}
            <div className="space-y-3">
                <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1">
                    <IconCheck className="w-4 h-4 text-green-600" /> Looks Good
                </h4>
                <ul className="space-y-2 text-sm text-stone-700">
                    {report.safety.pros.length > 0 ? report.safety.pros.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                            <span className="block w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></span>
                            {item}
                        </li>
                    )) : <li className="text-stone-400 italic">No specific pros listed.</li>}
                </ul>
            </div>

            {/* Watch Out */}
            <div className="space-y-3">
                <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1">
                    <IconWarning className="w-4 h-4 text-amber-600" /> Watch Out
                </h4>
                 <ul className="space-y-2 text-sm text-stone-700">
                    {report.safety.cons.length > 0 ? report.safety.cons.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                            <span className="block w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 flex-shrink-0"></span>
                            {item}
                        </li>
                    )) : <li className="text-stone-400 italic">No major warnings.</li>}
                </ul>
            </div>

             {/* Consider Not Going */}
             <div className="space-y-3">
                <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1">
                    <IconStop className="w-4 h-4 text-red-600" /> Avoid If
                </h4>
                 <ul className="space-y-2 text-sm text-stone-700">
                    {report.safety.dealBreakers.length > 0 ? report.safety.dealBreakers.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                            <span className="block w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></span>
                            {item}
                        </li>
                    )) : <li className="text-stone-400 italic">No obvious deal breakers.</li>}
                </ul>
            </div>
        </div>

        {/* Deep Check Button Area */}
        <div className="p-4 bg-amber-100/30 border-t border-amber-200 flex flex-col md:flex-row items-center justify-between gap-4">
             <p className="text-xs text-amber-800 md:max-w-md">
                 Need a deeper analysis of terrain traps and fitness compatibility?
             </p>
             {safetyVerdict ? (
                <div className="flex-1 bg-white/80 p-3 rounded-lg border border-amber-200 text-sm text-amber-900 shadow-sm w-full">
                    <span className="font-bold uppercase text-[10px] tracking-wide opacity-70 block mb-1">Deep Analysis Verdict</span>
                    {safetyVerdict}
                </div>
             ) : (
                <button
                    onClick={onDeepCheck}
                    disabled={isThinking}
                    className={`px-5 py-2 rounded-lg text-sm font-medium text-white shadow-sm transition-all whitespace-nowrap w-full md:w-auto ${
                    isThinking 
                        ? 'bg-stone-400 cursor-not-allowed' 
                        : 'bg-stone-800 hover:bg-stone-900'
                    }`}
                >
                    {isThinking ? 'Analyzing...' : 'Run Deep Safety Check'}
                </button>
             )}
        </div>
      </div>

      {/* 4. Follow-up Question Input */}
      <div className="bg-stone-100 rounded-2xl p-2 border border-stone-200 shadow-inner flex items-center gap-2">
          <input 
            type="text" 
            placeholder="Ask a follow-up question (e.g. 'What if I start at 6am?', 'Is it dog friendly?')"
            className="flex-1 bg-transparent border-none px-4 py-3 text-sm focus:ring-0 outline-none text-stone-800 placeholder-stone-500"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmitFollowUp(e)}
          />
          <button 
            onClick={handleSubmitFollowUp}
            disabled={!question.trim()}
            className="p-3 bg-forest-600 text-white rounded-xl shadow-sm hover:bg-forest-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
          >
             <IconSend className="w-5 h-5" />
          </button>
      </div>

    </div>
  );
};

export default ReportView;