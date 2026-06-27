import { ChatOpenAI } from "@langchain/openai";

export const grok = new ChatOpenAI({
  apiKey: process.env.GROQ_API_KEY,
  model: "openai/gpt-oss-120b",
  temperature: 0.3,
  configuration: {
    baseURL: "https://api.groq.com/openai/v1",
  },
});