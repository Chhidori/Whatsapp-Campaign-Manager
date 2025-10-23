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

  // Match both positional ({{1}}) and named ({{client_name}}) placeholders
  const placeholderRegex = /\{\{\s*([^}]+?)\s*\}\}/g;

  template.components.forEach(component => {
    if (component.text) {
      let match: RegExpExecArray | null;
      // Use exec loop to capture all groups and preserve original order
      while ((match = placeholderRegex.exec(component.text)) !== null) {
        const key = match[1].trim();
        const token = `{{${key}}}`;
        if (!placeholders.includes(token)) {
          placeholders.push(token);
        }
      }
    }
  });

  return placeholders;
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