'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { CreatePromptData } from '@/types/prompt';
import PromptForm from '@/components/prompts/PromptForm';

export default function NewPromptPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (formData: CreatePromptData) => {
    setLoading(true);
    try {
      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create prompt');
      }

      // Success - redirect to prompts list
      router.push('/prompts');
    } catch (error) {
      console.error('Error creating prompt:', error);
      alert('Failed to create prompt. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Prompt</h1>
          <p className="text-muted-foreground mt-2">
            Add a new GPT prompt for automated responses
          </p>
        </div>
      </div>

      {/* Form */}
      <PromptForm
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        loading={loading}
        submitLabel="Create Prompt"
      />
    </div>
  );
}