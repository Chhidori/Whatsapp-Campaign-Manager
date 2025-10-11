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

// Real WhatsApp templates data from API response
const apiResponseData = [
  {
    "data": [
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
    ],
    "paging": {
      "cursors": {
        "before": "QVFIUzhlWGVEZAHpjRXFBbVI3LTFSZAnZAmOHJfSXZA6Vm9FN3hOU2ZADUGY1ZA0Njd2ZAXLWtWU2dXbTJLUy1IU1FpRm9URHBnX25iNGlrREpfUU1nRmdNUGp5QWR3",
        "after": "QVFIUzFsZAVJTSDlkVlQ2UFFYS3hxWUYtSEx3OURmRW0xRTAxUmhyampiWmI2RTdLTTcxYWpucnlTUHlwYVNrdk5QXzBxcXpOT3dmNjA1NXJhbDF0YXJLNEtR"
      }
    }
  }
];

// Transform API data to WhatsAppTemplate format
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

interface TemplateSelectProps {
  selectedTemplate: string;
  onTemplateChange: (templateName: string, templateLanguage: string, templateId?: string) => void;
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
      const approvedTemplates = realTemplates.filter(t => t.status === 'APPROVED');
      setTemplates(approvedTemplates);
      setLoading(false);
    };

    loadTemplates();
  }, []);

  const selectedTemplateData = templates.find(t => t.name === selectedTemplate);

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
                {selectedTemplateData.components.map((component, index) => {
                  if (component.type === 'HEADER' && component.text) {
                    return (
                      <div key={index} className="font-semibold text-sm mb-2 border-b pb-1">
                        {component.text}
                      </div>
                    );
                  } else if (component.type === 'BODY') {
                    return (
                      <div key={index} className="whitespace-pre-line">
                        {component.text}
                      </div>
                    );
                  } else if (component.type === 'FOOTER' && component.text) {
                    return (
                      <div key={index} className="text-xs text-muted-foreground mt-2 pt-1 border-t">
                        {component.text}
                      </div>
                    );
                  }
                  return null;
                })}
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