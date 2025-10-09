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
import { extractPlaceholders, getStatusBadgeVariant } from '@/lib/whatsapp-api';

// Mock templates - same as in templates page
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
    status: 'APPROVED',
    category: 'MARKETING',
    components: [
      {
        type: 'BODY',
        text: 'Special offer for {{1}}! Get {{2}}% off on your next purchase.',
      }
    ],
    updated_time: '2024-01-13T09:20:00Z'
  }
];

interface TemplateSelectProps {
  selectedTemplate: string;
  onTemplateChange: (templateName: string, templateLanguage: string) => void;
}

export default function TemplateSelect({ selectedTemplate, onTemplateChange }: TemplateSelectProps) {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load templates (using mock data for now)
    const loadTemplates = async () => {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Filter only approved templates for campaign use
      const approvedTemplates = mockTemplates.filter(t => t.status === 'APPROVED');
      setTemplates(approvedTemplates);
      setLoading(false);
    };

    loadTemplates();
  }, []);

  const selectedTemplateData = templates.find(t => t.name === selectedTemplate);

  const handleTemplateSelect = (templateName: string) => {
    const template = templates.find(t => t.name === templateName);
    if (template) {
      onTemplateChange(templateName, template.language);
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
          <SelectContent>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.name}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{template.name}</span>
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

      {/* Template Preview */}
      {selectedTemplateData && (
        <div className="border rounded-lg p-4 bg-muted/30">
          <h3 className="font-medium mb-2">Template Preview</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Name:</span>
              <span className="font-medium">{selectedTemplateData.name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Language:</span>
              <span>{selectedTemplateData.language}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Category:</span>
              <Badge variant="outline" className="h-5">
                {selectedTemplateData.category}
              </Badge>
            </div>
            
            {/* Template Content */}
            <div className="mt-3">
              <span className="text-sm text-muted-foreground">Message:</span>
              <div className="mt-1 p-3 bg-white border rounded text-sm">
                {selectedTemplateData.components
                  .filter(c => c.type === 'BODY')
                  .map((component, index) => (
                    <p key={index}>{component.text}</p>
                  ))}
              </div>
            </div>

            {/* Placeholders */}
            {(() => {
              const placeholders = extractPlaceholders(selectedTemplateData);
              return placeholders.length > 0 && (
                <div className="mt-2">
                  <span className="text-sm text-muted-foreground">Placeholders:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {placeholders.map((placeholder, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {placeholder}
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}