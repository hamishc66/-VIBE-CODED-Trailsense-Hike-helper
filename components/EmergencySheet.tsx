import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { EmergencyContactData } from '../types';
import { CollapsiblePanel } from './CollapsiblePanel';
import { generateEmergencySheet } from '../services/gemini';
import { IconWarning, IconUser, IconPhone, IconMap, IconCompass, IconCloud, IconFileText, IconPrinter, IconClipboard, IconCheck } from './Icons';

export const EmergencySheet: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState(true);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState<EmergencyContactData>({
    fullName: '', phone: '', email: '', age: '', medicalConditions: '', allergies: '', medications: '', bloodType: '', vehicleInfo: '',
    contactName: '', contactRelationship: '', contactPhone: '', contactEmail: '',
    tripName: '', trailhead: '', region: '', route: '', startDateTime: '', returnDateTime: '', groupMembers: '', campsites: '',
    plbInfo: '', navMethod: '', gearChecklist: [],
    weather: '', terrain: 'Moderate', hazards: ''
  });

  const handleChange = (field: keyof EmergencyContactData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGearToggle = (item: string) => {
    setFormData(prev => {
      const current = prev.gearChecklist;
      if (current.includes(item)) return { ...prev, gearChecklist: current.filter(i => i !== item) };
      return { ...prev, gearChecklist: [...current, item] };
    });
  };

  const handleSubmit = async () => {
    setIsGenerating(true);
    const result = await generateEmergencySheet(formData);
    setGeneratedContent(result);
    setIsGenerating(false);
  };

  const handleCopy = () => {
    if (generatedContent) {
      navigator.clipboard.writeText(generatedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && generatedContent) {
        // Simple markdown-to-html conversion for print using a basic template
        const htmlContent = `
            <html>
            <head>
                <title>Emergency Sheet - ${formData.tripName}</title>
                <style>
                    body { font-family: sans-serif; padding: 40px; color: #333; line-height: 1.5; }
                    h1 { border-bottom: 2px solid #333; padding-bottom: 10px; }
                    h2 { background: #eee; padding: 5px 10px; margin-top: 30px; border-left: 5px solid #333; }
                    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f9f9f9; }
                    pre { background: #f4f4f4; padding: 15px; white-space: pre-wrap; font-family: monospace; }
                    .privacy-warning { margin-top: 50px; padding-top: 15px; border-top: 1px solid #fee2e2; color: #dc2626; font-size: 10px; text-align: center; font-weight: 500; }
                </style>
            </head>
            <body>
                <!-- We render the raw text first, normally we'd use a markdown parser library here but we only have text in this scope -->
                <div id="content"></div>
                
                <div class="privacy-warning">
                    Some information is sent to Google to create the draft, no information is shared with the creator of this project or any third parties, it is end to end encrypted from this site to google's servers.
                </div>

                <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
                <script>
                    document.getElementById('content').innerHTML = marked.parse(${JSON.stringify(generatedContent)});
                    window.print();
                </script>
            </body>
            </html>
        `;
        printWindow.document.write(htmlContent);
        printWindow.document.close();
    }
  };

  if (generatedContent) {
      return (
          <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-fade-in-up">
              <div className="bg-white dark:bg-stone-800 p-8 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-200">Emergency Sheet Ready</h2>
                      <div className="flex gap-2">
                          <button onClick={handleCopy} className="p-2 text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 border rounded-lg">
                              {copied ? <IconCheck className="w-5 h-5 text-green-500"/> : <IconClipboard className="w-5 h-5"/>}
                          </button>
                          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg font-bold hover:bg-stone-900 dark:hover:bg-white transition-colors">
                              <IconPrinter className="w-5 h-5" /> Print / Save PDF
                          </button>
                      </div>
                  </div>
                  
                  <div className="prose prose-stone dark:prose-invert max-w-none border p-8 rounded-xl bg-stone-50 dark:bg-stone-900/50">
                      <ReactMarkdown>{generatedContent}</ReactMarkdown>
                      
                      {/* Privacy Warning Footer */}
                      <div className="mt-12 pt-4 border-t border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-[10px] text-center font-medium">
                          Some information is sent to Google to create the draft, no information is shared with the creator of this project or any third parties, it is end to end encrypted from this site to google's servers.
                      </div>
                  </div>
                  
                  <button onClick={() => setGeneratedContent(null)} className="mt-8 text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 underline">
                      Edit Form
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 animate-fade-in-up">
      
      {/* Safety Warning */}
      <div className={`bg-red-700 text-white rounded-xl overflow-hidden shadow-lg transition-all duration-300 ${showWarning ? 'max-h-96' : 'max-h-14'}`}>
        <div 
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-red-800 transition-colors"
            onClick={() => setShowWarning(!showWarning)}
        >
            <div className="flex items-center gap-3 font-bold text-lg">
                <IconWarning className="w-6 h-6" />
                SAFETY NOTICE
            </div>
            <div>{showWarning ? 'Hide' : 'Show'}</div>
        </div>
        {showWarning && (
            <div className="p-4 pt-0 border-t border-red-600/50">
                <p className="mt-2 text-red-50 font-medium leading-relaxed">
                    TrailSense Emergency Contact Sheets are AI-generated and may contain errors. This does NOT replace notifying a trusted contact of your actual plans or checking official conditions. Always leave real trip intentions with someone reliable. Use this feature at your own risk.
                </p>
            </div>
        )}
      </div>

      <h2 className="text-3xl font-bold text-forest-900 dark:text-forest-200 px-1">Create Emergency Sheet</h2>
      <p className="text-stone-600 dark:text-stone-400 px-1 mb-4">Fill out the details below to generate a printable PDF summary for your emergency contact.</p>

      {/* Section A: Personal Info */}
      <CollapsiblePanel title="Personal Information" icon={<IconUser className="w-5 h-5 text-forest-600" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="Full Name" className="p-3 rounded-lg border dark:bg-stone-900 dark:border-stone-700 outline-none focus:ring-2 focus:ring-forest-500"
                value={formData.fullName} onChange={e => handleChange('fullName', e.target.value)} />
            <input type="tel" placeholder="Phone Number" className="p-3 rounded-lg border dark:bg-stone-900 dark:border-stone-700 outline-none focus:ring-2 focus:ring-forest-500"
                value={formData.phone} onChange={e => handleChange('phone', e.target.value)} />
            <input type="email" placeholder="Email (Optional)" className="p-3 rounded-lg border dark:bg-stone-900 dark:border-stone-700 outline-none focus:ring-2 focus:ring-forest-500"
                value={formData.email} onChange={e => handleChange('email', e.target.value)} />
            <input type="text" placeholder="Age" className="p-3 rounded-lg border dark:bg-stone-900 dark:border-stone-700 outline-none focus:ring-2 focus:ring-forest-500"
                value={formData.age} onChange={e => handleChange('age', e.target.value)} />
             <input type="text" placeholder="Blood Type" className="p-3 rounded-lg border dark:bg-stone-900 dark:border-stone-700 outline-none focus:ring-2 focus:ring-forest-500"
                value={formData.bloodType} onChange={e => handleChange('bloodType', e.target.value)} />
            <input type="text" placeholder="Vehicle Info (Make/Model/Plate)" className="md:col-span-2 p-3 rounded-lg border dark:bg-stone-900 dark:border-stone-700 outline-none focus:ring-2 focus:ring-forest-500"
                value={formData.vehicleInfo} onChange={e => handleChange('vehicleInfo', e.target.value)} />
            <textarea placeholder="Medical Conditions" className="md:col-span-2 p-3 rounded-lg border dark:bg-stone-900 dark:border-stone-700 outline-none focus:ring-2 focus:ring-forest-500 h-20"
                value={formData.medicalConditions} onChange={e => handleChange('medicalConditions', e.target.value)} />
            <textarea placeholder="Allergies" className="p-3 rounded-lg border dark:bg-stone-900 dark:border-stone-700 outline-none focus:ring-2 focus:ring-forest-500 h-20"
                value={formData.allergies} onChange={e => handleChange('allergies', e.target.value)} />
            <textarea placeholder="Medications" className="p-3 rounded-lg border dark:bg-stone-900 dark:border-stone-700 outline-none focus:ring-2 focus:ring-forest-500 h-20"
                value={formData.medications} onChange={e => handleChange('medications', e.target.value)} />
        </div>
      </CollapsiblePanel>

      {/* Section B: Emergency Contact */}
      <CollapsiblePanel title="Emergency Contact" icon={<IconPhone className="w-5 h-5 text-forest-600" />}>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="Contact Name" className="p-3 rounded-lg border dark:bg-stone-900 dark:border-stone-700 outline-none focus:ring-2 focus:ring-forest-500"
                value={formData.contactName} onChange={e => handleChange('contactName', e.target.value)} />
            <input type="text" placeholder="Relationship" className="p-3 rounded-lg border dark:bg-stone-900 dark:border-stone-700 outline-none focus:ring-2 focus:ring-forest-500"
                value={formData.contactRelationship} onChange={e => handleChange('contactRelationship', e.target.value)} />
            <input type="tel" placeholder="Contact Phone" className="p-3 rounded-lg border dark:bg-stone-900 dark:border-stone-700 outline-none focus:ring-2 focus:ring-forest-500"
                value={formData.contactPhone} onChange={e => handleChange('contactPhone', e.target.value)} />
            <input type="email" placeholder="Contact Email" className="p-3 rounded-lg border dark:bg-stone-900 dark:border-stone-700 outline-none focus:ring-2 focus:ring-forest-500"
                value={formData.contactEmail} onChange={e => handleChange('contactEmail', e.target.value)} />
         </div>
      </CollapsiblePanel>

      {/* Section C: Trip Details */}
      <CollapsiblePanel title="Trip Details" icon={<IconMap className="w-5 h-5 text-forest-600" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="Trip Name" className="p-3 rounded-lg border dark:bg-stone-900 dark:border-stone-700 outline-none focus:ring-2 focus:ring-forest-500"
                value={formData.tripName} onChange={e => handleChange('tripName', e.target.value)} />
            <input type="text" placeholder="Region / Park" className="p-3 rounded-lg border dark:bg-stone-900 dark:border-stone-700 outline-none focus:ring-2 focus:ring-forest-500"
                value={formData.region} onChange={e => handleChange('region', e.target.value)} />
            <input type="text" placeholder="Starting Point / Trailhead" className="md:col-span-2 p-3 rounded-lg border dark:bg-stone-900 dark:border-stone-700 outline-none focus:ring-2 focus:ring-forest-500"
                value={formData.trailhead} onChange={e => handleChange('trailhead', e.target.value)} />
            
             <div>
                <label className="text-xs text-stone-500 uppercase font-bold">Start Date/Time</label>
                <input type="datetime-local" className="w-full mt-1 p-3 rounded-lg border dark:bg-stone-900 dark:border-stone-700 outline-none focus:ring-2 focus:ring-forest-500"
                    value={formData.startDateTime} onChange={e => handleChange('startDateTime', e.target.value)} />
             </div>
             <div>
                <label className="text-xs text-stone-500 uppercase font-bold">Expected Return</label>
                <input type="datetime-local" className="w-full mt-1 p-3 rounded-lg border dark:bg-stone-900 dark:border-stone-700 outline-none focus:ring-2 focus:ring-forest-500"
                    value={formData.returnDateTime} onChange={e => handleChange('returnDateTime', e.target.value)} />
             </div>

            <textarea placeholder="Planned Route (Describe your path...)" className="md:col-span-2 p-3 rounded-lg border dark:bg-stone-900 dark:border-stone-700 outline-none focus:ring-2 focus:ring-forest-500 h-24"
                value={formData.route} onChange={e => handleChange('route', e.target.value)} />
            <textarea placeholder="Group Members (Names/Phones)" className="md:col-span-2 p-3 rounded-lg border dark:bg-stone-900 dark:border-stone-700 outline-none focus:ring-2 focus:ring-forest-500 h-20"
                value={formData.groupMembers} onChange={e => handleChange('groupMembers', e.target.value)} />
             <textarea placeholder="Planned Campsites / Bailout Points" className="md:col-span-2 p-3 rounded-lg border dark:bg-stone-900 dark:border-stone-700 outline-none focus:ring-2 focus:ring-forest-500 h-20"
                value={formData.campsites} onChange={e => handleChange('campsites', e.target.value)} />
          </div>
      </CollapsiblePanel>

      {/* Section D: Navigation & Gear */}
      <CollapsiblePanel title="Navigation & Safety Gear" icon={<IconCompass className="w-5 h-5 text-forest-600" />}>
           <div className="space-y-4">
                <input type="text" placeholder="PLB / InReach Model & HEX ID" className="w-full p-3 rounded-lg border dark:bg-stone-900 dark:border-stone-700 outline-none focus:ring-2 focus:ring-forest-500"
                    value={formData.plbInfo} onChange={e => handleChange('plbInfo', e.target.value)} />
                <input type="text" placeholder="Navigation Method (e.g. Gaia GPS + Paper Map)" className="w-full p-3 rounded-lg border dark:bg-stone-900 dark:border-stone-700 outline-none focus:ring-2 focus:ring-forest-500"
                    value={formData.navMethod} onChange={e => handleChange('navMethod', e.target.value)} />
                
                <div>
                    <span className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">Equipment Checklist</span>
                    <div className="grid grid-cols-2 gap-2">
                        {['First Aid Kit', 'Water Filter', 'Fire-Starting Kit', 'Headlamp + Spare Batteries', 'Shelter/Tarp', 'Extra Layers', 'Extra Food', 'Extra Water Capacity'].map(item => (
                            <label key={item} className="flex items-center gap-2 p-2 border rounded-lg bg-stone-50 dark:bg-stone-900 dark:border-stone-700 cursor-pointer hover:bg-stone-100 dark:hover:bg-stone-800">
                                <input type="checkbox" 
                                    checked={formData.gearChecklist.includes(item)}
                                    onChange={() => handleGearToggle(item)}
                                    className="w-4 h-4 text-forest-600 rounded focus:ring-forest-500"
                                />
                                <span className="text-sm text-stone-800 dark:text-stone-200">{item}</span>
                            </label>
                        ))}
                    </div>
                </div>
           </div>
      </CollapsiblePanel>

       {/* Section E: Conditions */}
      <CollapsiblePanel title="Conditions & Hazards" icon={<IconCloud className="w-5 h-5 text-forest-600" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="text-xs text-stone-500 uppercase font-bold">Terrain Difficulty</label>
                <select className="w-full mt-1 p-3 rounded-lg border dark:bg-stone-900 dark:border-stone-700 outline-none focus:ring-2 focus:ring-forest-500"
                    value={formData.terrain} onChange={e => handleChange('terrain', e.target.value)}>
                    <option>Easy</option>
                    <option>Moderate</option>
                    <option>Hard</option>
                    <option>Very Hard</option>
                </select>
            </div>
            <div>
                 <label className="text-xs text-stone-500 uppercase font-bold">Expected Weather</label>
                 <input type="text" placeholder="e.g. Sunny, Storm Risk PM" className="w-full mt-1 p-3 rounded-lg border dark:bg-stone-900 dark:border-stone-700 outline-none focus:ring-2 focus:ring-forest-500"
                    value={formData.weather} onChange={e => handleChange('weather', e.target.value)} />
            </div>
             <textarea placeholder="Known Hazards (Wildlife, Cliffs, River Crossings...)" className="md:col-span-2 p-3 rounded-lg border dark:bg-stone-900 dark:border-stone-700 outline-none focus:ring-2 focus:ring-forest-500 h-24"
                value={formData.hazards} onChange={e => handleChange('hazards', e.target.value)} />
          </div>
      </CollapsiblePanel>

      <button 
        onClick={handleSubmit}
        disabled={isGenerating}
        className="w-full py-4 bg-forest-600 hover:bg-forest-700 text-white font-bold text-lg rounded-xl shadow-lg transition-transform transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isGenerating ? (
            <>
             <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
             Generating Sheet...
            </>
        ) : (
            <>
             <IconFileText className="w-6 h-6" />
             Generate Emergency Contact PDF
            </>
        )}
      </button>

    </div>
  );
};
