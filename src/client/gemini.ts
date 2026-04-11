import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

export class GeminiClient {
    private genAI: GoogleGenerativeAI;
    private systemInstruction: string | undefined;

    constructor(apiKey: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.systemInstruction = process.env.GEMINI_SYSTEM_INSTRUCTION;
    }

    async generateResponse(prompt: string): Promise<string> {
        return this.tryGenerate(prompt, "gemini-2.5-flash");
    }

    private async tryGenerate(prompt: string, modelName: string): Promise<string> {
        try {
            const modelConfig: any = { model: modelName };
            if (this.systemInstruction) {
                modelConfig.systemInstruction = this.systemInstruction;
            }
            const model = this.genAI.getGenerativeModel(modelConfig);
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            return text || "I'm sorry, I couldn't generate a response.";
        } catch (error: any) {
            // If error 429 or model not found, try fallback
            if ((error.status === 429 || error.message?.includes("not found")) && modelName === "gemini-2.5-flash") {
                console.warn(`Model ${modelName} is busy or unavailable. Trying fallback to Gemini 1.5...`);
                return this.tryGenerate(prompt, "gemini-1.5-flash");
            }

            console.error(`Gemini AI Error (${modelName}):`, error.message || error);
            throw new Error("Failed to get response from AI.");
        }
    }
}
