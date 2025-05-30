import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function summarizeEventLogs(events: Record<string, unknown>[]): Promise<string> {
  // Persona: Senior analytics engineer
  // Task: Summarize event logs for a business audience
  // Audience: Business stakeholders, non-technical
  // Constraints: 3-7 bullet points, plain English, no jargon, group similar events, quantify where possible
  // Input/Output prefixes and few-shot example
  const prompt = `INSTRUCTION: Summarize the following event logs for a business audience. Use 3-7 bullet points. Group similar events, quantify where possible, and highlight key patterns, anomalies, and trends. Use plain English and avoid technical jargon.

INPUT (event logs):
[
  {"timestamp": "2024-06-01T14:00:00Z", "eventType": "user", "action": "login", "status": "success"},
  {"timestamp": "2024-06-01T14:05:00Z", "eventType": "user", "action": "login", "status": "failure"},
  {"timestamp": "2024-06-01T14:10:00Z", "eventType": "system", "action": "error", "status": "critical"},
  {"timestamp": "2024-06-01T15:00:00Z", "eventType": "user", "action": "page_view", "status": "success"},
  {"timestamp": "2024-06-01T15:05:00Z", "eventType": "user", "action": "login", "status": "failure"}
]
OUTPUT (summary):
- Most user activity occurred between 2pm and 3pm.
- 2 failed login attempts detected, possibly indicating user error or security issues.
- 1 critical system error occurred at 2:10pm.
- Majority of events were successful logins and page views.

---

INSTRUCTION: Summarize the following event logs for a business audience. Use 3-7 bullet points. Group similar events, quantify where possible, and highlight key patterns, anomalies, and trends. Use plain English and avoid technical jargon.

INPUT (event logs):
${JSON.stringify(events, null, 2)}
OUTPUT (summary):
`;
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
    config: { temperature: 0.2, maxOutputTokens: 400 },
  });
  return response.text ?? '';
}

export async function naturalLanguageAnalytics(
  question: string,
  events: Record<string, unknown>[]
): Promise<string> {
  // Persona: Expert data analyst
  // Task: Answer a business analytics question using event data
  // Audience: Business user
  // Constraints: Step-by-step reasoning, clear answer, say "Not enough data" if unsure
  // Input/Output prefixes and few-shot example
  const prompt = `INSTRUCTION: Given the event data, answer the user's analytics question. First, explain your reasoning step by step. Then, provide a clear, direct answer. If you don't have enough data, say "Not enough data to answer."

INPUT (question): What were the top errors last week?
INPUT (event data):
[
  {"timestamp": "2024-06-01T14:10:00Z", "eventType": "system", "action": "error", "status": "critical"},
  {"timestamp": "2024-06-01T14:20:00Z", "eventType": "system", "action": "error", "status": "warning"},
  {"timestamp": "2024-06-01T15:00:00Z", "eventType": "user", "action": "page_view", "status": "success"}
]
REASONING:
- I will filter events for errors.
- There are 2 error events: 1 critical, 1 warning.
- No other error types found.
ANSWER:
The top errors last week were 1 critical error and 1 warning error.

---

INSTRUCTION: Given the event data, answer the user's analytics question. First, explain your reasoning step by step. Then, provide a clear, direct answer. If you don't have enough data, say "Not enough data to answer."

INPUT (question): ${question}
INPUT (event data):
${JSON.stringify(events, null, 2)}
REASONING:
`;
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
    config: { temperature: 0.15, maxOutputTokens: 500 },
  });
  return response.text ?? '';
}

export async function explainAlert(
  anomaly: Record<string, unknown>,
  events: Record<string, unknown>[]
): Promise<string> {
  // Persona: Senior incident response specialist
  // Task: Explain an alert/anomaly to a non-technical audience
  // Audience: Business user
  // Constraints: Short paragraph, actionable, avoid jargon, say "Not enough data" if unsure
  // Input/Output prefixes and few-shot example
  const prompt = `INSTRUCTION: Explain the following alert/anomaly to a non-technical business audience. Use a short, clear paragraph. If possible, include a recommended action. If you don't have enough data, say "Not enough data to explain."

INPUT (anomaly):
{"type": "spike", "metric": "failed_logins", "time": "2024-06-01T15:00:00Z"}
INPUT (relevant events):
[
  {"timestamp": "2024-06-01T15:00:00Z", "eventType": "user", "action": "login", "status": "failure"},
  {"timestamp": "2024-06-01T15:01:00Z", "eventType": "user", "action": "login", "status": "failure"}
]
OUTPUT (explanation):
There was a sudden increase in failed login attempts at 3pm, which could indicate users forgetting their passwords or a potential security issue. We recommend monitoring for further suspicious activity and reminding users to reset their passwords if needed.

---

INSTRUCTION: Explain the following alert/anomaly to a non-technical business audience. Use a short, clear paragraph. If possible, include a recommended action. If you don't have enough data, say "Not enough data to explain."

INPUT (anomaly):
${JSON.stringify(anomaly, null, 2)}
INPUT (relevant events):
${JSON.stringify(events, null, 2)}
OUTPUT (explanation):
`;
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
    config: { temperature: 0.15, maxOutputTokens: 300 },
  });
  return response.text ?? '';
}

// Simple chatbot session (stateless, for demo)
export async function chatWithGemini(
  history: { role: 'user' | 'model'; message: string }[],
  userMessage: string
): Promise<string> {
  // Persona: Friendly, knowledgeable analytics assistant
  // Task: Hold a multi-turn conversation about event analytics
  // Audience: Business user
  // Constraints: Be clear, concise, helpful, fallback if unsure
  // Few-shot example in chat history
  const systemInstruction = `You are a friendly, knowledgeable analytics assistant. Help the user understand their event data, answer questions, and provide clear explanations. Use plain English, avoid jargon, and be concise but thorough. If the user asks for a summary, provide bullet points. If they ask for an explanation, use a short paragraph. If you need more information, ask clarifying questions. If you don't know, say "I'm not sure based on the data provided."`;
  const chatHistory = [
    ...history,
    // Few-shot example
    {
      role: 'user',
      message: 'What were the most common errors yesterday?',
    },
    {
      role: 'model',
      message:
        '- The most common errors yesterday were login failures (5 occurrences) and timeout errors (2 occurrences).',
    },
  ];
  const chat = ai.chats.create({
    model: 'gemini-2.0-flash',
    history: chatHistory.map(h => ({ role: h.role, parts: [{ text: h.message }] })),
    config: { systemInstruction, temperature: 0.2, maxOutputTokens: 400 },
  });
  const response = await chat.sendMessage({ message: userMessage });
  return response.text ?? '';
}
