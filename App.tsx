
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import ChatAssistant from './components/ChatAssistant';
import ReportView from './components/ReportView';
import DisclaimerModal from './components/DisclaimerModal';
import { UserProfile, HikeDetails, ExperienceLevel, TripReport, RiskAnalysis, SaferAlternative, HistoryItem } from './types';
import { generateTripReport, getQuickTip, performDeepSafetyCheck, generateSaferAlternatives } from './services/gemini';
import { IconMountain, IconSparkles, IconInfo, IconHistory, IconTrash } from './components/Icons';
import { calculateRiskAnalysis } from './utils/riskUtils';

const App: React.FC = () => {
  // Disclaimer State
  const [hasAgreed, setHasAgreed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('trailsense_agreed_liability') === 'true';
    }
    return false;
  });

  const handleAgree = () => {
    localStorage.setItem('trailsense_agreed_liability', 'true');
    setHasAgreed(true);
  };

  // State
  const [step, setStep] = useState<'form' | 'report'>('form');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingText, setLoadingText] = useState("Planning your hike...");
  const [quickTip, setQuickTip] = useState<string | null>(null);
  const [isGettingTip, setIsGettingTip] = useState(false);
  const [beginnerMode, setBeginnerMode] = useState(false);
  
  // Data
  const [userProfile, setUserProfile] = useState<UserProfile>({
    experience: ExperienceLevel.INTERMEDIATE,
    fitness: 'medium',
  });
  
  const [hikeDetails, setHikeDetails] = useState<HikeDetails>({
    trailName: '',
    location: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    distanceKm: 0,
    notes: ''
  });

  // Results
  const [report, setReport] = useState<TripReport | null>(null);
  const [riskAnalysis, setRiskAnalysis] = useState<RiskAnalysis | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [safetyVerdict, setSafetyVerdict] = useState<string | null>(null);
  const [alternatives, setAlternatives] = useState<SaferAlternative[] | null>(null);
  const [loadingAlternatives, setLoadingAlternatives] = useState(false);

  // History State
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeHistoryItem, setActiveHistoryItem] = useState<HistoryItem | null>(null);

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem('trailsense_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  const saveToHistory = (newReport: TripReport, risk: RiskAnalysis) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      trailName: hikeDetails.trailName,
      userProfile,
      hikeDetails,
      report: newReport,
      riskAnalysis: risk
    };

    const updatedHistory = [newItem, ...history].slice(0, 20); // Keep last 20
    setHistory(updatedHistory);
    localStorage.setItem('trailsense_history', JSON.stringify(updatedHistory));
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    localStorage.setItem('trailsense_history', JSON.stringify(updated));
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setHikeDetails(item.hikeDetails);
    setUserProfile(item.userProfile);
    setReport(item.report);
    setRiskAnalysis(item.riskAnalysis);
    setActiveHistoryItem(item);
    setSafetyVerdict(null);
    setAlternatives(null);
    setStep('report');
  };

  // Handlers
  const handleInputChange = (field: keyof HikeDetails, value: string | number) => {
    setHikeDetails(prev => ({ ...prev, [field]: value }));
    // Reset tips if location changes significantly
    if (field === 'trailName') setQuickTip(null);
  };

  // Fast Model: Get a quick tip when trail name loses focus
  const handleBlurTrailName = async () => {
    if (hikeDetails.trailName.length > 3 && !quickTip) {
      setIsGettingTip(true);
      const tip = await getQuickTip(hikeDetails);
      setQuickTip(tip);
      setIsGettingTip(false);
    }
  };

  // Main Model: Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hikeDetails.trailName || !hikeDetails.location) return;

    setStep('report');
    setReport(null);
    setRiskAnalysis(null);
    setAlternatives(null);
    setActiveHistoryItem(null); // New run, not history

    setLoadingText("Checking weather and trail conditions...");
    setIsGenerating(true);
    
    // Generate the full grounded report with beginner mode preference
    const result = await generateTripReport(userProfile, hikeDetails, beginnerMode);
    
    // Calculate internal risk score based on the data returned by AI/Maps
    const risk = calculateRiskAnalysis(userProfile, result.data, hikeDetails.startTime);
    
    setReport(result);
    setRiskAnalysis(risk);
    setIsGenerating(false);

    // Save this run
    saveToHistory(result, risk);
  };

  const handleReRunHistory = async () => {
    if (!activeHistoryItem) return;
    
    // Use saved details but current date if in past? Or just keep same?
    // User requested "Re-run with current conditions", so we assume "today" or keeping the planned date but re-checking weather.
    // For simplicity, we just re-submit the saved details as a new request.
    setStep('report');
    setReport(null);
    setRiskAnalysis(null);
    setAlternatives(null);
    setActiveHistoryItem(null);
    
    setLoadingText("Re-checking conditions for today...");
    setIsGenerating(true);

    const result = await generateTripReport(userProfile, hikeDetails, beginnerMode);
    const risk = calculateRiskAnalysis(userProfile, result.data, hikeDetails.startTime);
    
    setReport(result);
    setRiskAnalysis(risk);
    setIsGenerating(false);
    saveToHistory(result, risk);
  }

  // Handle Follow-up Question
  const handleFollowUp = async (question: string) => {
    if (!report) return;
    
    setLoadingText("Updating your plan...");
    setIsGenerating(true);
    // Combine the previous report components into a text context
    const previousContext = `
      SUMMARY: ${JSON.stringify(report.summary)}
      SAFETY: ${JSON.stringify(report.safety)}
      CONTENT: ${report.markdownContent}
    `;

    const result = await generateTripReport(userProfile, hikeDetails, beginnerMode, question, previousContext);
    
    // Recalculate risk if data changed
    const risk = calculateRiskAnalysis(userProfile, result.data, hikeDetails.startTime);
    
    setReport(result);
    setRiskAnalysis(risk);
    setIsGenerating(false);
  };

  // Pro Model: Deep Safety Check
  const handleSafetyCheck = async () => {
    setIsThinking(true);
    const verdict = await performDeepSafetyCheck(userProfile, hikeDetails);
    setSafetyVerdict(verdict);
    setIsThinking(false);
  };

  // Get Safer Alternatives
  const handleGetAlternatives = async () => {
    if (!report || !riskAnalysis) return;
    setLoadingAlternatives(true);
    const alts = await generateSaferAlternatives(userProfile, hikeDetails, riskAnalysis);
    setAlternatives(alts);
    setLoadingAlternatives(false);
  };

  // Tooltip Helper
  const Tooltip = ({ text }: { text: string }) => (
    beginnerMode ? (
      <div className="group relative inline-block ml-1 align-middle z-10">
        <IconInfo className="w-4 h-4 text-forest-400 hover:text-forest-600 cursor-help" />
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-stone-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-stone-800"></div>
        </div>
      </div>
    ) : null
  );

  return (
    <Layout>
      {/* Liability Warning Modal */}
      {!hasAgreed && <DisclaimerModal onAgree={handleAgree} />}

      <div className="flex flex-col md:flex-row gap-6">
        
        {/* Main Content Area */}
        <div className="flex-1">
          {step === 'form' ? (
            <div className="max-w-2xl mx-auto animate-fade-in-up">
              <div className="mb-8 text-center">
                <h2 className="text-3xl font-bold text-forest-900 dark:text-forest-200 mb-2">Plan Your Next Adventure</h2>
                <p className="text-stone-600 dark:text-stone-400">Tell us where you're going, and TrailSense will check the conditions.</p>
              </div>

              <form onSubmit={handleSubmit} className="bg-white dark:bg-stone-800 p-6 md:p-8 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 space-y-6">
                
                {/* Beginner Mode Toggle */}
                <div className="flex items-center justify-between bg-forest-50 dark:bg-forest-900/30 p-4 rounded-xl border border-forest-100 dark:border-forest-800">
                  <div className="flex items-center gap-3">
                    <div className="bg-white dark:bg-stone-700 p-2 rounded-full text-forest-600 dark:text-forest-400 shadow-sm">
                      <IconSparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-stone-800 dark:text-stone-200 text-sm">Beginner Mode</h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400">Simple explanations and safer suggestions.</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={beginnerMode} onChange={(e) => setBeginnerMode(e.target.checked)} />
                    <div className="w-11 h-6 bg-stone-200 dark:bg-stone-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-forest-300 dark:peer-focus:ring-forest-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-forest-600"></div>
                  </label>
                </div>

                {/* User Profile Section */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
                      Experience <Tooltip text="How comfortable are you outdoors? Be honest for safer advice." />
                    </label>
                    <select 
                      className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg p-3 text-stone-800 dark:text-stone-200 focus:ring-2 focus:ring-forest-300 outline-none"
                      value={userProfile.experience}
                      onChange={(e) => setUserProfile({...userProfile, experience: e.target.value as ExperienceLevel})}
                    >
                      {Object.values(ExperienceLevel).map(level => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
                      Fitness <Tooltip text="Low: Walk occasionally. Medium: Regular exercise. High: Athlete/Endurance." />
                    </label>
                    <select 
                      className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg p-3 text-stone-800 dark:text-stone-200 focus:ring-2 focus:ring-forest-300 outline-none"
                      value={userProfile.fitness}
                      onChange={(e) => setUserProfile({...userProfile, fitness: e.target.value as any})}
                    >
                      <option value="low">Casual</option>
                      <option value="medium">Active</option>
                      <option value="high">Athlete</option>
                    </select>
                  </div>
                </div>

                <hr className="border-stone-100 dark:border-stone-700" />

                {/* Hike Details */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                      Trail Name / Area <Tooltip text="The specific trail you want to hike. We'll look up its details." />
                    </label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Angels Landing"
                      className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg p-3 outline-none focus:ring-2 focus:ring-forest-300 text-stone-800 dark:text-stone-100 placeholder-stone-400"
                      value={hikeDetails.trailName}
                      onChange={(e) => handleInputChange('trailName', e.target.value)}
                      onBlur={handleBlurTrailName}
                    />
                    
                    {/* Fast AI Tip Bubble */}
                    {(quickTip || isGettingTip) && (
                      <div className="mt-2 flex items-start space-x-2 text-sm text-forest-700 dark:text-forest-300 bg-forest-50 dark:bg-forest-900/30 p-3 rounded-lg animate-fade-in">
                        <IconSparkles className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <p>{isGettingTip ? 'Checking basic info...' : quickTip}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Nearest City/Park</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Zion National Park, Utah"
                      className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg p-3 outline-none focus:ring-2 focus:ring-forest-300 text-stone-800 dark:text-stone-100 placeholder-stone-400"
                      value={hikeDetails.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                        Start Date <Tooltip text="Weather changes daily. Check close to your trip." />
                      </label>
                      <input 
                        type="date"
                        required
                        className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg p-3 outline-none focus:ring-2 focus:ring-forest-300 text-stone-800 dark:text-stone-100"
                        value={hikeDetails.date}
                        onChange={(e) => handleInputChange('date', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                        Start Time <Tooltip text="Aim for morning to avoid hiking in the dark." />
                      </label>
                      <input 
                        type="time"
                        required
                        className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg p-3 outline-none focus:ring-2 focus:ring-forest-300 text-stone-800 dark:text-stone-100"
                        value={hikeDetails.startTime}
                        onChange={(e) => handleInputChange('startTime', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Notes Input */}
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Notes / Gear / Specific Goals</label>
                    <textarea
                      className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg p-3 outline-none focus:ring-2 focus:ring-forest-300 h-24 resize-none text-stone-800 dark:text-stone-100 placeholder-stone-400"
                      placeholder="e.g. I have hiking boots but no poles. Looking for good photography spots."
                      value={hikeDetails.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                    />
                  </div>

                </div>

                <button 
                  type="submit"
                  disabled={isGenerating}
                  className="w-full bg-forest-600 hover:bg-forest-700 text-white font-bold py-4 rounded-xl shadow-lg transition-transform transform active:scale-95 flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <IconMountain className="w-5 h-5" />
                  <span>{isGenerating ? 'Analyzing Trail...' : 'Check Conditions'}</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <button 
                    onClick={() => { setStep('form'); setReport(null); setSafetyVerdict(null); setRiskAnalysis(null); setAlternatives(null); setActiveHistoryItem(null); }}
                    className="text-sm text-stone-500 dark:text-stone-400 hover:text-forest-600 dark:hover:text-forest-400 flex items-center transition-colors"
                >
                    ← Back to Plan
                </button>
              </div>
              
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">{hikeDetails.trailName}</h2>
                <p className="text-stone-500 dark:text-stone-400 font-medium">{hikeDetails.location} • {new Date(hikeDetails.date).toLocaleDateString()}</p>
              </div>

              <ReportView 
                report={report} 
                isLoading={isGenerating} 
                loadingText={loadingText}
                onDeepCheck={handleSafetyCheck}
                isThinking={isThinking}
                safetyVerdict={safetyVerdict}
                onFollowUp={handleFollowUp}
                riskAnalysis={riskAnalysis}
                onGetAlternatives={handleGetAlternatives}
                alternatives={alternatives}
                isLoadingAlternatives={loadingAlternatives}
                historyItem={activeHistoryItem}
                onReRunHistory={handleReRunHistory}
                isBeginner={beginnerMode}
                userProfile={userProfile}
              />
            </div>
          )}
        </div>

        {/* History Sidebar (Desktop) / Section (Mobile) */}
        {history.length > 0 && (
          <div className="w-full md:w-80 flex-shrink-0 mt-8 md:mt-0 animate-fade-in">
             <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 overflow-hidden sticky top-24">
                <div className="p-4 border-b border-stone-100 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 flex items-center gap-2">
                   <IconHistory className="w-5 h-5 text-stone-500 dark:text-stone-400" />
                   <h3 className="font-bold text-stone-700 dark:text-stone-300">Previous Plans</h3>
                </div>
                <div className="max-h-[500px] overflow-y-auto">
                   {history.map((item) => (
                     <div 
                       key={item.id} 
                       onClick={() => loadHistoryItem(item)}
                       className={`p-4 border-b border-stone-100 dark:border-stone-700 cursor-pointer transition-colors relative group ${
                         activeHistoryItem?.id === item.id ? 'bg-forest-50 dark:bg-forest-900/20 border-forest-100 dark:border-forest-800' : 'hover:bg-stone-50 dark:hover:bg-stone-700/50'
                       }`}
                     >
                        <div className="flex justify-between items-start">
                           <h4 className="font-bold text-sm text-stone-800 dark:text-stone-200 line-clamp-1">{item.trailName}</h4>
                           <button 
                              onClick={(e) => deleteHistoryItem(item.id, e)}
                              className="text-stone-300 hover:text-red-500 transition-colors p-1"
                           >
                              <IconTrash className="w-4 h-4" />
                           </button>
                        </div>
                        <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{new Date(item.timestamp).toLocaleDateString()} • {item.riskAnalysis.level}</p>
                        <p className="text-xs text-stone-400 dark:text-stone-500 mt-2 line-clamp-2">{item.report.summary.verdict}</p>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        )}

      </div>

      {/* Persistent Chat */}
      <ChatAssistant />
    </Layout>
  );
};

export default App;
