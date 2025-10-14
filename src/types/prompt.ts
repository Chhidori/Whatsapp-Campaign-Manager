export interface Prompt {
  id: string;
  name: string;
  gpt_model: string;
  prompt_message: string;
  created_date: string;
  updated_date: string;
}

export interface CreatePromptData {
  name: string;
  gpt_model: string;
  prompt_message: string;
}

export const GPT_MODELS = ['gpt-4.1'] as const;
export type GPTModel = typeof GPT_MODELS[number];