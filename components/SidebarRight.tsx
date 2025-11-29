import React, { useState, useEffect, useRef } from 'react';
import { HistoryItem, HikeDetails, UserProfile, RecommendedTrail, ChatMessage } from '../types';
import { IconHistory, IconTrash, IconBot, IconSend, IconSparkles, IconMap } from './Icons';
import { getTrailTips, getRecommendedTrails, generateTripReport } from '../services/gemini';
import { CollapsiblePanel } from './CollapsiblePanel';

interface SidebarRightProps {
  history: HistoryItem[];
  activeHistoryItem: HistoryItem | null;
  onLoadHistoryItem: (item: HistoryItem) => void;
  onDeleteHistoryItem: (id: string, e: React.MouseEvent) => void;
  hikeDetails: HikeDetails;
  userProfile: UserProfile;
  // Chat props
  onFollowUp: (question: string) => void;
  isThinking: boolean;
}

export const SidebarRight: React.FC<SidebarRightProps> = ({
  history,
  activeHistoryItem,
  onLoadHistoryItem,
  onDeleteHistoryItem,
  hikeDetails,
  userProfile,
  onFollowUp,
  isThinking
}) => {
  // Chat State
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
      { role: 'model', text: "I've analyzed the trail conditions. Need to adjust anything?" }
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Async Data State
  const [tips, setTips] = useState<string[]>([]);
  const [loadingTips, setLoadingTips] = useState(false);
  const [recs, setRecs] = useState<RecommendedTrail[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

  // Load async content when hike details change (and valid)
  useEffect(() => {
    if (hikeDetails.trailName && hikeDetails.location) {
      setLoadingTips(true);
      getTrailTips(userProfile, hikeDetails).then(t => {
        setTips(t);
        setLoadingTips(false);
      });

      setLoadingRecs(true);
      getRecommendedTrails(hikeDetails).then(r => {
        setRecs(r);
        setLoadingRecs(false);
      });
      
      // Reset chat on new hike
      setChatHistory([{ role: 'model', text: "I've analyzed the trail conditions. Need to adjust anything?" }]);
    }
  }, [hikeDetails.trailName, hikeDetails.location]);

  // Scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isThinking]);

  const handleSubmitChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      setChatHistory(prev => [...prev, { role: 'user', text: chatInput }]);
      onFollowUp(chatInput);
      setChatInput('');
      // Simulate AI thinking response in chat (actual response comes from parent re-render effect usually, or we assume success)
      // For now, parent `onFollowUp` triggers a full report regen. 
      // We can add a "Thinking..." message here managed by `isThinking` prop.
    }
  };

  // Effect to add AI response when thinking finishes
  const prevThinking = useRef(isThinking);
  useEffect(() => {
      if (prevThinking.current && !isThinking) {
          setChatHistory(prev => [...prev, { role: 'model', text: "I've updated the plan based on your request." }]);
      }
      prevThinking.current = isThinking;
  }, [isThinking]);


  return (
    <div className="w-full space-y-6">
      
      {/* 1. Previous Plans */}
      {history.length > 0 && (
        <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 overflow-hidden">
            <div className="p-4 border-b border-stone-100 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 flex items-center gap-2">
                <IconHistory className="w-5 h-5 text-stone-500 dark:text-stone-400" />
                <h3 className="font-bold text-stone-700 dark:text-stone-300">Previous Plans</h3>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
                {history.map((item) => (
                    <div 
                    key={item.id} 
                    onClick={() => onLoadHistoryItem(item)}
                    className={`p-4 border-b border-stone-100 dark:border-stone-700 cursor-pointer transition-colors relative group ${
                        activeHistoryItem?.id === item.id ? 'bg-forest-50 dark:bg-forest-900/20 border-forest-100 dark:border-forest-800' : 'hover:bg-stone-50 dark:hover:bg-stone-700/50'
                    }`}
                    >
                    <div className="flex justify-between items-start">
                        <h4 className="font-bold text-sm text-stone-800 dark:text-stone-200 line-clamp-1">{item.trailName}</h4>
                        <button 
                            onClick={(e) => onDeleteHistoryItem(item.id, e)}
                            className="text-stone-300 hover:text-red-500 transition-colors p-1"
                        >
                            <IconTrash className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{new Date(item.timestamp).toLocaleDateString()} • {item.riskAnalysis.level}</p>
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* 2. AI Follow-up Panel */}
      <CollapsiblePanel 
        title="Trip Assistant" 
        icon={<IconBot className="w-4 h-4 text-forest-600" />}
        defaultExpanded={true}
      >
         <div className="flex flex-col h-[250px]">
            <div className="flex-1 overflow-y-auto p-2 space-y-3 scrollbar-hide">
                {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[90%] p-2 rounded-xl text-xs ${
                            msg.role === 'user' 
                            ? 'bg-forest-600 text-white rounded-br-none' 
                            : 'bg-stone-100 dark:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-bl-none'
                        }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isThinking && (
                    <div className="flex justify-start">
                        <div className="bg-stone-100 dark:bg-stone-700 p-2 rounded-xl rounded-bl-none flex gap-1 items-center">
                            <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce"></div>
                            <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce delay-75"></div>
                            <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce delay-150"></div>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>
            <div className="pt-2 border-t border-stone-100 dark:border-stone-700 mt-2">
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        placeholder="Ask follow-up..."
                        className="flex-1 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-600 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-forest-500 outline-none text-stone-800 dark:text-stone-200"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSubmitChat(e)}
                        disabled={isThinking}
                    />
                    <button 
                        onClick={handleSubmitChat}
                        disabled={!chatInput.trim() || isThinking}
                        className="p-2 bg-forest-600 text-white rounded-lg hover:bg-forest-700 disabled:opacity-50 transition-colors"
                    >
                        <IconSend className="w-4 h-4" />
                    </button>
                </div>
            </div>
         </div>
      </CollapsiblePanel>

      {/* 3. Trail Tips Panel */}
      <CollapsiblePanel 
        title="Smart Trail Tips" 
        icon={<IconSparkles className="w-4 h-4 text-amber-500" />}
        defaultExpanded={true}
      >
         {loadingTips ? (
             <div className="space-y-2 animate-pulse">
                 <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-3/4"></div>
                 <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-1/2"></div>
                 <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-5/6"></div>
             </div>
         ) : tips.length > 0 ? (
             <ul className="space-y-2">
                 {tips.map((tip, i) => (
                     <li key={i} className="flex items-start gap-2 text-xs text-stone-700 dark:text-stone-300">
                         <span className="mt-1 w-1.5 h-1.5 bg-forest-500 rounded-full flex-shrink-0"></span>
                         {tip}
                     </li>
                 ))}
             </ul>
         ) : (
             <p className="text-xs text-stone-400 italic">No specific tips found.</p>
         )}
      </CollapsiblePanel>

      {/* 4. Recommended Next Trails */}
      <CollapsiblePanel 
        title="Recommended Next Trails" 
        icon={<IconMap className="w-4 h-4 text-blue-500" />}
        defaultExpanded={false}
      >
          {loadingRecs ? (
             <div className="space-y-3 animate-pulse">
                 <div className="h-12 bg-stone-200 dark:bg-stone-700 rounded-lg"></div>
                 <div className="h-12 bg-stone-200 dark:bg-stone-700 rounded-lg"></div>
             </div>
          ) : recs.length > 0 ? (
              <div className="space-y-3">
                  {recs.map((rec, i) => (
                      <div key={i} className="p-3 bg-stone-50 dark:bg-stone-900 rounded-lg border border-stone-100 dark:border-stone-700">
                          <h4 className="font-bold text-xs text-stone-800 dark:text-stone-200">{rec.name}</h4>
                          <p className="text-[10px] text-stone-500 dark:text-stone-400">{rec.location} • {rec.difficulty}</p>
                          <p className="text-[10px] text-forest-600 dark:text-forest-400 mt-1 italic">"{rec.reason}"</p>
                      </div>
                  ))}
              </div>
          ) : (
              <p className="text-xs text-stone-400 italic">No recommendations found.</p>
          )}
      </CollapsiblePanel>

    </div>
  );
};