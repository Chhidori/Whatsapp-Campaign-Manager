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