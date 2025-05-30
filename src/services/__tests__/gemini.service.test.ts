import {
  summarizeEventLogs,
  naturalLanguageAnalytics,
  explainAlert,
  chatWithGemini,
} from '../gemini.service';

jest.mock('@google/genai', () => {
  return {
    GoogleGenAI: jest.fn().mockImplementation(() => {
      return {
        models: {
          generateContent: () => Promise.resolve({ text: 'mocked response' }),
        },
        chats: {
          create: () => ({
            sendMessage: () => Promise.resolve({ text: 'mocked chat response' }),
          }),
        },
      };
    }),
  };
});

describe('Gemini AI Service', () => {
  describe('summarizeEventLogs', () => {
    it('returns a string summary', async () => {
      const events = [
        { timestamp: '2024-06-01T14:00:00Z', eventType: 'user', action: 'login', status: 'success' },
        { timestamp: '2024-06-01T14:05:00Z', eventType: 'user', action: 'login', status: 'failure' },
      ];
      const result = await summarizeEventLogs(events);
      expect(typeof result).toBe('string');
      expect(result).toContain('mocked response');
    });
  });

  describe('naturalLanguageAnalytics', () => {
    it('returns a string answer with reasoning', async () => {
      const events = [
        { timestamp: '2024-06-01T14:10:00Z', eventType: 'system', action: 'error', status: 'critical' },
      ];
      const question = 'What were the top errors last week?';
      const result = await naturalLanguageAnalytics(question, events);
      expect(typeof result).toBe('string');
      expect(result).toContain('mocked response');
    });
  });

  describe('explainAlert', () => {
    it('returns a string explanation', async () => {
      const anomaly = { type: 'spike', metric: 'failed_logins', time: '2024-06-01T15:00:00Z' };
      const events = [
        { timestamp: '2024-06-01T15:00:00Z', eventType: 'user', action: 'login', status: 'failure' },
      ];
      const result = await explainAlert(anomaly, events);
      expect(typeof result).toBe('string');
      expect(result).toContain('mocked response');
    });
  });

  describe('chatWithGemini', () => {
    it('returns a string chat response', async () => {
      const history: { role: 'user' | 'model'; message: string }[] = [
        { role: 'user', message: 'Hello!' },
        { role: 'model', message: 'Hi there!' },
      ];
      const userMessage = 'What are the top errors?';
      const result = await chatWithGemini(history, userMessage);
      expect(typeof result).toBe('string');
      expect(result).toContain('mocked chat response');
    });
  });
}); 