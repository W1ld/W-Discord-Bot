import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

interface ContentPart { text: string; }
interface ContentItem { role: "user" | "model"; parts: ContentPart[]; }

export class GeminiClient {
    private genAI: GoogleGenerativeAI;
    private systemInstruction: string | undefined;
    private history: Map<string, ContentItem[]> = new Map();

    constructor(apiKey: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.systemInstruction = process.env.GEMINI_SYSTEM_INSTRUCTION;
    }

    async generateResponse(prompt: string, userId?: string): Promise<string> {
        return this.tryGenerate(prompt, userId, "gemini-2.5-flash");
    }

    private async tryGenerate(prompt: string, userId: string | undefined, modelName: string): Promise<string> {
        try {
            const modelConfig: any = { model: modelName };
            if (this.systemInstruction) {
                modelConfig.systemInstruction = this.systemInstruction;
            }
            const model = this.genAI.getGenerativeModel(modelConfig);

            let contents: ContentItem[] = [];
            if (userId) {
                const userHistory = this.history.get(userId) || [];
                contents = [...userHistory];
            }
            contents.push({ role: "user", parts: [{ text: prompt }] });

            const result = await model.generateContent({ contents });
            const response = await result.response;
            const text = response.text() || "I'm sorry, I couldn't generate a response.";

            if (userId && result.response.text()) {
                const userHistory = this.history.get(userId) || [];
                userHistory.push({ role: "user", parts: [{ text: prompt }] });
                userHistory.push({ role: "model", parts: [{ text: text }] });
                
                // Limit memory to last 10 conversational turns (20 items)
                if (userHistory.length > 20) {
                    userHistory.splice(0, userHistory.length - 20);
                }
                this.history.set(userId, userHistory);
            }

            return text;
        } catch (error: any) {
            // If error 429 or model not found, try fallback
            if ((error.status === 429 || error.message?.includes("not found")) && modelName === "gemini-2.5-flash") {
                console.warn(`Model ${modelName} is busy or unavailable. Trying fallback to Gemini 1.5...`);
                return this.tryGenerate(prompt, userId, "gemini-1.5-flash");
            }

            console.error(`Gemini AI Error (${modelName}):`, error.message || error);
            throw new Error("Failed to get response from AI.");
        }
    }
}
