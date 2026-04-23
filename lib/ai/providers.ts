import { customProvider } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createXai } from '@ai-sdk/xai';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai_2 = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY_2,
});

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const xai = createXai({
  apiKey: process.env.XAI_API_KEY,
});

export type ModelProvider = 'openai' | 'anthropic' | 'xai' | 'google' | 'alibaba' | 'mistral' | 'deepseek' | 'zhipu' | 'cohere' | 'moonshot' | 'minimax' | 'bytedance' | 'arcee' | 'vercel' | 'amazon' | 'xiaomi' | 'kwaipilot' | 'stepfun' | 'inception' | 'nvidia';

export const eryxProvider = customProvider({
  languageModels: {
    // OpenAI models
    'gpt-4.1-mini': openai('gpt-4.1-mini'),
    'gpt-4.1-nano': openai('gpt-4.1-nano'),
    'gpt-4.1': openai('gpt-4.1'),
    'gpt-4o-mini': openai('gpt-4o-mini'),
    'gpt-4o': openai('gpt-4o'),
    'gpt-5.1-mini': openai('gpt-5.1-mini'),
    'gpt-5.1': openai('gpt-5.1'),
    'gpt-5.2-mini': openai('gpt-5.2-mini'),
    'gpt-5.2': openai('gpt-5.2'),
    'gpt-5.4-mini': openai('gpt-5.4-mini'),
    'gpt-5.4': openai('gpt-5.4'),
    'o3-mini': openai('o3-mini'),
    'o4-mini': openai('o4-mini'),
    // Anthropic models
    'claude-3.5-haiku': anthropic('claude-3-5-haiku'),
    'claude-3.5-sonnet': anthropic('claude-3-5-sonnet'),
    'claude-3.5-opus': anthropic('claude-3-5-opus'),
    'claude-3.7-sonnet': anthropic('claude-3-7-sonnet'),
    'claude-3.7-opus': anthropic('claude-3-7-opus'),
    // xAI models
    'grok-3': xai('grok-3'),
    'grok-3-beta': xai('grok-3-beta'),
    'grok-2': xai('grok-2'),
    'grok-2-mini': xai('grok-2-mini'),
  },
});
