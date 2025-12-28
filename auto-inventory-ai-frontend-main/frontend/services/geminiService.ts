import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Product, Sale } from "../types";

// Initialize Gemini Client
// Initialize Gemini Client Lazily
let ai: GoogleGenAI | null = null;
const getAI = () => {
  if (!ai) {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.warn("Gemini API Key is missing. AI features will not work.");
      // Return a dummy object or throw, but here we throw to be caught by caller
      throw new Error("Gemini API Key is missing. Please add VITE_GEMINI_API_KEY to your .env file.");
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
};

/**
 * Transcribes audio using Gemini Flash (Fast)
 */
export const transcribeAudio = async (audioBase64: string, mimeType: string): Promise<string> => {
  try {
    const response = await getAI().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: audioBase64,
            },
          },
          {
            text: "Transcribe this audio precisely. Return only the transcription text.",
          },
        ],
      },
    });
    return response.text || "";
  } catch (error) {
    console.error("Transcription error:", error);
    throw new Error("Failed to transcribe audio.");
  }
};

/**
 * Analyzes an image (simulated barcode/product scan) using Gemini Flash
 */
export const identifyProductFromImage = async (imageBase64: string): Promise<string> => {
  try {
    const response = await getAI().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: imageBase64,
            },
          },
          {
            text: "Identify the product in this image. If it looks like a barcode, try to read it. Return a JSON with 'name' and 'category'.",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
      }
    });
    return response.text || "{}";
  } catch (error) {
    console.error("Image analysis error:", error);
    return "{}";
  }
};

/**
 * Generates advanced inventory forecast using Gemini 3 Pro (Thinking Mode)
 */
export const generateInventoryForecast = async (
  products: Product[],
  salesHistory: Sale[],
  externalFactors: string = ""
): Promise<string> => {
  try {
    const productSummary = products.map(p => `${p.name} (Stock: ${Object.values(p.stock).reduce((a, b) => a + b, 0)}, Lead Time: ${p.leadTimeDays} days)`).join('\n');
    const salesSummary = `Total Sales Count: ${salesHistory.length}. Recent Transaction total: ${salesHistory.reduce((acc, s) => acc + s.totalAmount, 0)}`;

    const response = await getAI().models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `
        Analyze the following inventory and sales data for 'Hanuman Trader' to provide a sophisticated demand forecast.
        
        Inventory Data:
        ${productSummary}

        Sales Overview:
        ${salesSummary}
        
        External Factors to Consider:
        ${externalFactors || "None specified. Assume standard market conditions."}

        Task:
        1. Perform a predictive analysis for the next 30 days. Specifically consider using time-series models like ARIMA or Holt-Winters exponential smoothing to extrapolate trends from the implicit sales frequency in the summary.
        2. Identify specific items at risk of stockout considering lead times and calculated burn rates.
        3. Analyze seasonality trends typical for Indian MSME retail (e.g., festival spikes, weekend surges) and apply them to the prediction.
        4. Recommend optimal reorder points and quantities to minimize holding costs while preventing stockouts.
        
        Provide a detailed, strategic report in Markdown format. Use bolding for key metrics and bullet points for actions. Include a 'Confidence Level' for your predictions.
      `,
      config: {
        thinkingConfig: {
          thinkingBudget: 10000, // Allocate budget for complex reasoning
        },
      },
    });

    return response.text || "Unable to generate forecast.";
  } catch (error) {
    console.error("Forecasting error:", error);
    return "Error generating forecast. Please try again.";
  }
};

/**
 * Analyzes business trends and profitability
 */
export const analyzeBusinessTrends = async (
  stats: any,
  scenarios: string[]
): Promise<string> => {
  try {
    const scenarioText = scenarios.length > 0 ? `Consider these hypothetical scenarios: ${scenarios.join(', ')}.` : '';
    const response = await getAI().models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `
        Analyze the following business metrics for 'Hanuman Trader':
        ${JSON.stringify(stats, null, 2)}
        
        ${scenarioText}
        
        Provide strategic advice on:
        1. Improving inventory turnover for the specified top-selling and slow-moving products.
        2. Increasing profitability.
        3. Managing risks associated with the selected scenarios/factors.
        
        Keep it concise, actionable, and tailored for an MSME owner.
      `,
    });
    return response.text || "Analysis failed.";
  } catch (e) {
    console.error("Analytics error:", e);
    return "Error generating analysis.";
  }
};

/**
 * General Chat Agent using Gemini with Grounding and configurable model/tone
 */
export const chatWithAgent = async (
  message: string,
  contextData: string,
  useSearch: boolean = false,
  useMaps: boolean = false,
  model: string = 'gemini-2.5-flash',
  tone: string = 'Professional'
): Promise<{ text: string; groundingChunks?: any[] }> => {

  // Construct a single Tool object with enabled properties
  const toolInstance: any = {};
  if (useSearch) toolInstance.googleSearch = {};
  if (useMaps) toolInstance.googleMaps = {};

  const tools = Object.keys(toolInstance).length > 0 ? [toolInstance] : undefined;

  // Force Flash model if tools are used, to avoid compatibility issues with Pro/Thinking models
  const effectiveModel = tools ? 'gemini-2.5-flash' : model;

  const contentPrompt = `
    You are the AI Assistant for 'Hanuman Trader', an inventory management system.
    
    Tone: ${tone}
    
    Context Data (Current System State & Page):
    ${contextData}

    User Query:
    ${message}

    Answer helpful, concise, and professional based on the requested tone.
    - If the user asks about market trends or external info, use Google Search (if enabled). 
    - If they ask about locations, use Google Maps (if enabled).
    - If they ask about GST, analyze the taxes context provided.
    - If they ask about customers, refer to the loyalty and history context.
  `;

  try {
    const response = await getAI().models.generateContent({
      model: effectiveModel,
      contents: contentPrompt,
      config: {
        tools: tools,
      },
    });

    return {
      text: response.text || "I didn't understand that.",
      groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks
    };
  } catch (error: any) {
    console.error("Chat error:", error);

    // Check for specific error code 400 and message about tools (specifically Maps)
    // The API might return 400 if the model doesn't support the tool.
    if (error.message?.includes("not enabled for this model") || error.status === 400) {
      // Retry logic: If Maps was enabled, try disabling it as it is the most likely culprit on Flash models
      if (useMaps) {
        console.warn("Retrying without Google Maps...");
        try {
          // Fallback: Only use search if enabled, strip maps
          const fallbackTools = useSearch ? [{ googleSearch: {} }] : undefined;
          const retryResponse = await getAI().models.generateContent({
            model: effectiveModel,
            contents: contentPrompt,
            config: { tools: fallbackTools }
          });
          return {
            text: (retryResponse.text || "") + "\n\n(Note: Google Maps integration is temporarily unavailable with this model.)",
            groundingChunks: retryResponse.candidates?.[0]?.groundingMetadata?.groundingChunks
          };
        } catch (retryError) {
          console.error("Retry failed:", retryError);
        }
      }
    }

    return { text: "Sorry, I encountered an error processing your request. Please try again or disable external tools (Search/Maps)." };
  }
};