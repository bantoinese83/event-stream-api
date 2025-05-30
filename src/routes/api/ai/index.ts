import { FastifyPluginAsync } from 'fastify';
import {
  summarizeEventLogs,
  naturalLanguageAnalytics,
  explainAlert,
  chatWithGemini,
} from '../../../services/gemini.service';

const aiRoutes: FastifyPluginAsync = async fastify => {
  fastify.post('/generate-summary', async (request, reply) => {
    const { events } = request.body as { events: any[] };
    const text = await summarizeEventLogs(events);
    return { text };
  });

  fastify.post('/analytics', async (request, reply) => {
    const { question, events } = request.body as { question: string; events: any[] };
    const text = await naturalLanguageAnalytics(question, events);
    return { text };
  });

  fastify.post('/explain-alert', async (request, reply) => {
    const { anomaly, events } = request.body as { anomaly: any; events: any[] };
    const text = await explainAlert(anomaly, events);
    return { text };
  });

  fastify.post('/chat', async (request, reply) => {
    const { history, message } = request.body as {
      history: { role: 'user' | 'model'; message: string }[];
      message: string;
    };
    const text = await chatWithGemini(history, message);
    return { text };
  });
};

export default aiRoutes;
