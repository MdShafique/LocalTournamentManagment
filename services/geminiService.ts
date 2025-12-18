import { GoogleGenAI } from "@google/genai";
import { Match, Team } from '../types';

export const generateAICommentary = async (match: Match, teamA: Team, teamB: Team): Promise<string> => {
  if (!process.env.API_KEY) {
      return "Configure API Key for AI commentary.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Construct a context string
    const matchState = `
      Match: ${teamA.name} vs ${teamB.name}
      Status: ${match.status}
      ${teamA.shortName} Score: ${match.scoreA.runs}/${match.scoreA.wickets} (${match.scoreA.overs} overs)
      ${teamB.shortName} Score: ${match.scoreB.runs}/${match.scoreB.wickets} (${match.scoreB.overs} overs)
      Target (if 2nd innings): ${match.scoreB.balls > 0 ? `Chasing ${match.scoreA.runs + 1}` : '1st Innings'}
    `;

    const prompt = `
      Act as an exciting cricket commentator. 
      Generate a short, punchy 2-sentence summary of the current match situation for the live ticker.
      Focus on the tension, run rate, or wickets.
      Match Data: ${matchState}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Update from the middle!";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Live updates proceeding...";
  }
};