'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save } from 'lucide-react';
import { CreatePromptData, GPT_MODELS } from '@/types/prompt';

interface PromptFormProps {
  initialData?: Partial<CreatePromptData>;
  onSubmit: (data: CreatePromptData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  submitLabel?: string;
}

export default function PromptForm({
  initialData = {},
  onSubmit,
  onCancel,
  loading = false,
  submitLabel = 'Create Prompt'
}: PromptFormProps) {
  const [formData, setFormData] = useState<CreatePromptData>({
    name: initialData.name || '',
    gpt_model: initialData.gpt_model || '',
    prompt_message: initialData.prompt_message || ''
  });

  const [errors, setErrors] = useState<Partial<CreatePromptData>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<CreatePromptData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.gpt_model.trim()) {
      newErrors.gpt_model = 'GPT Model is required';
    }

    if (!formData.prompt_message || formData.prompt_message.length === 0) {
      newErrors.prompt_message = 'Prompt message is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    await onSubmit(formData);
  };

  const handleInputChange = (field: keyof CreatePromptData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {/* Name Field */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-2">
            Name <span className="text-red-500">*</span>
          </label>
          <Input
            id="name"
            type="text"
            placeholder="Enter prompt name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className={errors.name ? 'border-red-500' : ''}
            disabled={loading}
          />
          {errors.name && (
            <p className="text-sm text-red-500 mt-1">{errors.name}</p>
          )}
        </div>

        {/* GPT Model Field */}
        <div>
          <label htmlFor="gpt_model" className="block text-sm font-medium mb-2">
            GPT Model <span className="text-red-500">*</span>
          </label>
          <Select
            value={formData.gpt_model}
            onValueChange={(value) => handleInputChange('gpt_model', value)}
            disabled={loading}
          >
            <SelectTrigger className={errors.gpt_model ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select GPT model" />
            </SelectTrigger>
            <SelectContent className="z-[100] bg-white dark:bg-gray-900 backdrop-blur-none">
              {GPT_MODELS.map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.gpt_model && (
            <p className="text-sm text-red-500 mt-1">{errors.gpt_model}</p>
          )}
        </div>

        {/* Prompt Message Field */}
        <div>
          <label htmlFor="prompt_message" className="block text-sm font-medium mb-2">
            Prompt Message <span className="text-red-500">*</span>
          </label>
          <textarea
            id="prompt_message"
            rows={6}
            placeholder="Enter your prompt message..."
            value={formData.prompt_message}
            onChange={(e) => handleInputChange('prompt_message', e.target.value)}
            disabled={loading}
            className={`flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
              errors.prompt_message ? 'border-red-500' : ''
            }`}
          />
          {errors.prompt_message && (
            <p className="text-sm text-red-500 mt-1">{errors.prompt_message}</p>
          )}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-4 pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Processing...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {submitLabel}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}