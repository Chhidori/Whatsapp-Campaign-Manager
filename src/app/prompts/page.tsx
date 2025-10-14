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
import { MessageSquare, Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Prompt } from '@/types/prompt';

export default function PromptsPage() {
  const router = useRouter();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [tableNotFound, setTableNotFound] = useState(false);
  const [creatingTable, setCreatingTable] = useState(false);

  const loadPrompts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/prompts', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      // Log the response for debugging
      console.log('API Response status:', response.status);
      console.log('API Response headers:', Object.fromEntries(response.headers.entries()));
      
      const result = await response.json();
      console.log('API Response body:', result);
      
      if (!response.ok) {
        console.error('API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          error: result.error,
          details: result.details,
          message: result.message
        });
        
        // Check if it's a table not found error
        if (response.status === 404 && result.error === 'Prompts table not found') {
          setTableNotFound(true);
          return; // Don't throw error, just show create table option
        }
        
        throw new Error(result.error || result.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      setPrompts(result.data || []);
    } catch (error) {
      console.error('Error loading prompts:', error);
      // Show user-friendly error
      alert(`Failed to load prompts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCreateTable = useCallback(async () => {
    setCreatingTable(true);
    try {
      const response = await fetch('/api/create-prompts-table', {
        method: 'POST'
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create prompts table');
      }
      
      // Table created successfully, now load prompts
      setTableNotFound(false);
      await loadPrompts();
    } catch (error) {
      console.error('Error creating prompts table:', error);
      alert(`Failed to create prompts table: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setCreatingTable(false);
    }
  }, [loadPrompts]);

  const handleDelete = useCallback(async (promptId: string) => {
    if (!confirm('Are you sure you want to delete this prompt? This action cannot be undone.')) {
      return;
    }

    setDeleteLoading(promptId);
    try {
      const response = await fetch(`/api/prompts/${promptId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to delete prompt');
      }

      // Reload prompts to reflect the deletion
      await loadPrompts();
    } catch (error) {
      console.error('Error deleting prompt:', error);
      alert('Failed to delete prompt. Please try again.');
    } finally {
      setDeleteLoading(null);
    }
  }, [loadPrompts]);

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
      ) : tableNotFound ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-yellow-50 border-yellow-200">
          <MessageSquare className="h-12 w-12 text-yellow-600 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Prompts Table Not Found</h3>
          <p className="text-muted-foreground mb-4 max-w-md">
            The prompts table doesn&apos;t exist in your database yet. Click the button below to create it automatically.
          </p>
          <Button 
            onClick={handleCreateTable} 
            disabled={creatingTable}
            className="gap-2"
          >
            {creatingTable ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating Table...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Create Prompts Table
              </>
            )}
          </Button>
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
                <TableHead className="text-right">Actions</TableHead>
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
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/prompts/${prompt.id}/edit`)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(prompt.id)}
                        disabled={deleteLoading === prompt.id}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        {deleteLoading === prompt.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
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