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

import { WhatsAppTemplate } from '@/types/whatsapp';
import { 
  extractPlaceholders, 
  getStatusBadgeVariant 
} from '@/lib/whatsapp-api';

// Real WhatsApp templates data from API response
const apiResponseData = [
  {
    "data": [
      {
        "name": "water_supply_daily_updates",
        "parameter_format": "POSITIONAL",
        "components": [
          {
            "type": "BODY",
            "text": "Today Updates:\n\nNumber of Orders: {{1}}\nNumber of Orders Delivered: {{2}}\n\nRO Water: {{3}} liters\nSalt Water: {{4}} liters\n\nTotal Transaction Amount: ₹{{5}}\n\nAbsentees List:\n{{6}}\n\nRegards,\nFunbook Team",
            "example": {
              "body_text": [
                [
                  "30",
                  "28",
                  "2,00,000",
                  "15,000",
                  "15,000",
                  "1. Ganesh"
                ]
              ]
            }
          }
        ],
        "language": "en",
        "status": "APPROVED",
        "category": "UTILITY",
        "sub_category": "CUSTOM",
        "id": "1408478400498664"
      },
      {
        "name": "job_card_daily_updates",
        "parameter_format": "POSITIONAL",
        "components": [
          {
            "type": "BODY",
            "text": "MS Printing Daily updates:\n\nJob Created: {{1}}\nJobs Overdue: {{2}}\n\nJob Stages:\nDesign: {{3}}\nPrinting: {{4}}\nCompleted: {{5}}\n\nThanks,\nFunbook Team",
            "example": {
              "body_text": [
                [
                  "6",
                  "1",
                  "2",
                  "0",
                  "1"
                ]
              ]
            }
          }
        ],
        "language": "en_IN",
        "status": "APPROVED",
        "category": "UTILITY",
        "id": "716532877976999"
      },
      {
        "name": "watersupply_order_confirmation",
        "parameter_format": "NAMED",
        "components": [
          {
            "type": "HEADER",
            "format": "TEXT",
            "text": "Order Created Successfully"
          },
          {
            "type": "BODY",
            "text": "New order for {{client_name}} has been created in the app and let me know once it's delivered. So I'll change the status. Thanks",
            "example": {
              "body_text_named_params": [
                {
                  "param_name": "client_name",
                  "example": "Lakshmi Mills"
                }
              ]
            }
          }
        ],
        "language": "en",
        "status": "APPROVED",
        "category": "UTILITY",
        "sub_category": "CUSTOM",
        "id": "706582665279019"
      },
      {
        "name": "hello_world",
        "parameter_format": "POSITIONAL",
        "components": [
          {
            "type": "HEADER",
            "format": "TEXT",
            "text": "Hello World"
          },
          {
            "type": "BODY",
            "text": "Welcome and congratulations!! This message demonstrates your ability to send a WhatsApp message notification from the Cloud API, hosted by Meta. Thank you for taking the time to test with us."
          },
          {
            "type": "FOOTER",
            "text": "WhatsApp Business Platform sample message"
          }
        ],
        "language": "en_US",
        "status": "APPROVED",
        "category": "UTILITY",
        "id": "4049153811993333"
      }
    ]
  }
];

// Transform API data to WhatsAppTemplate format for the main templates page
const realTemplates: WhatsAppTemplate[] = apiResponseData[0].data.map(template => ({
  id: template.id,
  name: template.name,
  language: template.language,
  status: template.status as 'APPROVED' | 'PENDING' | 'REJECTED',
  category: template.category as 'UTILITY' | 'MARKETING' | 'AUTHENTICATION',
  components: template.components.map(comp => {
    const component = {
      type: comp.type as 'HEADER' | 'BODY' | 'FOOTER',
      text: comp.text,
      format: ('format' in comp && comp.format) ? comp.format as 'TEXT' : undefined
    };
    
    return component;
  }),
  updated_time: new Date().toISOString()
}));

export default function TemplatesPage() {
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
      
      setTemplates(realTemplates);
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



  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
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
                <TableHead>Language</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Placeholders</TableHead>
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
