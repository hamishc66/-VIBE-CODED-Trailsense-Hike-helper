import { GoogleGenAI } from "@google/genai";
import { UserProfile, HikeDetails, GroundingSource, TripReport, TripReportSummary, SafetyAnalysis } from "../types";

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
  const contentRegex = /---CONTENT---([\s\S]*?)---END_CONTENT---/;

  const summaryMatch = text.match(summaryRegex);
  const safetyMatch = text.match(safetyRegex);
  const contentMatch = text.match(contentRegex);

  // Default values
  const summary: TripReportSummary = {
    difficulty: "Moderate",
    stats: "Distance unknown",
    riskFactor: "Check local conditions",
    verdict: "Proceed with caution"
  };

  const safety: SafetyAnalysis = {
    pros: [],
    cons: [],
    dealBreakers: []
  };

  // Parse Summary
  if (summaryMatch) {
    const lines = summaryMatch[1].trim().split('\n');
    lines.forEach(line => {
      if (line.startsWith('Difficulty:')) summary.difficulty = line.replace('Difficulty:', '').trim();
      if (line.startsWith('Stats:')) summary.stats = line.replace('Stats:', '').trim();
      if (line.startsWith('Risk:')) summary.riskFactor = line.replace('Risk:', '').trim();
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

  // Content is the rest or the specific block
  const markdownContent = contentMatch ? contentMatch[1].trim() : text.replace(summaryRegex, '').replace(safetyRegex, '').trim();

  return { summary, safety, markdownContent, sources };
};

/**
 * STANDARD MODEL + GROUNDING: Gemini 2.5 Flash
 * Used for the main Trip Report using Google Search and Maps.
 */
export const generateTripReport = async (
  user: UserProfile,
  hike: HikeDetails,
  followUpQuestion?: string,
  previousContext?: string
): Promise<TripReport> => {
  
  let prompt = "";

  if (followUpQuestion && previousContext) {
     prompt = `
      UPDATE the previous hiking plan based on the user's new request.
      
      User Profile: ${user.experience}, ${user.fitness}
      Hike: ${hike.trailName} at ${hike.location}
      Date: ${hike.date}, Time: ${hike.startTime}
      ${hike.notes ? `User Notes: ${hike.notes}` : ''}
      
      PREVIOUS CONTEXT:
      ${previousContext}
      
      USER UPDATE/QUESTION:
      "${followUpQuestion}"
      
      TASK:
      Re-analyze the hike and provide a FULL updated report.
      If the user just asked a question, answer it within the relevant sections or add a Q&A section, but maintain the full report structure.
      Ensure the packing list is updated if the user's question affects gear.
      Use Google Search/Maps to get new info if needed.
     `;
  } else {
    prompt = `
      Analyze this hike plan based on real-time data found via Google Search and Maps.
      
      User Profile:
      - Experience: ${user.experience}
      - Fitness: ${user.fitness}
      
      Hike Details:
      - Trail: ${hike.trailName}
      - Location: ${hike.location}
      - Date: ${hike.date}
      - Start Time: ${hike.startTime}
      ${hike.distanceKm ? `- Estimated Distance: ${hike.distanceKm} km` : ''}
      ${hike.notes ? `- User Notes/Gear: ${hike.notes}` : ''}
      
      If the trail name is ambiguous or missing, use the location/coordinates to find the nearest popular trail.

      Task:
      1. Find current weather conditions.
      2. Find trail details (elevation, difficulty).
      3. Provide a TrailSense Report with:
         - Conditions Overview
         - Route Summary
         - Recommended Gear List (Tailor this specifically to the user's notes and experience level)
         - Safety Notes
         - Extra Tips
    `;
  }

  prompt += `
    
    CRITICAL OUTPUT FORMAT:
    You MUST format your response using EXACTLY the following structure blocks with the separators.
    Do not use markdown code blocks for the separators.
    
    ---SUMMARY---
    Difficulty: [Easy / Moderate / Hard]
    Stats: [Distance in km], [Elevation in m] gain
    Risk: [Main risk factor e.g. Heat, Storms, or None]
    Verdict: [Short verdict e.g. "Good to go with care"]
    ---END_SUMMARY---

    ---SAFETY---
    GOOD:
    - [Positive safety factor]
    - [Positive safety factor]
    WATCH_OUT:
    - [Potential hazard]
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
      summary: { difficulty: "Unknown", stats: "--", riskFactor: "Connection Error", verdict: "Try again" },
      safety: { pros: [], cons: ["Could not connect to AI service."], dealBreakers: [] },
      markdownContent: "I'm having trouble connecting to the trail network right now. Please check your internet connection.", 
      sources: [] 
    };
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
      systemInstruction: TRAIL_SENSE_PERSONA,
    }
  });
  return chat;
};