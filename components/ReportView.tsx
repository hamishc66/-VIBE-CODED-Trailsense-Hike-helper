import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { TripReport, RiskAnalysis, SaferAlternative, HistoryItem, TripData, WarningChip, HikeDetails, UserProfile } from '../types';
import { IconLink, IconSearch, IconShield, IconCheck, IconWarning, IconStop, IconSend, IconInfo, IconRefresh, IconHistory, IconTime, IconSettings, IconScale, IconChart, IconCloud, IconWeight, IconStar, IconShare, IconList, IconMap, IconFirstAid, IconBot } from './Icons';
import { calculateTurnaroundTime, estimatePackWeight, calculateULScore, calculateRiskAnalysis, generateWarnings } from '../utils/riskUtils';
import { CollapsiblePanel } from './CollapsiblePanel';

interface ReportViewProps {
  report: TripReport | null;
  hikeDetails: HikeDetails;
  isLoading: boolean;
  loadingText?: string;
  onDeepCheck: () => void;
  isThinking: boolean;
  safetyVerdict: string | null;
  riskAnalysis: RiskAnalysis | null;
  onGetAlternatives: () => void;
  alternatives: SaferAlternative[] | null;
  isLoadingAlternatives: boolean;
  isBeginner: boolean;
  userProfile: UserProfile;
  onFollowUp?: (question: string) => void;
  historyItem?: HistoryItem | null;
  onReRunHistory?: () => void;
}

const ReportView: React.FC<ReportViewProps> = ({ 
  report, 
  hikeDetails,
  isLoading, 
  loadingText, 
  onDeepCheck, 
  isThinking, 
  safetyVerdict,
  riskAnalysis,
  onGetAlternatives,
  alternatives,
  isLoadingAlternatives,
  isBeginner,
  userProfile,
  onFollowUp,
  historyItem,
  onReRunHistory
}) => {
  const [showRiskDetails, setShowRiskDetails] = useState(false);
  const [showWhatIf, setShowWhatIf] = useState(false);
  
  // Gear Dropdown states
  const [showFullGearList, setShowFullGearList] = useState(false);
  const [showGearReason, setShowGearReason] = useState(false);
  
  // Local state for "What If" mode
  const [whatIfData, setWhatIfData] = useState<TripData | null>(null);
  const [whatIfRisk, setWhatIfRisk] = useState<RiskAnalysis | null>(null);
  const [whatIfWarnings, setWhatIfWarnings] = useState<WarningChip[]>([]);
  const [whatIfULScore, setWhatIfULScore] = useState(0);
  
  // Adjustments
  const [tempAdjust, setTempAdjust] = useState(0);
  const [distAdjust, setDistAdjust] = useState(0);
  const [timeAdjust, setTimeAdjust] = useState(0); // in hours
  const [weatherOverride, setWeatherOverride] = useState('');
  const [weightAdjust, setWeightAdjust] = useState(0); // in kg
  const [fitnessOverride, setFitnessOverride] = useState<string>('');

  // Share Modal State
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareFormat, setShareFormat] = useState<'minimal' | 'full' | 'detailed'>('full');
  const [shareText, setShareText] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (report?.data) {
      setWhatIfData(report.data);
      // Reset adjustments on new report load (initial)
      setTempAdjust(0);
      setDistAdjust(0);
      setTimeAdjust(0);
      setWeatherOverride('');
      setWeightAdjust(0);
      setFitnessOverride('');
      setShowFullGearList(false);
      setShowGearReason(false);
    }
  }, [report]);

  // Recalculate what-if risk when sliders move
  useEffect(() => {
    if (!report?.data || !whatIfData) return;
    
    const hypoData: TripData = {
      ...whatIfData,
      tempC: report.data.tempC + tempAdjust,
      distanceKm: Math.max(1, report.data.distanceKm + distAdjust),
      weatherCondition: weatherOverride || report.data.weatherCondition
    };

    const baseHour = 9; 
    const newHour = Math.min(23, Math.max(0, baseHour + timeAdjust));
    const hypoStartTime = `${newHour.toString().padStart(2, '0')}:00`;

    const estimatedBase = estimatePackWeight(hypoData);
    const hypoWeight = Math.max(1, estimatedBase + weightAdjust);

    const hypoUser = {
        ...userProfile,
        fitness: (fitnessOverride || userProfile.fitness) as 'low' | 'medium' | 'high'
    };

    const newRisk = calculateRiskAnalysis(hypoUser, hypoData, hypoStartTime, hypoWeight);
    const newWarnings = generateWarnings(hypoData, hypoStartTime);
    const newScore = calculateULScore(hypoWeight, hypoData);

    setWhatIfRisk(newRisk);
    setWhatIfWarnings(newWarnings);
    setWhatIfULScore(newScore);

  }, [tempAdjust, distAdjust, timeAdjust, weatherOverride, weightAdjust, fitnessOverride, report, userProfile, whatIfData]);

  const Tooltip = ({ text }: { text: string }) => (
    isBeginner ? (
      <div className="group relative inline-block ml-1 align-middle z-10">
        <IconInfo className="w-4 h-4 text-forest-400 hover:text-forest-600 cursor-help" />
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-stone-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-stone-800"></div>
        </div>
      </div>
    ) : null
  );

  // Initial Full Page Loading (Only if no report exists yet)
  if (isLoading && !report) {
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

  const effectiveData = report.data; 
  const packWeight = estimatePackWeight(effectiveData);
  const ulScore = calculateULScore(packWeight, effectiveData);
  const turnaround = calculateTurnaroundTime(effectiveData, hikeDetails.startTime, userProfile.fitness); 
  const warnings = generateWarnings(effectiveData, hikeDetails.startTime); 

  const calculateTimeline = () => {
    const startParts = hikeDetails.startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(startParts[0], startParts[1], 0);

    const turnaroundParts = turnaround.split(':').map(Number);
    const turnaroundDate = new Date();
    turnaroundDate.setHours(turnaroundParts[0], turnaroundParts[1], 0);
    if (turnaroundDate < startDate) turnaroundDate.setDate(turnaroundDate.getDate() + 1);

    const halfDurationMs = turnaroundDate.getTime() - startDate.getTime();
    const endDate = new Date(startDate.getTime() + halfDurationMs * 2);

    const formatTime = (d: Date) => d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

    return {
      start: formatTime(startDate),
      turnaround: formatTime(turnaroundDate),
      end: formatTime(endDate)
    };
  };

  const timeline = calculateTimeline();

  const generateShareCard = (format: 'minimal' | 'full' | 'detailed') => {
    const header = `TrailSense Hike Plan — ${hikeDetails.trailName}`;
    const date = `📅 ${hikeDetails.date}`;
    const riskEmoji = riskAnalysis?.level === 'Low' ? '🟢' : riskAnalysis?.level === 'Moderate' ? '🟡' : riskAnalysis?.level === 'Elevated' ? '🟠' : '🔴';
    const safety = `${riskEmoji} Safety Level: ${riskAnalysis?.level}`;
    const verdict = `Verdict: ${report.summary.verdict}`;
    const footer = `Generated by TrailSense — verify conditions before hiking`;
    const highlights = report.summary.highlights.length > 0 ? `✨ Highlights: ${report.summary.highlights.join(', ')}` : '';

    if (format === 'minimal') {
      return `\n${header}\n${date}\n🚶 ${report.summary.stats}\n⚠ Risk: ${report.summary.riskFactor}\n${safety}\n${verdict}\n${footer}`;
    } else if (format === 'full') {
        return `\n${header}\n${date} • ${hikeDetails.location}\n\n📊 Quick Stats\n• ${report.summary.stats}\n• Start: ${hikeDetails.startTime}\n• Turnaround: ${timeline.turnaround}\n• Sunset: ${effectiveData.sunsetTime || '--:--'}\n\n${safety}\n⚠ Top Risk: ${report.summary.riskFactor}\n${verdict}\n\n${highlights}\n\n🌦 Weather Snapshot\n• ${effectiveData.tempC}°C, ${effectiveData.weatherCondition}\n• Rain/Precip: check forecast\n\n🥾 Packing Essentials\n• Water, Nav, Light, First Aid, Layers\n• Recommended: ${report.ulGear}\n\n${footer}`;
    } else {
        return `\n${header}\n${date} • ${hikeDetails.location}\n\nSAFETY ANALYSIS\n${safety}\n• Main Risk: ${report.summary.riskFactor}\n• Verdict: ${report.summary.verdict}\n• Good to know: ${report.safety.pros.slice(0,2).join(', ')}\n• Watch out for: ${report.safety.cons.slice(0,3).join(', ')}\n\nROUTE & TIMING\n• ${report.summary.stats}\n• Difficulty: ${report.summary.difficulty}\n• Start: ${hikeDetails.startTime}\n• Turnaround Target: ${timeline.turnaround} (Strict)\n• Est. Finish: ${timeline.end}\n• Sunset: ${effectiveData.sunsetTime}\n• ${highlights}\n\nCONDITIONS\n• Weather: ${effectiveData.tempC}°C, ${effectiveData.weatherCondition}\n• Pack Weight Est: ~${packWeight}kg (UL Score: ${ulScore})\n\nGEAR CHECKLIST\n• 10 Essentials (Nav, Sun, Light, First Aid, Knife, Fire, Shelter, Food, Water, Clothes)\n• Special Item: ${report.ulGear}\n• Why? ${report.gearReason || 'Standard safety precaution.'}\n\n${footer}`;
    }
  };

  const handleOpenShare = () => {
    setShareFormat('full');
    setShareText(generateShareCard('full'));
    setShowShareModal(true);
  };

  const handleFormatChange = (fmt: 'minimal' | 'full' | 'detailed') => {
    setShareFormat(fmt);
    setShareText(generateShareCard(fmt));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in-up pb-20">
      
      {/* History Banner */}
      {historyItem && (
        <div className="bg-stone-100 dark:bg-stone-700 p-3 rounded-xl border border-stone-200 dark:border-stone-600 flex items-center justify-between animate-fade-in mb-4">
             <div className="flex items-center gap-2">
                 <IconHistory className="w-4 h-4 text-stone-500 dark:text-stone-400" />
                 <span className="text-sm font-semibold text-stone-600 dark:text-stone-300">
                     Viewing past plan from {new Date(historyItem.timestamp).toLocaleDateString()}
                 </span>
             </div>
             {onReRunHistory && (
                 <button 
                   onClick={onReRunHistory}
                   className="text-xs bg-forest-600 text-white px-3 py-1.5 rounded-lg hover:bg-forest-700 transition-colors flex items-center gap-1 shadow-sm"
                 >
                     <IconRefresh className="w-3 h-3" /> Re-check for Today
                 </button>
             )}
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
      <CollapsiblePanel 
        title="Trail Summary" 
        icon={<IconChart className="w-5 h-5 text-forest-600" />}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
                <span className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wider font-semibold block mb-1">
                  Difficulty
                  <Tooltip text="How hard the hike feels physically. 'Hard' usually means lots of climbing." />
                </span>
                <span className="text-lg font-bold text-stone-800 dark:text-stone-200">{report.summary.difficulty}</span>
                
                {/* TIMELINE */}
                <div className="mt-3 relative pl-3 border-l-2 border-stone-200 dark:border-stone-600 space-y-4">
                    <div className="relative">
                        <div className="absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white dark:border-stone-800"></div>
                        <p className="text-[10px] uppercase font-bold text-stone-400 leading-none">Start</p>
                        <p className="text-xs font-mono font-semibold text-stone-700 dark:text-stone-300">{timeline.start}</p>
                    </div>
                    <div className="relative">
                        <div className="absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-white dark:border-stone-800"></div>
                        <p className="text-[10px] uppercase font-bold text-stone-400 leading-none">Turnaround</p>
                        <p className="text-xs font-mono font-semibold text-stone-700 dark:text-stone-300">{timeline.turnaround}</p>
                    </div>
                    <div className="relative">
                        <div className="absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full bg-stone-400 border-2 border-white dark:border-stone-800"></div>
                        <p className="text-[10px] uppercase font-bold text-stone-400 leading-none">Finish</p>
                        <p className="text-xs font-mono font-semibold text-stone-700 dark:text-stone-300">{timeline.end}</p>
                    </div>
                </div>

            </div>
            <div>
                <span className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wider font-semibold block mb-1">
                  Route Stats
                  <Tooltip text="Distance is round-trip length. Gain is total vertical climbing." />
                </span>
                <span className="text-lg font-bold text-stone-800 dark:text-stone-200 block">{report.summary.stats}</span>
            </div>
            {/* Highlights Section */}
            <div>
                <span className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wider font-semibold block mb-1">
                  Awesome Highlights
                  <Tooltip text="Cool features to look forward to on this trail." />
                </span>
                <ul className="space-y-1 mt-1">
                  {report.summary.highlights && report.summary.highlights.length > 0 ? (
                    report.summary.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-sm font-medium text-stone-700 dark:text-stone-300">
                         <IconStar className="w-3.5 h-3.5 text-yellow-500 mt-0.5 flex-shrink-0" />
                         <span>{h}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-stone-400 italic">No specific highlights found.</li>
                  )}
                </ul>
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
      </CollapsiblePanel>

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
           
           <div className="h-2.5 w-full bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden flex">
              <div 
                className={`h-full transition-all duration-500 ${riskAnalysis.color}`} 
                style={{ width: `${(riskAnalysis.score / 10) * 100}%` }}
              ></div>
           </div>

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
      <CollapsiblePanel 
        title="Explore: What If Mode" 
        icon={<IconSettings className="w-4 h-4" />}
        defaultExpanded={false}
      >
          {/* SIMULATED DASHBOARD */}
             {whatIfRisk && (
               <div className="bg-stone-50 dark:bg-stone-900 p-4 rounded-xl border border-stone-200 dark:border-stone-700 flex flex-wrap gap-4 items-center justify-between mb-6">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-stone-400 block mb-1">New Safety Level</span>
                    <span className={`text-sm font-bold px-2 py-1 rounded ${whatIfRisk.color.replace('bg-', 'text-').replace('500', '700').replace('600', '800').replace('400', '800')}`}>
                        {whatIfRisk.level}
                    </span>
                  </div>
                  <div>
                     <span className="text-[10px] uppercase font-bold text-stone-400 block mb-1">New UL Score</span>
                     <span className={`font-mono font-bold ${whatIfULScore > 80 ? 'text-green-600' : whatIfULScore > 50 ? 'text-amber-500' : 'text-red-500'}`}>
                       {whatIfULScore}
                     </span>
                  </div>
                  {whatIfWarnings.length > 0 && (
                      <div className="flex gap-1 flex-wrap justify-end">
                          {whatIfWarnings.map((w, i) => (
                             <span key={i} className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                w.severity === 'red' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-yellow-50 text-yellow-600 border-yellow-100'
                             }`}>
                                {w.label}
                             </span>
                          ))}
                      </div>
                  )}
               </div>
             )}

             {/* CONTROLS */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                
                {/* 1. Temp Slider */}
                <div>
                   <label className="text-xs font-bold text-stone-500 uppercase flex justify-between mb-2">
                      Temperature Change
                      <span className="text-stone-800 dark:text-stone-200 bg-stone-100 dark:bg-stone-700 px-2 rounded">{tempAdjust > 0 ? '+' : ''}{tempAdjust}°C</span>
                   </label>
                   <input 
                     type="range" min="-10" max="10" step="1" 
                     value={tempAdjust} 
                     onChange={(e) => setTempAdjust(parseInt(e.target.value))}
                     className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-forest-600"
                   />
                </div>

                {/* 2. Dist Slider */}
                <div>
                   <label className="text-xs font-bold text-stone-500 uppercase flex justify-between mb-2">
                      Distance Change
                      <span className="text-stone-800 dark:text-stone-200 bg-stone-100 dark:bg-stone-700 px-2 rounded">{distAdjust > 0 ? '+' : ''}{distAdjust}km</span>
                   </label>
                   <input 
                     type="range" min="-5" max="10" step="1" 
                     value={distAdjust} 
                     onChange={(e) => setDistAdjust(parseInt(e.target.value))}
                     className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-forest-600"
                   />
                </div>

                {/* 3. Start Time Slider */}
                <div>
                   <label className="text-xs font-bold text-stone-500 uppercase flex justify-between mb-2 flex items-center gap-2">
                      <div className="flex items-center gap-1"><IconTime className="w-3 h-3"/> Start Time Change</div>
                      <span className="text-stone-800 dark:text-stone-200 bg-stone-100 dark:bg-stone-700 px-2 rounded">{timeAdjust > 0 ? '+' : ''}{timeAdjust}h</span>
                   </label>
                   <input 
                     type="range" min="-4" max="8" step="1" 
                     value={timeAdjust} 
                     onChange={(e) => setTimeAdjust(parseInt(e.target.value))}
                     className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-forest-600"
                   />
                   <p className="text-[10px] text-stone-400 mt-1 text-right">Simulates earlier or later start</p>
                </div>

                {/* 4. Pack Weight Slider */}
                <div>
                   <label className="text-xs font-bold text-stone-500 uppercase flex justify-between mb-2 flex items-center gap-2">
                      <div className="flex items-center gap-1"><IconWeight className="w-3 h-3"/> Pack Weight</div>
                      <span className="text-stone-800 dark:text-stone-200 bg-stone-100 dark:bg-stone-700 px-2 rounded">{weightAdjust > 0 ? '+' : ''}{weightAdjust}kg</span>
                   </label>
                   <input 
                     type="range" min="-5" max="15" step="1" 
                     value={weightAdjust} 
                     onChange={(e) => setWeightAdjust(parseInt(e.target.value))}
                     className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-forest-600"
                   />
                   <p className="text-[10px] text-stone-400 mt-1 text-right">Heavier pack affects Risk & Score</p>
                </div>
                
                 {/* 5. Fitness Level Override */}
                <div>
                   <label className="text-xs font-bold text-stone-500 uppercase flex justify-between mb-2 flex items-center gap-2">
                      <div className="flex items-center gap-1"><IconChart className="w-3 h-3"/> Fitness Level</div>
                   </label>
                   <div className="flex bg-stone-200 dark:bg-stone-700 p-1 rounded-lg">
                      {['low', 'medium', 'high'].map(lvl => (
                          <button
                            key={lvl}
                            onClick={() => setFitnessOverride(lvl)}
                            className={`flex-1 py-1.5 text-xs font-medium rounded capitalize transition-all ${
                                (fitnessOverride || userProfile.fitness) === lvl 
                                ? 'bg-white dark:bg-stone-600 text-forest-700 dark:text-forest-300 shadow-sm' 
                                : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
                            }`}
                          >
                             {lvl}
                          </button>
                      ))}
                   </div>
                   <p className="text-[10px] text-stone-400 mt-1 text-right">See how improved fitness lowers risk</p>
                </div>

                {/* 6. Weather Select */}
                <div className="md:col-span-2">
                   <label className="text-xs font-bold text-stone-500 uppercase block mb-2 flex items-center gap-1">
                      <IconCloud className="w-3 h-3" /> Weather Override
                   </label>
                   <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                      {[
                          { val: '', label: 'Original' },
                          { val: 'Clear Sunny', label: '☀️ Sunny' },
                          { val: 'Rainy Wet', label: '🌧️ Rainy' },
                          { val: 'Thunder Storm', label: '⚡ Storm' },
                          { val: 'Snowy Ice', label: '❄️ Snowy' },
                          { val: 'Foggy Mist', label: '🌫️ Foggy' },
                      ].map((opt) => (
                        <button
                           key={opt.val}
                           onClick={() => setWeatherOverride(opt.val)}
                           className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors whitespace-nowrap ${
                             weatherOverride === opt.val 
                               ? 'bg-forest-600 text-white border-forest-600' 
                               : 'bg-white dark:bg-stone-700 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-600 hover:bg-stone-50 dark:hover:bg-stone-600'
                           }`}
                        >
                           {opt.label}
                        </button>
                      ))}
                   </div>
                </div>

             </div>
      </CollapsiblePanel>

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
      <CollapsiblePanel title="Safety Breakdown" icon={<IconShield className="w-5 h-5 text-amber-600" />}>
        <div className="grid md:grid-cols-3 gap-6">
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
            <div className="mt-6 pt-4 border-t border-amber-100 dark:border-amber-900/30">
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
            <div className="mt-4 animate-fade-in">
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
        <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-stone-100 dark:border-stone-700">
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
      </CollapsiblePanel>

      {/* GEAR */}
      <CollapsiblePanel 
        title="Packing Weight & UL Score"
        icon={<IconScale className="w-5 h-5 text-forest-600" />}
      >
        <div className="space-y-6">
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
                    <p className="text-xs text-stone-700 dark:text-stone-300 font-bold">{report.ulGear}</p>
                    
                    {/* NEW: Interactive Gear Dropdowns */}
                    <div className="mt-3 space-y-2">
                        {/* Why this gear? */}
                        <div>
                            <button 
                                onClick={() => setShowGearReason(!showGearReason)}
                                className="text-[10px] uppercase font-bold text-stone-500 hover:text-forest-600 flex items-center gap-1 transition-colors"
                            >
                                {showGearReason ? 'Hide Reasoning' : 'Why this gear?'}
                                <span className={`transition-transform ${showGearReason ? 'rotate-180' : ''}`}>▼</span>
                            </button>
                            {showGearReason && (
                                <p className="mt-1 text-xs text-stone-600 dark:text-stone-400 animate-fade-in pl-2 border-l-2 border-forest-200">
                                    {report.gearReason || "Based on current weather and trail conditions."}
                                </p>
                            )}
                        </div>

                        {/* Full Packing List */}
                        <div>
                            <button 
                                onClick={() => setShowFullGearList(!showFullGearList)}
                                className="text-[10px] uppercase font-bold text-stone-500 hover:text-forest-600 flex items-center gap-1 transition-colors"
                            >
                                {showFullGearList ? 'Hide Full List' : 'Full Packing List'}
                                <span className={`transition-transform ${showFullGearList ? 'rotate-180' : ''}`}>▼</span>
                            </button>
                            {showFullGearList && report.gearList && report.gearList.length > 0 && (
                                <ul className="mt-1 space-y-1 animate-fade-in pl-2 border-l-2 border-forest-200">
                                    {report.gearList.map((item, idx) => (
                                        <li key={idx} className="text-xs text-stone-600 dark:text-stone-400 flex items-start gap-1.5">
                                            <span className="mt-1 w-1 h-1 bg-stone-400 rounded-full flex-shrink-0"></span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    <p className="text-[10px] text-stone-400 dark:text-stone-500 italic mt-3 leading-tight">
                        the ai may have hallucintaed, also this is not sponsored
                    </p>
                </div>
            </div>
        </div>
      </CollapsiblePanel>

      {/* Share Plan Button (Moved from sidebar to bottom here as well if needed, but it's in sidebar now) */}
      <button 
        onClick={handleOpenShare}
        className="w-full py-3 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-bold text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
        <IconShare className="w-4 h-4" />
        Share Plan
        </button>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-stone-900 w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-700 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-stone-100 dark:border-stone-800 flex justify-between items-center bg-stone-50 dark:bg-stone-900/50">
                    <h3 className="font-bold text-lg text-stone-800 dark:text-stone-200">Share Hike Plan</h3>
                    <button onClick={() => setShowShareModal(false)} className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200">
                        ✕
                    </button>
                </div>
                
                <div className="p-4 border-b border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 sticky top-0 z-10">
                    <div className="flex bg-stone-100 dark:bg-stone-800 p-1 rounded-lg">
                        {(['minimal', 'full', 'detailed'] as const).map((fmt) => (
                            <button
                                key={fmt}
                                onClick={() => handleFormatChange(fmt)}
                                className={`flex-1 py-2 text-xs font-bold uppercase rounded-md transition-all ${
                                    shareFormat === fmt 
                                    ? 'bg-white dark:bg-stone-700 text-forest-600 dark:text-forest-400 shadow-sm' 
                                    : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
                                }`}
                            >
                                {fmt}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-stone-50 dark:bg-stone-950/30">
                    <pre className="whitespace-pre-wrap font-mono text-xs text-stone-600 dark:text-stone-300 bg-white dark:bg-stone-800 p-4 rounded-xl border border-stone-200 dark:border-stone-700 shadow-sm">
                        {shareText}
                    </pre>
                </div>

                <div className="p-4 bg-white dark:bg-stone-900 border-t border-stone-100 dark:border-stone-800">
                    <button 
                        onClick={handleCopy}
                        className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                            copied 
                            ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' 
                            : 'bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-stone-900 dark:hover:bg-white shadow-lg'
                        }`}
                    >
                        {copied ? <IconCheck className="w-4 h-4" /> : <IconShare className="w-4 h-4" />}
                        {copied ? 'Copied to Clipboard!' : 'Copy Text'}
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default ReportView;