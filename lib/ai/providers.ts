import 'server-only';
import { customProvider } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai_2 = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY_2,
});

export const eryxProvider = customProvider({
  languageModels: {
    'eryx-fast': openai('gpt-4.1-mini'),
    'eryx-nano': openai('gpt-4.1-nano'),
    'eryx-standard': openai('gpt-4.1'),
    'eryx-plus': openai('gpt-4o-mini'),
    'eryx-pro': openai('gpt-4o'),
    'eryx-ultra': openai('gpt-5.1-mini'),
    'eryx-max': openai('gpt-5.1'),
    'eryx-next': openai('gpt-5.2-mini'),
    'eryx-prime': openai('gpt-5.2'),
    'eryx-flash': openai('gpt-5.4-mini'),
    'eryx-reason': openai('gpt-5.4'),
    'eryx-mini-o3': openai('o3-mini'),
    'eryx-mini-o4': openai('o4-mini'),
  },
});

export type ModelProvider = typeof eryxProvider;
