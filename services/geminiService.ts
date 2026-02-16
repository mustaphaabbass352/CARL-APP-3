
import { GoogleGenAI } from "@google/genai";
import { Trip, Expense } from "../types.ts";

export const getDriverInsights = async (trips: Trip[], expenses: Expense[]) => {
  const apiKey = (process.env as any).API_KEY;
  
  if (!apiKey) {
    return "Great job today, Carl! Focus on fuel-efficient routes tomorrow.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const tripSummary = trips.slice(-10).map(t => ({
      fare: t.fare,
      dist: t.distance,
      status: t.status,
      pickup: t.pickupLocation
    }));

    const expenseSummary = expenses.slice(-5).map(e => ({
      cat: e.category,
      amt: e.amount
    }));

    const prompt = `You are "Carl's AI Business Partner". Analyze this driver's data from Ghana (Currency: GHS).
    Recent Trips: ${JSON.stringify(tripSummary)}
    Recent Expenses: ${JSON.stringify(expenseSummary)}
    
    Provide a short (max 2 sentences) encouraging business insight or tip for tomorrow. 
    Focus on profitability, fuel efficiency, or high-demand areas in Accra/Kumasi.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text || "Keep driving safely! Every cedi counts towards your goals.";
  } catch (error) {
    console.error("Gemini Insights Error:", error);
    return "Great job today, Carl! Focus on fuel-efficient routes tomorrow.";
  }
};
