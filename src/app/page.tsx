'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  RefreshCw, 
  MessageSquare, 
  Filter,
  AlertCircle 
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import { WhatsAppTemplate } from '@/types/whatsapp';
import { 
  extractPlaceholders, 
  getStatusBadgeVariant 
} from '@/lib/whatsapp-api';

// Interface for the API response
interface ApiTemplateResponse {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string;
  components: Array<{
    type: string;
    text?: string;
    format?: string;
    example?: Record<string, unknown>;
  }>;
  sub_category?: string;
  parameter_format?: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Helper function to get template body text
  const getTemplateBodyText = (template: WhatsAppTemplate): string => {
    const bodyComponent = template.components.find(comp => comp.type === 'BODY');
    return bodyComponent?.text || 'No body text available';
  };

  // Helper function to get template header text
  const getTemplateHeaderText = (template: WhatsAppTemplate): string => {
    const headerComponent = template.components.find(comp => comp.type === 'HEADER');
    return headerComponent?.text || '';
  };

  // Helper function to get template footer text
  const getTemplateFooterText = (template: WhatsAppTemplate): string => {
    const footerComponent = template.components.find(comp => comp.type === 'FOOTER');
    return footerComponent?.text || '';
  };

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const webhookUrl = process.env.NEXT_PUBLIC_WEBHOOK_URL || 'https://n8n.funbook.org.in/webhook/templates';
      
      const response = await fetch(webhookUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch templates: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      
      // Extract templates from the response (data is directly available)
      const templatesData = responseData.data || [];
      
      // Map the API response to your template structure
      const fetchedTemplates: WhatsAppTemplate[] = templatesData.map((item: ApiTemplateResponse) => ({
        id: item.id,
        name: item.name,
        language: item.language || 'en_US',
        status: item.status as 'APPROVED' | 'PENDING' | 'REJECTED',
        category: item.category as 'UTILITY' | 'MARKETING' | 'AUTHENTICATION',
        components: item.components || [],
        updated_time: new Date().toISOString() // API doesn't provide updated_time, using current time
      }));
      
      setTemplates(fetchedTemplates);
    } catch (err) {
      console.error('Error loading templates:', err);
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const refreshTemplates = async () => {
    setRefreshing(true);
    await loadTemplates();
    setRefreshing(false);
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  // Filter and search templates
  const filteredTemplates = useMemo(() => {
    return templates.filter(template => {
      const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || template.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [templates, searchTerm, statusFilter]);



  const formatDate = (dateString: string) => {
    // Parse UTC date and convert to local time
    const date = new Date(dateString + (dateString.includes('Z') ? '' : 'Z'));
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
          <p className="text-muted-foreground mt-2">
            Manage your approved WhatsApp message templates
          </p>
        </div>
        <Button 
          onClick={refreshTemplates} 
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Templates
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="DISABLED">Disabled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading templates...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error Loading Templates</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={loadTemplates} variant="outline">
            Try Again
          </Button>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Templates Found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || statusFilter !== 'all' 
              ? 'No templates match your current filters.' 
              : 'No WhatsApp templates have been created yet.'}
          </p>
          {(searchTerm || statusFilter !== 'all') && (
            <Button 
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }} 
              variant="outline"
            >
              Clear Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Placeholders</TableHead>
                <TableHead>Preview</TableHead>
                <TableHead>Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTemplates.map((template) => {
                const placeholders = extractPlaceholders(template);
                return (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">
                      {template.name}
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant="outline">
                        {template.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(template.status)}>
                        {template.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {placeholders.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {placeholders.map((placeholder, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {placeholder}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            Preview
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>{template.name.replace(/_/g, ' ')}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            {getTemplateHeaderText(template) && (
                              <div>
                                <h4 className="font-semibold text-sm text-muted-foreground mb-2">HEADER</h4>
                                <div className="p-3 bg-gray-50 rounded border-l-4 border-blue-500">
                                  <p className="whitespace-pre-wrap">{getTemplateHeaderText(template)}</p>
                                </div>
                              </div>
                            )}
                            <div>
                              <h4 className="font-semibold text-sm text-muted-foreground mb-2">BODY</h4>
                              <div className="p-3 bg-gray-50 rounded border-l-4 border-green-500">
                                <p className="whitespace-pre-wrap">{getTemplateBodyText(template)}</p>
                              </div>
                            </div>
                            {getTemplateFooterText(template) && (
                              <div>
                                <h4 className="font-semibold text-sm text-muted-foreground mb-2">FOOTER</h4>
                                <div className="p-3 bg-gray-50 rounded border-l-4 border-gray-500">
                                  <p className="whitespace-pre-wrap">{getTemplateFooterText(template)}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                                      <TableCell>
                    {template.updated_time && formatDate(template.updated_time)}
                  </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Summary */}
      {!loading && !error && templates.length > 0 && (
        <div className="mt-6 text-sm text-muted-foreground">
          Showing {filteredTemplates.length} of {templates.length} templates
        </div>
      )}
    </div>
  );
}
