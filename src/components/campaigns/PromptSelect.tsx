'use client';

import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Prompt } from '@/types/prompt';

interface PromptSelectProps {
  selectedPromptId?: string;
  onPromptChange: (promptId: string, promptName: string) => void;
  disabled?: boolean;
}

export default function PromptSelect({ 
  selectedPromptId, 
  onPromptChange, 
  disabled = false 
}: PromptSelectProps) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/prompts');
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch prompts');
      }
      
      setPrompts(result.data || []);
    } catch (error) {
      console.error('Error loading prompts:', error);
      setError('Failed to load prompts');
    } finally {
      setLoading(false);
    }
  };

  const handlePromptChange = (promptId: string) => {
    if (promptId === 'none') {
      onPromptChange('', ''); // Clear selection
      return;
    }
    
    const selectedPrompt = prompts.find(p => p.id === promptId);
    if (selectedPrompt) {
      onPromptChange(promptId, selectedPrompt.name);
    }
  };

  if (error) {
    return (
      <div className="text-sm text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div>
      <label className="text-sm font-medium mb-2 block">
        AI Prompt (Optional)
      </label>
      <Select
        value={selectedPromptId || 'none'}
        onValueChange={handlePromptChange}
        disabled={disabled || loading}
      >
        <SelectTrigger className="z-[100] bg-white dark:bg-gray-900 backdrop-blur-none">
          <SelectValue placeholder={loading ? "Loading prompts..." : "Select a prompt (optional)"} />
        </SelectTrigger>
        <SelectContent className="z-[100] bg-white dark:bg-gray-900 backdrop-blur-none">
          <SelectItem value="none">No prompt selected</SelectItem>
          {prompts.map((prompt) => (
            <SelectItem key={prompt.id} value={prompt.id}>
              {prompt.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground mt-1">
        Choose an AI prompt to enable automated responses for this campaign
      </p>
    </div>
  );
}