import React, { useState } from 'react';
import Layout from './components/Layout';
import ChatAssistant from './components/ChatAssistant';
import ReportView from './components/ReportView';
import { UserProfile, HikeDetails, ExperienceLevel, TripReport } from './types';
import { generateTripReport, getQuickTip, performDeepSafetyCheck } from './services/gemini';
import { IconMountain, IconSparkles } from './components/Icons';

const App: React.FC = () => {
  // State
  const [step, setStep] = useState<'form' | 'report'>('form');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingText, setLoadingText] = useState("Planning your hike...");
  const [quickTip, setQuickTip] = useState<string | null>(null);
  const [isGettingTip, setIsGettingTip] = useState(false);
  
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
  const [isThinking, setIsThinking] = useState(false);
  const [safetyVerdict, setSafetyVerdict] = useState<string | null>(null);

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
    setLoadingText("Checking weather and trail conditions...");
    setIsGenerating(true);
    
    // Generate the full grounded report
    const result = await generateTripReport(userProfile, hikeDetails);
    setReport(result);
    setIsGenerating(false);
  };

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

    const result = await generateTripReport(userProfile, hikeDetails, question, previousContext);
    setReport(result);
    setIsGenerating(false);
  };

  // Pro Model: Deep Safety Check
  const handleSafetyCheck = async () => {
    setIsThinking(true);
    const verdict = await performDeepSafetyCheck(userProfile, hikeDetails);
    setSafetyVerdict(verdict);
    setIsThinking(false);
  };

  return (
    <Layout>
      {step === 'form' ? (
        <div className="max-w-2xl mx-auto animate-fade-in-up">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-forest-900 mb-2">Plan Your Next Adventure</h2>
            <p className="text-stone-600">Tell us where you're going, and TrailSense will check the conditions.</p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-stone-200 space-y-6">
            
            {/* User Profile Section */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">Experience</label>
                <select 
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg p-3 text-stone-800 focus:ring-2 focus:ring-forest-300 outline-none"
                  value={userProfile.experience}
                  onChange={(e) => setUserProfile({...userProfile, experience: e.target.value as ExperienceLevel})}
                >
                  {Object.values(ExperienceLevel).map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">Fitness</label>
                <select 
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg p-3 text-stone-800 focus:ring-2 focus:ring-forest-300 outline-none"
                  value={userProfile.fitness}
                  onChange={(e) => setUserProfile({...userProfile, fitness: e.target.value as any})}
                >
                  <option value="low">Casual</option>
                  <option value="medium">Active</option>
                  <option value="high">Athlete</option>
                </select>
              </div>
            </div>

            <hr className="border-stone-100" />

            {/* Hike Details */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Trail Name / Area</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Angels Landing"
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-forest-300"
                  value={hikeDetails.trailName}
                  onChange={(e) => handleInputChange('trailName', e.target.value)}
                  onBlur={handleBlurTrailName}
                />
                
                {/* Fast AI Tip Bubble */}
                {(quickTip || isGettingTip) && (
                  <div className="mt-2 flex items-start space-x-2 text-sm text-forest-700 bg-forest-50 p-3 rounded-lg animate-fade-in">
                    <IconSparkles className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p>{isGettingTip ? 'Checking basic info...' : quickTip}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Nearest City/Park</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Zion National Park, Utah"
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-forest-300"
                  value={hikeDetails.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-stone-700 mb-1">Start Date</label>
                   <input 
                    type="date"
                    required
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-forest-300"
                    value={hikeDetails.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                   />
                </div>
                <div>
                   <label className="block text-sm font-medium text-stone-700 mb-1">Start Time</label>
                   <input 
                    type="time"
                    required
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-forest-300"
                    value={hikeDetails.startTime}
                    onChange={(e) => handleInputChange('startTime', e.target.value)}
                   />
                </div>
              </div>

              {/* Notes Input */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Notes / Gear / Specific Goals</label>
                <textarea
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-forest-300 h-24 resize-none"
                  placeholder="e.g. I have hiking boots but no poles. Looking for good photography spots."
                  value={hikeDetails.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                />
              </div>

            </div>

            <button 
              type="submit"
              disabled={isGenerating}
              className="w-full bg-forest-600 hover:bg-forest-700 text-white font-bold py-4 rounded-xl shadow-lg transition-transform transform active:scale-95 flex items-center justify-center space-x-2"
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
                onClick={() => { setStep('form'); setReport(null); setSafetyVerdict(null); }}
                className="text-sm text-stone-500 hover:text-forest-600 flex items-center transition-colors"
            >
                ← Back to Plan
            </button>
          </div>
          
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-stone-900 tracking-tight">{hikeDetails.trailName}</h2>
            <p className="text-stone-500 font-medium">{hikeDetails.location} • {new Date(hikeDetails.date).toLocaleDateString()}</p>
          </div>

          <ReportView 
            report={report} 
            isLoading={isGenerating} 
            loadingText={loadingText}
            onDeepCheck={handleSafetyCheck}
            isThinking={isThinking}
            safetyVerdict={safetyVerdict}
            onFollowUp={handleFollowUp}
          />
        </div>
      )}

      {/* Persistent Chat */}
      <ChatAssistant />
    </Layout>
  );
};

export default App;