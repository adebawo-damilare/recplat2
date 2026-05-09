export type TalentBridgeAiBackend = "mock" | "gemini" | "openai";

export function getTalentBridgeAiBackend(): TalentBridgeAiBackend {
  const requested = process.env.TALENTBRIDGE_AI_PROVIDER?.trim().toLowerCase();
  const geminiReady = Boolean(process.env.GEMINI_API_KEY?.trim());
  const openAiReady = Boolean(process.env.OPENAI_API_KEY?.trim());

  if (requested === "mock") return "mock";
  if (requested === "gemini" && geminiReady) return "gemini";
  if (requested === "openai" && openAiReady) return "openai";

  if (!requested && geminiReady) return "gemini";
  if (!requested && openAiReady) return "openai";

  return "mock";
}

export function getTalentBridgeAiModel() {
  return process.env.TALENTBRIDGE_AI_MODEL?.trim() || process.env.RECRUIT_AI_MODEL?.trim() || "gpt-5.4-mini";
}
