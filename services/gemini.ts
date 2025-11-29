import { GoogleGenAI } from "@google/genai";
import { UserProfile, HikeDetails, GroundingSource, TripReport, TripReportSummary, SafetyAnalysis, TripData, SaferAlternative, RiskAnalysis, RecommendedTrail } from "../types";

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// System Instructions for the Persona
const TRAIL_SENSE_PERSONA = `
You are TrailSense, an AI assistant built for hikers and outdoor lovers.
Your job:
- Help users plan safe, fun day hikes
- Explain conditions in a calm, friendly way
- Suggest what to pack
- Point out safety issues without being dramatic

Style & Tone:
- Sound like a chill, experienced trail buddy, not a robot.
- Short paragraphs, clear sentences.
- Be encouraging, but always lean slightly toward safety.
`;

const SUPPORT_PERSONA = `
You are the Technical Support Assistant for the TrailSense app.
Your role is to help users use the application features.

App Features you know about:
- **Plan a Hike**: Users enter a trail name and location to get an AI-generated safety report.
- **Safety Score**: A bar showing Low/Moderate/Elevated/High risk based on weather, terrain, and user fitness.
- **What If Mode**: A simulation tool to see how changing start time, pack weight, or weather affects safety.
- **Share Card**: A feature to generate a summary image/text to send to friends.
- **History**: Saves previous plans locally.
- **Gear Checklist**: Suggests UL (Ultralight) gear and provides a checklist.

Rules:
- If a user asks for hiking advice (e.g., "Is Angels Landing safe?"), politely direct them to use the main "Check Conditions" form on the home screen.
- Focus on how to *use* the app (e.g., "How do I save a trip?", "What does the safety bar mean?").
- Be concise, helpful, and friendly.
- You are NOT a hiking guide in this chat; you are an app support agent.
`;

/**
 * FAST MODEL: Gemini 2.5 Flash Lite
 * Used for quick UI validations or simple packing tips.
 */
export const getQuickTip = async (details: HikeDetails): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-flash-lite-latest',
      contents: `Give me a 1-sentence quick tip for hiking ${details.trailName} in ${details.location} starting at ${details.startTime}. Be encouraging.`,
    });
    return response.text || "Enjoy your hike and stay safe!";
  } catch (error) {
    console.error("Fast API Error:", error);
    return "Remember to hydrate!";
  }
};

/**
 * PARSER: Extracts structured blocks from the special markdown format
 */
const parseTripReport = (text: string, sources: GroundingSource[]): TripReport => {
  const summaryRegex = /---SUMMARY---([\s\S]*?)---END_SUMMARY---/;
  const safetyRegex = /---SAFETY---([\s\S]*?)---END_SAFETY---/;
  const dataRegex = /---DATA---([\s\S]*?)---END_DATA---/;
  const contentRegex = /---CONTENT---([\s\S]*?)---END_CONTENT---/;

  const summaryMatch = text.match(summaryRegex);
  const safetyMatch = text.match(safetyRegex);
  const dataMatch = text.match(dataRegex);
  const contentMatch = text.match(contentRegex);

  // Default values
  const summary: TripReportSummary = {
    difficulty: "Moderate",
    stats: "Distance unknown",
    riskFactor: "Check local conditions",
    highlights: [],
    tips: [],
    verdict: "Proceed with caution"
  };

  const safety: SafetyAnalysis = {
    pros: [],
    cons: [],
    dealBreakers: []
  };

  const data: TripData = {
    distanceKm: 0,
    elevationM: 0,
    weatherCondition: "Unknown",
    tempC: 20,
    sunsetTime: "18:00",
    elevationProfile: []
  };
  
  let ulGear = "Sawyer Squeeze filter & Smartwater bottle";
  let gearList: string[] = [];
  let gearReason = "Conditions require standard preparation.";

  // Parse Summary
  if (summaryMatch) {
    const lines = summaryMatch[1].trim().split('\n');
    lines.forEach(line => {
      if (line.startsWith('Difficulty:')) summary.difficulty = line.replace('Difficulty:', '').trim();
      if (line.startsWith('Stats:')) summary.stats = line.replace('Stats:', '').trim();
      if (line.startsWith('Risk:')) summary.riskFactor = line.replace('Risk:', '').trim();
      if (line.startsWith('Highlights:')) summary.highlights = line.replace('Highlights:', '').split(',').map(s => s.trim()).filter(s => s);
      if (line.startsWith('Tips:')) summary.tips = line.replace('Tips:', '').split('|').map(s => s.trim()).filter(s => s);
      if (line.startsWith('Verdict:')) summary.verdict = line.replace('Verdict:', '').trim();
    });
  }

  // Parse Safety
  if (safetyMatch) {
    const safetyText = safetyMatch[1];
    const prosMatch = safetyText.match(/GOOD:([\s\S]*?)(?=WATCH_OUT:|$)/);
    const consMatch = safetyText.match(/WATCH_OUT:([\s\S]*?)(?=AVOID_IF:|$)/);
    const avoidMatch = safetyText.match(/AVOID_IF:([\s\S]*?)$/);

    const cleanList = (str: string) => str.trim().split('\n').map(s => s.replace(/^-\s*/, '').trim()).filter(s => s);

    if (prosMatch) safety.pros = cleanList(prosMatch[1]);
    if (consMatch) safety.cons = cleanList(consMatch[1]);
    if (avoidMatch) safety.dealBreakers = cleanList(avoidMatch[1]);
  }

  // Parse Data
  if (dataMatch) {
    const lines = dataMatch[1].trim().split('\n');
    lines.forEach(line => {
      const parts = line.split(':');
      if (parts.length === 2) {
        const key = parts[0].trim();
        const val = parts[1].trim();
        if (key === 'Distance_KM') data.distanceKm = parseFloat(val) || 0;
        if (key === 'Elevation_M') data.elevationM = parseFloat(val) || 0;
        if (key === 'Weather_Condition') data.weatherCondition = val;
        if (key === 'Temp_C') data.tempC = parseFloat(val) || 20;
        if (key === 'Sunset_Time') data.sunsetTime = val;
        if (key === 'Elevation_Profile') {
            data.elevationProfile = val.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
        }
        if (key === 'UL_Gear_Suggestion') ulGear = val;
        if (key === 'Gear_List') gearList = val.split(',').map(s => s.trim()).filter(s => s);
        if (key === 'Gear_Reason') gearReason = val;
      }
    });
  }

  // Content is the rest or the specific block
  let markdownContent = contentMatch 
    ? contentMatch[1].trim() 
    : text.replace(summaryRegex, '')
          .replace(safetyRegex, '')
          .replace(dataRegex, '')
          .trim();
  
  // Extra safety cleanup to remove any leaking tags
  markdownContent = markdownContent
    .replace(/---CONTENT---/g, '')
    .replace(/---END_CONTENT---/g, '')
    .trim();

  return { summary, safety, markdownContent, sources, data, ulGear, gearList, gearReason };
};

/**
 * STANDARD MODEL + GROUNDING: Gemini 2.5 Flash
 * Used for the main Trip Report using Google Search and Maps.
 */
export const generateTripReport = async (
  user: UserProfile,
  hike: HikeDetails,
  isBeginner: boolean = false,
  followUpQuestion?: string,
  previousContext?: string,
): Promise<TripReport> => {
  
  let prompt = "";

  if (followUpQuestion && previousContext) {
     prompt = `
      UPDATE the previous hiking plan based on the user's new request.
      
      User Profile: ${user.experience}, ${user.fitness}
      Hike: ${hike.trailName} at ${hike.location}
      Date: ${hike.date}, Time: ${hike.startTime}
      ${hike.notes ? `User Notes: ${hike.notes}` : ''}
      Beginner Mode: ${isBeginner ? 'ON' : 'OFF'}
      
      PREVIOUS CONTEXT:
      ${previousContext}
      
      USER UPDATE/QUESTION:
      "${followUpQuestion}"
      
      TASK:
      Re-analyze the hike and provide a FULL updated report.
      Use Google Search/Maps to get new info if needed.
     `;
  } else {
    prompt = `
      Analyze this hike plan using Google Search and Google Maps to find accurate, real-time data.
      
      User Profile:
      - Experience: ${user.experience}
      - Fitness: ${user.fitness}
      - Mode: ${isBeginner ? 'BEGINNER MODE (Explain jargon, be extra conservative, offer simple educational tips)' : 'Standard Mode'}
      
      Hike Details:
      - Trail: ${hike.trailName}
      - Location: ${hike.location}
      - Date: ${hike.date}
      - Start Time: ${hike.startTime}
      ${hike.distanceKm ? `- Estimated Distance: ${hike.distanceKm} km` : ''}
      ${hike.notes ? `- User Notes/Gear: ${hike.notes}` : ''}
      
      Tasks:
      1. USE GOOGLE MAPS/SEARCH to find the *accurate* elevation profile and distance. Do not guess.
      2. USE GOOGLE SEARCH to find the *current* weather forecast and SUNSET time for that specific date/location.
      3. INTERNALLY Assess Safety Level based on real-time data.
      4. Find 2-3 specific "highlights" or cool features of this trail.
      5. Provide 2-3 personalized tips based on the user's fitness (${user.fitness}) and experience (${user.experience}).
      6. Provide a TrailSense Report.
      
      IMPORTANT:
      For the "Elevation_Profile" data field, you MUST use Google Maps data to find the actual relative elevation change points of this specific trail. Generate a comma-separated list of 10 integers (0-100 scale) that accurately reflect the trail's shape (e.g. starts low, peaks middle, ends low).
      
      ${isBeginner ? 'Note: Since the user is a beginner, define terms like "switchbacks" or "scree" if used.' : ''}
    `;
  }

  prompt += `
    
    CRITICAL OUTPUT FORMAT:
    You MUST format your response using EXACTLY the following structure blocks with the separators.
    
    ---DATA---
    Distance_KM: [Number e.g. 12.5]
    Elevation_M: [Number e.g. 800]
    Weather_Condition: [Short string e.g. Sunny, Stormy, Rain]
    Temp_C: [Number e.g. 24]
    Sunset_Time: [Time 24h e.g. 18:45]
    Elevation_Profile: [Comma separated list of 10 relative elevation integers (0-100) representing the profile shape e.g. 0,10,40,90,100,90,40,20,10,0]
    UL_Gear_Suggestion: [Short specific real UL gear suggestion e.g. "Toaks 750ml pot"]
    Gear_List: [Comma separated list of 5-7 essential packing items tailored for this specific hike/weather]
    Gear_Reason: [One sentence explaining why this specific gear is needed today]
    ---END_DATA---

    ---SUMMARY---
    Difficulty: [Easy / Moderate / Hard]
    Stats: [Distance in km], [Elevation in m] gain
    Risk: [Main risk factor e.g. Heat, Storms, or None]
    Highlights: [Comma separated list of 2-3 short cool highlights e.g. Waterfall, Peak View, Wildflowers]
    Tips: [Pipe separated list of 3 short personalized tips e.g. Bring extra water | Pacing is key | Watch for ice]
    Verdict: [Short verdict e.g. "Good to go with care"]
    ---END_SUMMARY---

    ---SAFETY---
    GOOD:
    - [Positive safety factor]
    WATCH_OUT:
    - [Potential hazard]
    AVOID_IF:
    - [Condition under which to cancel]
    ---END_SAFETY---

    ---CONTENT---
    [Full Markdown Report Here. Use H2 for headings: Conditions Overview, Route Summary, Recommended Gear, Safety Notes, Extra Tips]
    ---END_CONTENT---
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: TRAIL_SENSE_PERSONA,
        tools: [
          { googleSearch: {} },
          { googleMaps: {} }
        ],
      },
    });

    const text = response.text || "I couldn't generate a report right now.";
    
    // Extract grounding sources
    const sources: GroundingSource[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    if (chunks) {
      chunks.forEach((chunk: any) => {
        // Maps
        if (chunk.web?.uri && chunk.web?.title) {
          sources.push({ uri: chunk.web.uri, title: chunk.web.title });
        }
      });
    }

    return parseTripReport(text, sources);

  } catch (error) {
    console.error("Report Generation Error:", error);
    return { 
      summary: { difficulty: "Unknown", stats: "--", riskFactor: "Connection Error", highlights: [], tips: [], verdict: "Try again" },
      safety: { pros: [], cons: ["Could not connect to AI service."], dealBreakers: [] },
      markdownContent: "I'm having trouble connecting to the trail network right now. Please check your internet connection.", 
      sources: [],
      data: { distanceKm: 0, elevationM: 0, weatherCondition: "Unknown", tempC: 20, sunsetTime: "18:00", elevationProfile: [] }
    };
  }
};

/**
 * GENERATE SAFER ALTERNATIVES
 */
export const generateSaferAlternatives = async (
  user: UserProfile, 
  hike: HikeDetails,
  riskAnalysis: RiskAnalysis
): Promise<SaferAlternative[]> => {
  const prompt = `
    Suggest safer alternatives for this hike.
    
    User: ${user.experience}, Fitness: ${user.fitness}
    Planned Hike: ${hike.trailName} at ${hike.location}
    Risk Level: ${riskAnalysis.level}
    Risk Factors: ${riskAnalysis.factors.map(f => f.name + ': ' + f.description).join(', ')}

    Task:
    Provide 2-3 specific safer alternative plans.
    These could be:
    - A shorter loop in the same area.
    - An easier nearby trail.
    - A strategy change (e.g. "Turn around at Scout Lookout instead of going to the top").
    - A different start time.

    Output as JSON list of objects with: title, description, reason.
    Format:
    [
      { "title": "...", "description": "...", "reason": "..." }
    ]
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Use Flash for quick alternatives
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text) as SaferAlternative[];

  } catch (e) {
    console.error("Error fetching alternatives", e);
    return [];
  }
};

/**
 * PRO MODEL + THINKING: Gemini 3 Pro
 * Used for "Deep Safety Analysis" or complex user queries.
 */
export const performDeepSafetyCheck = async (
  user: UserProfile,
  hike: HikeDetails
): Promise<string> => {
  const prompt = `
    PERFORM A DEEP SAFETY ANALYSIS.
    User is ${user.experience} level.
    Planning to hike ${hike.trailName} at ${hike.location}.
    Start time: ${hike.startTime}.
    ${hike.notes ? `User Notes: ${hike.notes}` : ''}
    
    Think deeply about:
    - Daylight hours vs estimated duration for this fitness level.
    - Weather risks (hypothermia, heat exhaustion) based on typical seasonal norms or current data if known.
    - Terrain traps.
    
    Output a serious but friendly safety verdict.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 32768 }, // Max thinking budget for Pro
      },
    });
    return response.text || "Safety analysis unavailable.";
  } catch (error) {
    console.error("Safety Check Error:", error);
    return "Could not complete deep safety analysis.";
  }
};

/**
 * CHAT MODEL: Gemini 3 Pro
 * General chatbot interface.
 */
export const createChatSession = () => {
  const chat = ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: SUPPORT_PERSONA,
    }
  });
  return chat;
};

/**
 * GET TRAIL TIPS
 */
export const getTrailTips = async (user: UserProfile, hike: HikeDetails): Promise<string[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-flash-lite-latest',
      contents: `Provide 3-4 specific, actionable tips for hiking ${hike.trailName} at ${hike.location}. User fitness: ${user.fitness}, Experience: ${user.experience}. Keep them short. Return as JSON array of strings.`,
      config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Tips error", e);
    return ["Stay hydrated.", "Check weather before leaving.", "Carry a map."];
  }
};

/**
 * GET RECOMMENDED TRAILS
 */
export const getRecommendedTrails = async (hike: HikeDetails): Promise<RecommendedTrail[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Recommend 3 other trails similar to or near ${hike.trailName} in ${hike.location}. Return as JSON array of objects with fields: name, location, difficulty, reason (short).`,
      config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Recs error", e);
    return [];
  }
};