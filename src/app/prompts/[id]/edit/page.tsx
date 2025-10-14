'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { CreatePromptData, Prompt } from '@/types/prompt';
import PromptForm from '@/components/prompts/PromptForm';

export default function EditPromptPage() {
  const router = useRouter();
  const params = useParams();
  const promptId = params.id as string;
  
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPrompt = async () => {
      if (!promptId) return;
      
      setLoading(true);
      try {
        const response = await fetch(`/api/prompts/${promptId}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch prompt');
        }
        
        setPrompt(result.data);
      } catch (error) {
        console.error('Error loading prompt:', error);
        setError(error instanceof Error ? error.message : 'Failed to load prompt');
      } finally {
        setLoading(false);
      }
    };

    loadPrompt();
  }, [promptId]);

  const handleSubmit = async (data: CreatePromptData) => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/prompts/${promptId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update prompt');
      }

      // Redirect back to prompts list
      router.push('/prompts');
    } catch (error) {
      console.error('Error updating prompt:', error);
      setError(error instanceof Error ? error.message : 'Failed to update prompt');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/prompts');
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Prompts
          </Button>
        </div>
        
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading prompt...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !prompt) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Prompts
          </Button>
        </div>
        
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h3 className="text-lg font-semibold mb-2">Error Loading Prompt</h3>
          <p className="text-muted-foreground mb-4">
            {error || 'Prompt not found'}
          </p>
          <Button onClick={handleCancel}>
            Back to Prompts
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Prompts
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Prompt</h1>
          <p className="text-muted-foreground mt-2">
            Update your GPT prompt settings
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 border border-red-200 bg-red-50 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Form */}
      <div className="max-w-2xl">
        <div className="bg-white dark:bg-gray-900 rounded-lg border p-6">
          <PromptForm
            initialData={{
              name: prompt.name,
              gpt_model: prompt.gpt_model,
              prompt_message: prompt.prompt_message
            }}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={saving}
            submitLabel="Update Prompt"
          />
        </div>
      </div>
    </div>
  );
}