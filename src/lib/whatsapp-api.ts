import { WhatsAppTemplate, WhatsAppApiResponse } from '@/types/whatsapp';

export class WhatsAppAPIService {
  private accessToken: string;
  private businessAccountId: string;
  private baseUrl = 'https://graph.facebook.com/v18.0';

  constructor(accessToken: string, businessAccountId: string) {
    this.accessToken = accessToken;
    this.businessAccountId = businessAccountId;
  }

  async fetchTemplates(): Promise<WhatsAppTemplate[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${this.businessAccountId}/message_templates?limit=100`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: WhatsAppApiResponse = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching WhatsApp templates:', error);
      throw error;
    }
  }
}

// Helper function to extract placeholders from template components
export function extractPlaceholders(template: WhatsAppTemplate): string[] {
  const placeholders: string[] = [];
  
  template.components.forEach(component => {
    if (component.text) {
      const matches = component.text.match(/\{\{(\d+)\}\}/g);
      if (matches) {
        matches.forEach(match => {
          const placeholder = match.replace(/\{\{|\}\}/g, '');
          if (!placeholders.includes(`{{${placeholder}}}`)) {
            placeholders.push(`{{${placeholder}}}`);
          }
        });
      }
    }
  });
  
  return placeholders.sort();
}

// Helper function to get status badge variant
export function getStatusBadgeVariant(status: WhatsAppTemplate['status']) {
  switch (status) {
    case 'APPROVED':
      return 'success';
    case 'PENDING':
      return 'warning';
    case 'REJECTED':
      return 'destructive';
    case 'DISABLED':
      return 'secondary';
    default:
      return 'outline';
  }
}