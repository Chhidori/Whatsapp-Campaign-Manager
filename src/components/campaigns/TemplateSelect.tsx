'use client';

import { useState, useEffect } from 'react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { WhatsAppTemplate } from '@/types/whatsapp';
import { getStatusBadgeVariant } from '@/lib/whatsapp-api';

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

interface TemplateSelectProps {
  selectedTemplate: string;
  onTemplateChange: (templateName: string, templateLanguage: string, templateId?: string) => void;
}

export default function TemplateSelect({ selectedTemplate, onTemplateChange }: TemplateSelectProps) {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load templates from API
    const loadTemplates = async () => {
      setLoading(true);
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
        
        // Filter only approved templates for campaign use
        const approvedTemplates = fetchedTemplates.filter((t: WhatsAppTemplate) => t.status === 'APPROVED');
        setTemplates(approvedTemplates);
      } catch (error) {
        console.error('Error loading templates:', error);
        setTemplates([]); // Set empty array on error
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, []);

  // const selectedTemplateData = templates.find(t => t.name === selectedTemplate);

  const handleTemplateSelect = (templateName: string) => {
    const template = templates.find(t => t.name === templateName);
    if (template) {
      onTemplateChange(templateName, template.language, template.id);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">WhatsApp Template *</label>
        <Select value={selectedTemplate} onValueChange={handleTemplateSelect} disabled={loading}>
          <SelectTrigger>
            <SelectValue placeholder={loading ? "Loading templates..." : "Select a template"} />
          </SelectTrigger>
          <SelectContent className="z-50 max-h-[300px] overflow-y-auto bg-white border shadow-lg">
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.name} className="hover:bg-gray-50">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{template.name.replace(/_/g, ' ')}</span>
                    <Badge variant="outline" className="text-xs">
                      {template.category}
                    </Badge>
                  </div>
                  <Badge variant={getStatusBadgeVariant(template.status)} className="text-xs ml-2">
                    {template.status}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Template Preview - Hidden as requested */}
    </div>
  );
}