import { GoogleGenAI } from '@google/genai';

let aiInstance: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export interface ChatMessage {
  role: 'user' | 'model' | 'assistant';
  content: string;
}

export interface GeminiChatOptions {
  messages: ChatMessage[];
  systemInstruction?: string;
  modelType?: 'pro' | 'flash' | 'fast';
  projectContext?: string;
}

export async function chatWithGemini({
  messages,
  systemInstruction,
  modelType = 'flash',
  projectContext,
}: GeminiChatOptions): Promise<string> {
  const ai = getAI();

  let modelName = 'gemini-3.6-flash';
  if (modelType === 'pro') {
    modelName = 'gemini-3.1-pro-preview';
  } else if (modelType === 'fast') {
    modelName = 'gemini-3.1-flash-lite';
  }

  const defaultInstruction = `You are Nexora AI Co-Pilot, an intelligent AI Assistant embedded within the Nexora Enterprise Project Platform.
Your mission is to help project leaders, co-leaders, and team members analyze project health, prioritize tasks, debug technical issues, draft milestone goals, and optimize sprint velocity.
Keep responses well-structured, clear, actionable, and formatted nicely in Markdown with markdown code blocks where appropriate.
${projectContext ? `\n\nCURRENT PROJECT CONTEXT:\n${projectContext}` : ''}`;

  const finalInstruction = systemInstruction ? `${systemInstruction}\n\n${projectContext ? `CURRENT PROJECT CONTEXT:\n${projectContext}` : ''}` : defaultInstruction;

  // Format messages array for SDK
  const formattedContents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : m.role,
    parts: [{ text: m.content }],
  }));

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: formattedContents,
      config: {
        systemInstruction: finalInstruction,
      },
    });

    return response.text || 'No response generated.';
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    if (error?.message?.includes('API_KEY')) {
      throw new Error('Gemini API key is invalid or not configured.');
    }
    throw new Error(error?.message || 'Failed to generate response from Gemini AI.');
  }
}
