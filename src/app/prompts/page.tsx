'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MessageSquare, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Prompt } from '@/types/prompt';

export default function PromptsPage() {
  const router = useRouter();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPrompts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/prompts', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch prompts');
      }
      
      setPrompts(result.data || []);
    } catch (error) {
      console.error('Error loading prompts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  const formatDate = useMemo(() => (dateString: string) => {
    const date = new Date(dateString + (dateString.includes('Z') ? '' : 'Z'));
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const truncateMessage = useMemo(() => (message: string, maxLength: number = 100) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  }, []);

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prompts</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage your GPT prompts for automated responses
          </p>
        </div>
        <Button 
          onClick={() => router.push('/prompts/new')}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          New Prompt
        </Button>
      </div>

      {/* Prompts Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading prompts...</p>
          </div>
        </div>
      ) : prompts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg">
          <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Prompts Yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first GPT prompt to get started
          </p>
          <Button onClick={() => router.push('/prompts/new')} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Prompt
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>GPT Model</TableHead>
                <TableHead>Prompt Message</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prompts.map((prompt) => (
                <TableRow key={prompt.id}>
                  <TableCell className="font-medium">
                    {prompt.name}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {prompt.gpt_model}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <div className="text-sm text-muted-foreground">
                      {truncateMessage(prompt.prompt_message)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{formatDate(prompt.created_date)}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}