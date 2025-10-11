'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  Calendar, 
  MessageSquare, 
  Users, 
  Send,
  Upload,
  Download,
  Trash2,
  CheckCircle,
  FileText
} from 'lucide-react';
import { CampaignService } from '@/lib/campaign-service';
import { CreateCampaignData, ImportContact } from '@/types/campaign';
import TemplateSelect from './TemplateSelect';

export default function CreateCampaignForm() {
  const router = useRouter();

  const [campaignData, setCampaignData] = useState<CreateCampaignData>({
    name: '',
    description: '',
    template_name: '',
    template_language: 'en_US',
    scheduled_at: '' // Keep this for compatibility but won't use it
  });

  const [templateId, setTemplateId] = useState<string>('');

  const [contacts, setContacts] = useState<ImportContact[]>([]);
  const [contactsInput, setContactsInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [step, setStep] = useState<'details' | 'contacts' | 'review'>('details');

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Test database connection on component mount
  useEffect(() => {
    const testConnection = async () => {
      const canConnect = await CampaignService.testConnection();
      
      if (!canConnect) {
        setError('Database connection failed. Please check your configuration.');
      }
    };
    
    testConnection();
  }, []);

  const handleInputChange = (field: keyof CreateCampaignData, value: string) => {
    setCampaignData(prev => ({ ...prev, [field]: value }));
  };

  const parseContactsFromText = (text: string): ImportContact[] => {
    const lines = text.trim().split('\n');
    const parsedContacts: ImportContact[] = [];

    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      // Try to split by comma, tab, or multiple spaces
      const parts = trimmedLine.split(/[,\t]+|\s{2,}/).map(p => p.trim());
      
      if (parts.length >= 2) {
        // Format: Name, Phone
        const name = parts[0];
        const phone = CampaignService.formatPhoneNumber(parts[1]);
        if (CampaignService.validatePhoneNumber(phone)) {
          parsedContacts.push({ name, phone_number: phone });
        }
      } else if (parts.length === 1) {
        // Only phone number
        const phone = CampaignService.formatPhoneNumber(parts[0]);
        if (CampaignService.validatePhoneNumber(phone)) {
          parsedContacts.push({ phone_number: phone });
        }
      }
    });

    return parsedContacts;
  };

  const handleContactsImport = () => {
    const parsed = parseContactsFromText(contactsInput);
    setContacts(parsed);
    setContactsInput('');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    processFile(file);
    // Clear the file input
    event.target.value = '';
  };

  const processFile = (file: File) => {
    if (!file.type.includes('text') && !file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      setError('Please upload a CSV or TXT file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        const parsed = parseContactsFromText(text);
        setContacts(parsed);
        setError(''); // Clear any previous errors
      }
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const removeContact = (index: number) => {
    setContacts(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (step === 'details') {
      if (!campaignData.name.trim()) {
        setError('Campaign name is required');
        return;
      }
      if (!campaignData.template_name.trim()) {
        setError('WhatsApp template is required');
        return;
      }
      setStep('contacts');
      return;
    }

    if (step === 'contacts') {
      setStep('review');
      return;
    }

    // Final submission
    setLoading(true);
    setError(null);

    try {
      // Create campaign and send webhook to n8n
      const requestData = {
        name: campaignData.name,
        template_name: campaignData.template_name,
        template_id: templateId || campaignData.template_name,
        contacts: contacts.map(contact => ({
          name: contact.name,
          phone_number: contact.phone_number,
          lead_id: `LEAD_${Date.now()}_${Math.floor(Math.random() * 1000)}` // Generate lead_id if not present
        }))
      };
      
      console.log('=== SENDING CAMPAIGN REQUEST ===');
      console.log('Request data:', JSON.stringify(requestData, null, 2));
      
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      const result = await response.json();
      console.log('=== CAMPAIGN RESPONSE ===');
      console.log('Response data:', JSON.stringify(result, null, 2));

      if (!response.ok) {
        console.error('Campaign creation failed:', result);
        throw new Error(result.error || 'Failed to create campaign');
      }

      if (result.success) {
        let successMessage = `Campaign "${campaignData.name}" created successfully! Campaign ID: ${result.campaign.id}`;
        
        if (result.webhookError) {
          successMessage += `\n\nNote: ${result.webhookError}`;
        } else {
          successMessage += '\n\nMessages have been sent to n8n for processing.';
        }
        
        setSuccess(successMessage);
        
        // Redirect to campaigns list after a short delay
        setTimeout(() => {
          router.push('/campaigns');
        }, 3000);
      } else {
        throw new Error('Campaign creation failed');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to create campaign: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (step === 'contacts') {
      setStep('details');
    } else if (step === 'review') {
      setStep('contacts');
    } else {
      router.back();
    }
  };

  const downloadTemplate = () => {
    const csvContent = 'Name,Phone Number\nJohn Doe,+1234567890\nJane Smith,+9876543210';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (success) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <div className="text-center">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-green-600 mb-2">Campaign Created!</h1>
          <p className="text-muted-foreground">{success}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="outline" size="sm" onClick={goBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {step === 'details' && 'Campaign Details'}
            {step === 'contacts' && 'Import Contacts'}
            {step === 'review' && 'Review & Create'}
          </h1>
          <p className="text-muted-foreground mt-2">
            Create and configure your WhatsApp campaign
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center space-x-4">
          <div className={`flex items-center gap-2 ${step === 'details' ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 'details' ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}>
              1
            </div>
            <span>Details</span>
          </div>
          <div className="w-12 h-px bg-border" />
          <div className={`flex items-center gap-2 ${step === 'contacts' ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 'contacts' ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}>
              2
            </div>
            <span>Contacts</span>
          </div>
          <div className="w-12 h-px bg-border" />
          <div className={`flex items-center gap-2 ${step === 'review' ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 'review' ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}>
              3
            </div>
            <span>Review</span>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step Content */}
      <div className="bg-card border rounded-lg p-6">
        {step === 'details' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Campaign Information</h2>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Campaign Name *</label>
              <Input
                value={campaignData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., October Promotion Campaign"
              />
            </div>

            <div className="relative z-50">
              <TemplateSelect
                selectedTemplate={campaignData.template_name}
                onTemplateChange={(templateName: string, templateLanguage: string, templateIdValue?: string) => {
                  handleInputChange('template_name', templateName);
                  handleInputChange('template_language', templateLanguage);
                  setTemplateId(templateIdValue || '');
                }}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Input
                value={campaignData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Brief description of this campaign"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Schedule</label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="datetime-local"
                  value={campaignData.scheduled_at || ''}
                  onChange={(e) => handleInputChange('scheduled_at', e.target.value)}
                  disabled
                  placeholder="Currently disabled - campaigns will be sent immediately"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Scheduling is currently disabled. Campaigns will be sent immediately.
              </p>
            </div>
          </div>
        )}

        {step === 'contacts' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Import Contacts</h2>
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
                <Download className="h-4 w-4" />
                Download Template
              </Button>
            </div>

            {/* File Upload Section */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium mb-2 block">Import from File</label>
                <div 
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-primary/50 transition-colors"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="contacts-file-upload"
                  />
                  <label 
                    htmlFor="contacts-file-upload" 
                    className="cursor-pointer flex flex-col items-center gap-2 hover:text-primary transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <span className="text-sm font-medium">Upload CSV or TXT file</span>
                    <span className="text-xs text-muted-foreground">
                      Drag & drop or click to select file
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Or Paste Contacts</label>
                <textarea
                  className="w-full h-32 p-3 border rounded-md resize-none"
                  value={contactsInput}
                  onChange={(e) => setContactsInput(e.target.value)}
                  placeholder="Paste contacts here. Format:&#10;John Doe, +1234567890&#10;Jane Smith, +9876543210&#10;Or just phone numbers:&#10;+1234567890&#10;+9876543210"
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted-foreground">
                    Supported formats: &quot;Name, Phone&quot; or just phone numbers
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleContactsImport}
                    disabled={!contactsInput.trim()}
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Parse Contacts
                  </Button>
                </div>
              </div>
            </div>

            {/* File Format Help */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="text-sm font-medium mb-2">Supported File Formats:</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>• <strong>CSV:</strong> Name,Phone Number (e.g., John Doe,+1234567890)</div>
                <div>• <strong>TXT:</strong> Each line with Name, Phone or just Phone numbers</div>
                <div>• <strong>Phone Format:</strong> Include country code (e.g., +1, +44, +91)</div>
              </div>
            </div>

            {contacts.length > 0 && (
              <div>
                <h3 className="font-medium mb-3">Imported Contacts ({contacts.length})</h3>
                <div className="max-h-64 overflow-y-auto border rounded-md">
                  {contacts.map((contact, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border-b last:border-b-0">
                      <div>
                        <p className="font-medium">{contact.name || 'No name'}</p>
                        <p className="text-sm text-muted-foreground">{contact.phone_number}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeContact(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Send className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Review Campaign</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-medium">Campaign Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span>{campaignData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Template:</span>
                    <span>{campaignData.template_name}</span>
                  </div>
                  {campaignData.scheduled_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Scheduled:</span>
                      <span>{new Date(campaignData.scheduled_at + (campaignData.scheduled_at.includes('Z') ? '' : 'Z')).toLocaleString()}</span>
                    </div>
                  )}
                  {campaignData.description && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Description:</span>
                      <span>{campaignData.description}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium">Contacts Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Contacts:</span>
                    <span>{contacts.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">With Names:</span>
                    <span>{contacts.filter(c => c.name).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone Only:</span>
                    <span>{contacts.filter(c => !c.name).length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-between mt-8">
        <div>
          {step !== 'details' && (
            <Button variant="outline" onClick={goBack}>
              Previous
            </Button>
          )}
        </div>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? 'Creating...' : 
           step === 'review' ? 'Create Campaign' : 'Next'}
        </Button>
      </div>
    </div>
  );
}