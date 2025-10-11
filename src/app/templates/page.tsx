'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  RefreshCw, 
  MessageSquare, 
  Filter,
  ExternalLink,
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

import { WhatsAppTemplate } from '@/types/whatsapp';
import { 
  extractPlaceholders, 
  getStatusBadgeVariant 
} from '@/lib/whatsapp-api';

// Mock data for development - replace with actual API call
const mockTemplates: WhatsAppTemplate[] = [
  {
    id: '1',
    name: 'welcome_message',
    language: 'en_US',
    status: 'APPROVED',
    category: 'UTILITY',
    components: [
      {
        type: 'BODY',
        text: 'Welcome {{1}}! Your account has been created successfully.',
      }
    ],
    updated_time: '2024-01-15T10:30:00Z'
  },
  {
    id: '2',
    name: 'order_confirmation',
    language: 'en_US',
    status: 'APPROVED',
    category: 'UTILITY',
    components: [
      {
        type: 'BODY',
        text: 'Hi {{1}}, your order #{{2}} has been confirmed. Total: ${{3}}',
      }
    ],
    updated_time: '2024-01-14T15:45:00Z'
  },
  {
    id: '3',
    name: 'promotional_offer',
    language: 'en_US',
    status: 'PENDING',
    category: 'MARKETING',
    components: [
      {
        type: 'BODY',
        text: 'Special offer for {{1}}! Get {{2}}% off on your next purchase.',
      }
    ],
    updated_time: '2024-01-13T09:20:00Z'
  },
  {
    id: '4',
    name: 'password_reset',
    language: 'en_US',
    status: 'REJECTED',
    category: 'AUTHENTICATION',
    components: [
      {
        type: 'BODY',
        text: 'Your password reset code is {{1}}. Valid for 5 minutes.',
      }
    ],
    updated_time: '2024-01-12T14:10:00Z'
  }
];

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  // For demo purposes, we'll use mock data
  // In production, you'd initialize the API service with real credentials
  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In production, use:
      // const apiService = new WhatsAppAPIService(accessToken, businessAccountId);
      // const fetchedTemplates = await apiService.fetchTemplates();
      
      setTemplates(mockTemplates);
    } catch (err) {
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

  const handleUseTemplate = (templateName: string) => {
    router.push(`/campaigns/new?template=${encodeURIComponent(templateName)}`);
  };

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
          <h1 className="text-3xl font-bold tracking-tight">WhatsApp Templates</h1>
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
                <TableHead>Language</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Placeholders</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
                      {template.language.replace('_', '-').toUpperCase()}
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
                          {placeholders.slice(0, 3).map((placeholder, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {placeholder}
                            </Badge>
                          ))}
                          {placeholders.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{placeholders.length - 3} more
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {template.updated_time && formatDate(template.updated_time)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => handleUseTemplate(template.name)}
                        disabled={template.status !== 'APPROVED'}
                        className="gap-2"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Use Template
                      </Button>
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