
import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { TripReport, RiskAnalysis, SaferAlternative, HistoryItem, TripData } from '../types';
import { IconLink, IconSearch, IconShield, IconCheck, IconWarning, IconStop, IconSend, IconInfo, IconRefresh, IconHistory, IconTime, IconSettings, IconScale, IconChart } from './Icons';
import { calculateTurnaroundTime, estimatePackWeight, calculateULScore, calculateRiskAnalysis, generateWarnings } from '../utils/riskUtils';

interface ReportViewProps {
  report: TripReport | null;
  isLoading: boolean;
  loadingText?: string;
  onDeepCheck: () => void;
  isThinking: boolean;
  safetyVerdict: string | null;
  onFollowUp: (question: string) => void;
  riskAnalysis: RiskAnalysis | null;
  onGetAlternatives: () => void;
  alternatives: SaferAlternative[] | null;
  isLoadingAlternatives: boolean;
  historyItem: HistoryItem | null;
  onReRunHistory: () => void;
  isBeginner: boolean;
  userProfile: any; // Passed for "What If" calculations
}

const ReportView: React.FC<ReportViewProps> = ({ 
  report, 
  isLoading, 
  loadingText, 
  onDeepCheck, 
  isThinking, 
  safetyVerdict,
  onFollowUp,
  riskAnalysis,
  onGetAlternatives,
  alternatives,
  isLoadingAlternatives,
  historyItem,
  onReRunHistory,
  isBeginner,
  userProfile
}) => {
  const [question, setQuestion] = useState('');
  const [showRiskDetails, setShowRiskDetails] = useState(false);
  const [showWhatIf, setShowWhatIf] = useState(false);
  
  // Local state for "What If" mode
  const [whatIfData, setWhatIfData] = useState<TripData | null>(null);
  const [whatIfRisk, setWhatIfRisk] = useState<RiskAnalysis | null>(null);
  const [tempAdjust, setTempAdjust] = useState(0);
  const [distAdjust, setDistAdjust] = useState(0);

  useEffect(() => {
    if (report?.data) {
      setWhatIfData(report.data);
      setTempAdjust(0);
      setDistAdjust(0);
    }
  }, [report]);

  // Recalculate what-if risk when sliders move
  useEffect(() => {
    if (!report?.data || !whatIfData) return;
    
    // Create hypothetical data
    const hypoData: TripData = {
      ...whatIfData,
      tempC: report.data.tempC + tempAdjust,
      distanceKm: Math.max(1, report.data.distanceKm + distAdjust)
    };

    // Recalc risk
    const newRisk = calculateRiskAnalysis(userProfile, hypoData, "12:00"); // Simplify start time for sliders or add slider
    setWhatIfRisk(newRisk);
  }, [tempAdjust, distAdjust, report, userProfile, whatIfData]);


  const handleSubmitFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim()) {
      onFollowUp(question);
      setQuestion('');
    }
  };

  const Tooltip = ({ text }: { text: string }) => (
    isBeginner ? (
      <div className="group relative inline-block ml-1 align-middle z-50">
        <IconInfo className="w-4 h-4 text-forest-400 hover:text-forest-600 cursor-help" />
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-stone-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100]">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-stone-800"></div>
        </div>
      </div>
    ) : null
  );

  // Loading Overlay
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] animate-fade-in space-y-4">
        <div className="relative w-16 h-16">
           <div className="absolute inset-0 border-4 border-stone-200 dark:border-stone-700 rounded-full"></div>
           <div className="absolute inset-0 border-4 border-forest-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-forest-800 dark:text-forest-200 font-medium text-lg animate-pulse">{loadingText || "Planning your hike..."}</p>
      </div>
    );
  }

  if (!report) return null;

  // Derived Values
  const effectiveData = report.data; // Or whatIfData if applied, but simpler to just show whatIf panel separately
  const packWeight = estimatePackWeight(effectiveData);
  const ulScore = calculateULScore(packWeight, effectiveData);
  const turnaround = calculateTurnaroundTime(effectiveData, "09:00", userProfile.fitness); // Use actual start time in real app
  const warnings = generateWarnings(effectiveData, "09:00"); // Use actual start time

  // Animated Graph Helper
  const renderElevationGraph = () => {
    const points = effectiveData.elevationProfile || [0, 20, 50, 80, 40, 0];
    const max = Math.max(...points, 100);
    const width = 300;
    const height = 60;
    
    const polylinePoints = points.map((p, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - (p / max) * height;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width="100%" height="80" viewBox={`0 0 ${width} ${height}`} className="overflow-visible mt-2">
         <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{stopColor: '#38a36b', stopOpacity: 0.5}} />
              <stop offset="100%" style={{stopColor: '#38a36b', stopOpacity: 0}} />
            </linearGradient>
         </defs>
         <polyline 
            fill="none" 
            stroke="#38a36b" 
            strokeWidth="2" 
            points={polylinePoints} 
            className="animate-dash"
            strokeDasharray="1000"
            strokeDashoffset="1000"
         />
         <polygon points={`${polylinePoints} ${width},${height} 0,${height}`} fill="url(#grad)" opacity="0.5" />
      </svg>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up pb-20">
      
      {/* History Banner */}
      {historyItem && (
        <div className="bg-stone-800 text-stone-100 p-3 rounded-xl flex items-center justify-between shadow-md">
           <div className="flex items-center gap-2">
             <IconHistory className="w-5 h-5 text-stone-400" />
             <div className="text-sm">
               <span className="font-semibold text-white">Viewing saved plan</span>
               <span className="text-stone-400 mx-2">•</span>
               {new Date(historyItem.timestamp).toLocaleString()}
             </div>
           </div>
           <button 
             onClick={onReRunHistory}
             className="text-xs bg-stone-700 hover:bg-stone-600 px-3 py-1.5 rounded-lg transition-colors border border-stone-600 font-medium flex items-center gap-1"
           >
             <IconRefresh className="w-3 h-3" />
             Re-run with today's conditions
           </button>
        </div>
      )}

      {/* WARNINGS OVERLAY */}
      {warnings.length > 0 && (
         <div className="flex flex-wrap gap-2 mb-2 animate-fade-in">
            {warnings.map((w, i) => (
               <span key={i} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border shadow-sm ${
                 w.severity === 'red' ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200' :
                 w.severity === 'orange' ? 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-200' :
                 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-200'
               }`}>
                  <IconWarning className="w-3.5 h-3.5" /> {w.label}
               </span>
            ))}
         </div>
      )}

      {/* 1. At a Glance Summary Card */}
      <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700">
        <div className="bg-forest-50 dark:bg-forest-900/30 p-4 border-b border-forest-100 dark:border-forest-800 flex items-center justify-between">
            <h3 className="font-bold text-forest-900 dark:text-forest-100 flex items-center gap-2">
                <IconChart className="w-5 h-5 text-forest-600" />
                Trail Summary
            </h3>
            <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide ${
                report.summary.verdict.toLowerCase().includes('good') ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : 
                report.summary.verdict.toLowerCase().includes('caution') ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
            }`}>
                {report.summary.verdict}
            </span>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <span className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wider font-semibold block mb-1">
                  Difficulty
                  <Tooltip text="How hard the hike feels physically. 'Hard' usually means lots of climbing." />
                </span>
                <span className="text-lg font-bold text-stone-800 dark:text-stone-200">{report.summary.difficulty}</span>
                {/* Elevation Graph */}
                <div className="mt-2 opacity-80">
                   {renderElevationGraph()}
                   <div className="flex justify-between text-[10px] text-stone-400 font-mono mt-1">
                      <span>START</span>
                      <span>MAX {Math.round(Math.max(...(effectiveData.elevationProfile || [0])))}m</span>
                      <span>END</span>
                   </div>
                </div>
            </div>
            <div>
                <span className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wider font-semibold block mb-1">
                  Route Stats
                  <Tooltip text="Distance is round-trip length. Gain is total vertical climbing." />
                </span>
                <span className="text-lg font-bold text-stone-800 dark:text-stone-200 block">{report.summary.stats}</span>
                
                {/* Dynamic Turnaround */}
                <div className="mt-4 p-2 bg-stone-50 dark:bg-stone-900/50 rounded-lg border border-stone-100 dark:border-stone-700 flex items-start gap-2">
                    <IconTime className="w-4 h-4 text-forest-600 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold text-forest-800 dark:text-forest-300 block">Turnaround Target</span>
                      <span className="text-sm font-mono text-stone-600 dark:text-stone-300">{turnaround}</span>
                      <span className="text-[10px] text-stone-400 block leading-tight mt-0.5">Estimated halfway time to avoid darkness.</span>
                    </div>
                </div>
            </div>
            <div>
                <span className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wider font-semibold block mb-1">
                  Main Risk
                  <Tooltip text="The single biggest thing to watch out for today." />
                </span>
                <span className="text-lg font-bold text-stone-800 dark:text-stone-200">{report.summary.riskFactor}</span>
                {effectiveData.sunsetTime && (
                  <div className="mt-4 flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                    <div className="w-2 h-2 bg-orange-400 rounded-full"></div> Sunset today: <span className="font-mono">{effectiveData.sunsetTime}</span>
                  </div>
                )}
            </div>
        </div>
      </div>

      {/* Safety Level Bar */}
      {riskAnalysis && (
        <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 p-4">
           <div className="flex items-center justify-between mb-2">
             <div className="flex items-center gap-2">
               <h4 className="text-sm font-bold text-stone-700 dark:text-stone-200">
                 Overall Risk Level
                 <Tooltip text="A score combining weather, difficulty, and your experience. Higher means be more careful." />
               </h4>
               <button onClick={() => setShowRiskDetails(!showRiskDetails)} className="text-stone-400 hover:text-forest-600">
                 <IconInfo className="w-4 h-4" />
               </button>
             </div>
             <span className={`text-sm font-bold px-2 py-0.5 rounded ${riskAnalysis.color.replace('bg-', 'text-').replace('500', '700').replace('600', '800').replace('400', '800')}`}>
               {riskAnalysis.level}
             </span>
           </div>
           
           {/* Visual Bar */}
           <div className="h-2.5 w-full bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden flex">
              <div 
                className={`h-full transition-all duration-500 ${riskAnalysis.color}`} 
                style={{ width: `${(riskAnalysis.score / 10) * 100}%` }}
              ></div>
           </div>

           {/* Risk Details Modal/Panel */}
           {showRiskDetails && (
             <div className="mt-4 p-4 bg-stone-50 dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 animate-fade-in">
               <h5 className="font-bold text-sm text-stone-800 dark:text-stone-200 mb-2">Why this risk level?</h5>
               <ul className="space-y-2">
                 {riskAnalysis.factors.map((factor, idx) => (
                   <li key={idx} className="text-sm text-stone-600 dark:text-stone-300 flex items-start gap-2">
                     <span className="mt-1 w-1.5 h-1.5 rounded-full bg-stone-400 flex-shrink-0"></span>
                     <span>
                       <strong className="text-stone-800 dark:text-stone-100">{factor.name}:</strong> {factor.description}
                     </span>
                   </li>
                 ))}
               </ul>
             </div>
           )}
        </div>
      )}

      {/* "What If" Exploration Mode */}
      <div className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl overflow-hidden">
        <button 
           onClick={() => setShowWhatIf(!showWhatIf)} 
           className="w-full flex items-center justify-between p-4 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
        >
          <div className="flex items-center gap-2 text-stone-700 dark:text-stone-300 font-bold text-sm">
             <IconSettings className="w-4 h-4" />
             Explore: "What If?" Mode
          </div>
          <span className="text-xs text-forest-600 dark:text-forest-400 font-medium">
             {showWhatIf ? 'Close' : 'Adjust conditions'}
          </span>
        </button>
        
        {showWhatIf && (
          <div className="p-4 border-t border-stone-200 dark:border-stone-700 space-y-4 animate-fade-in">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Temp Slider */}
                <div>
                   <label className="text-xs font-bold text-stone-500 uppercase flex justify-between">
                      Temperature Change
                      <span className="text-stone-800 dark:text-stone-200">{tempAdjust > 0 ? '+' : ''}{tempAdjust}°C</span>
                   </label>
                   <input 
                     type="range" min="-10" max="10" step="1" 
                     value={tempAdjust} 
                     onChange={(e) => setTempAdjust(parseInt(e.target.value))}
                     className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-forest-600 mt-2"
                   />
                </div>
                {/* Dist Slider */}
                <div>
                   <label className="text-xs font-bold text-stone-500 uppercase flex justify-between">
                      Distance Change
                      <span className="text-stone-800 dark:text-stone-200">{distAdjust > 0 ? '+' : ''}{distAdjust}km</span>
                   </label>
                   <input 
                     type="range" min="-5" max="10" step="1" 
                     value={distAdjust} 
                     onChange={(e) => setDistAdjust(parseInt(e.target.value))}
                     className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-forest-600 mt-2"
                   />
                </div>
             </div>
             
             {/* Result Preview */}
             {whatIfRisk && (
               <div className="bg-white dark:bg-stone-800 p-3 rounded-lg flex items-center justify-between shadow-sm">
                  <span className="text-sm text-stone-600 dark:text-stone-300">New Safety Level:</span>
                  <span className={`text-sm font-bold px-2 py-1 rounded ${whatIfRisk.color.replace('bg-', 'text-').replace('500', '700').replace('600', '800').replace('400', '800')}`}>
                    {whatIfRisk.level}
                  </span>
               </div>
             )}
          </div>
        )}
      </div>

      {/* 2. Detailed Content (Markdown) */}
      <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 p-6 md:p-8">
        <article className="prose prose-stone dark:prose-invert prose-headings:text-forest-800 dark:prose-headings:text-forest-200 prose-headings:font-bold prose-a:text-forest-600 max-w-none">
           <ReactMarkdown 
            components={{
              h2: ({node, ...props}) => <h2 className="text-xl mt-8 mb-4 border-b border-stone-100 dark:border-stone-700 pb-2" {...props} />,
              ul: ({node, ...props}) => <ul className="space-y-2 my-4 list-disc pl-5 marker:text-forest-400" {...props} />,
              li: ({node, ...props}) => <li className="pl-1" {...props} />,
            }}
           >
             {report.markdownContent}
           </ReactMarkdown>
        </article>
      </div>

      {/* 3. Safety Check Panel */}
      <div className="bg-amber-50/50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30 overflow-hidden">
        <div className="bg-amber-100/50 dark:bg-amber-900/30 p-4 border-b border-amber-200 dark:border-amber-800/50 flex justify-between items-center">
             <h3 className="text-lg font-bold text-amber-900 dark:text-amber-100 flex items-center gap-2">
                <IconShield className="w-5 h-5" />
                Safety Check
                <Tooltip text="Key things to keep you safe today. Pay attention to 'Watch Out'." />
             </h3>
             {riskAnalysis && (
                <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${riskAnalysis.color.replace('bg-', 'bg-opacity-20 text-').replace('500', '800').replace('600', '800').replace('400', '800')}`}>
                  Level: {riskAnalysis.level}
                </span>
             )}
        </div>
        <div className="p-6 grid md:grid-cols-3 gap-6">
            {/* Good */}
            <div className="space-y-3">
                <h4 className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider flex items-center gap-1">
                    <IconCheck className="w-4 h-4 text-green-600 dark:text-green-400" /> Looks Good
                </h4>
                <ul className="space-y-2 text-sm text-stone-700 dark:text-stone-300">
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
                <h4 className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider flex items-center gap-1">
                    <IconWarning className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Watch Out
                </h4>
                 <ul className="space-y-2 text-sm text-stone-700 dark:text-stone-300">
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
                <h4 className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider flex items-center gap-1">
                    <IconStop className="w-4 h-4 text-red-600 dark:text-red-400" /> Avoid If
                </h4>
                 <ul className="space-y-2 text-sm text-stone-700 dark:text-stone-300">
                    {report.safety.dealBreakers.length > 0 ? report.safety.dealBreakers.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                            <span className="block w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></span>
                            {item}
                        </li>
                    )) : <li className="text-stone-400 italic">No obvious deal breakers.</li>}
                </ul>
            </div>
        </div>

        {/* Alternatives Button - Show if risk is Elevated or High */}
        {riskAnalysis && (riskAnalysis.level === 'Elevated' || riskAnalysis.level === 'High') && !alternatives && (
            <div className="p-4 bg-white dark:bg-stone-800 border-t border-amber-200 dark:border-amber-800">
                 <button 
                   onClick={onGetAlternatives}
                   disabled={isLoadingAlternatives}
                   className="w-full flex items-center justify-center gap-2 text-forest-700 dark:text-forest-300 bg-forest-50 dark:bg-forest-900/30 hover:bg-forest-100 dark:hover:bg-forest-900/50 border border-forest-200 dark:border-forest-700 rounded-lg p-3 text-sm font-semibold transition-colors"
                 >
                   {isLoadingAlternatives ? (
                     <span>Finding safer trails...</span>
                   ) : (
                     <>
                        <IconRefresh className="w-4 h-4" />
                        Show me a lower-risk alternative
                     </>
                   )}
                 </button>
            </div>
        )}

        {/* Alternatives Display */}
        {alternatives && (
            <div className="p-4 bg-white dark:bg-stone-800 border-t border-amber-200 dark:border-amber-800 animate-fade-in">
                 <h4 className="text-sm font-bold text-forest-800 dark:text-forest-200 mb-3 flex items-center gap-2">
                     <IconCheck className="w-4 h-4" /> Safer Alternatives Found
                 </h4>
                 <div className="space-y-3">
                    {alternatives.map((alt, i) => (
                        <div key={i} className="p-3 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900">
                            <div className="font-bold text-stone-800 dark:text-stone-200 text-sm">{alt.title}</div>
                            <div className="text-xs text-stone-600 dark:text-stone-400 mt-1">{alt.description}</div>
                            <div className="text-xs text-forest-600 dark:text-forest-400 mt-2 font-medium">Why: {alt.reason}</div>
                        </div>
                    ))}
                 </div>
            </div>
        )}

        {/* Deep Check Button Area */}
        <div className="p-4 bg-amber-100/30 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800/50 flex flex-col md:flex-row items-center justify-between gap-4">
             <p className="text-xs text-amber-800 dark:text-amber-200 md:max-w-md">
                 Need a deeper analysis of terrain traps and fitness compatibility?
             </p>
             {safetyVerdict ? (
                <div className="flex-1 bg-white/80 dark:bg-stone-800/80 p-3 rounded-lg border border-amber-200 dark:border-amber-700 text-sm text-amber-900 dark:text-amber-100 shadow-sm w-full">
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
                        : 'bg-stone-800 dark:bg-stone-700 hover:bg-stone-900 dark:hover:bg-stone-600'
                    }`}
                >
                    {isThinking ? 'Analyzing...' : 'Run Deep Safety Check'}
                </button>
             )}
        </div>
      </div>

      {/* UL Gear Score Section */}
      <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 p-4">
         <div className="flex items-center gap-2 mb-4">
            <IconScale className="w-5 h-5 text-forest-600" />
            <h3 className="font-bold text-stone-800 dark:text-stone-200 text-sm">Packing Weight & UL Score</h3>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Weight Bar */}
            <div>
               <div className="flex justify-between text-xs font-semibold mb-1 text-stone-500 dark:text-stone-400">
                  <span>Estimated Pack Weight</span>
                  <span>~{packWeight} kg</span>
               </div>
               <div className="h-4 bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden relative">
                   {/* Danger Zone Markers */}
                   <div className="absolute right-0 top-0 bottom-0 w-[20%] bg-red-100/30"></div>
                   
                   <div 
                     className={`h-full rounded-full transition-all duration-1000 ${
                       packWeight < 5 ? 'bg-green-500' : packWeight < 8 ? 'bg-amber-400' : 'bg-red-500'
                     }`}
                     style={{ width: `${Math.min(100, (packWeight / 12) * 100)}%` }}
                   ></div>
               </div>
               <p className="text-[10px] text-stone-400 mt-1 italic">Includes water, food & layers based on distance/weather.</p>
            </div>

            {/* Score & Gear */}
            <div>
               <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase">Ultralight Score</span>
                  <span className={`text-xl font-black ${ulScore > 80 ? 'text-green-600' : ulScore > 50 ? 'text-amber-500' : 'text-red-500'}`}>
                    {ulScore}
                  </span>
               </div>
               <div className="bg-stone-50 dark:bg-stone-900 p-3 rounded-lg border border-stone-100 dark:border-stone-700">
                  <span className="text-[10px] font-bold text-forest-600 dark:text-forest-400 uppercase block mb-1">Recommended Gear</span>
                  <p className="text-xs text-stone-700 dark:text-stone-300">{report.ulGear}</p>
               </div>
            </div>
         </div>
      </div>

      {/* 4. Follow-up Question Input */}
      <div className="bg-stone-100 dark:bg-stone-900 rounded-2xl p-2 border border-stone-200 dark:border-stone-700 shadow-inner flex items-center gap-2">
          <input 
            type="text" 
            placeholder="Ask a follow-up question (e.g. 'What if I start at 6am?', 'Is it dog friendly?')"
            className="flex-1 bg-transparent border-none px-4 py-3 text-sm focus:ring-0 outline-none text-stone-800 dark:text-stone-200 placeholder-stone-500"
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