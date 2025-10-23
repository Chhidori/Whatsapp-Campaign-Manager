'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

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
  FileText,
  Bot
} from 'lucide-react';
import { CampaignService } from '@/lib/campaign-service';
import { CreateCampaignData, ImportContact } from '@/types/campaign';
import TemplateSelect from './TemplateSelect';
import PromptSelect from './PromptSelect';
import CustomToggle from '@/components/ui/custom-toggle';

export default function CreateCampaignForm() {
  const router = useRouter();
  const { session } = useAuth();

  const [campaignData, setCampaignData] = useState<CreateCampaignData>({
    name: '',
    description: '',
    template_name: '',
    template_language: 'en_US',
    scheduled_at: '', // Keep this for compatibility but won't use it
    prompt_id: '',
    auto_reply: false
  });

  const [templateId, setTemplateId] = useState<string>('');
  const [promptName, setPromptName] = useState<string>('');

  const [contacts, setContacts] = useState<ImportContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'error' | 'warning' | 'info' | 'success'>('error');
  const [success, setSuccess] = useState<string | null>(null);
  const [step, setStep] = useState<'details' | 'automation' | 'contacts' | 'review'>('details');
  const [defaultCountry, setDefaultCountry] = useState<string>(''); // No default
  const [showCountrySelector, setShowCountrySelector] = useState(false);
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  // Country list
  const countries = [
    { code: '+91', name: 'India', flag: '🇮🇳' },
    { code: '+1', name: 'United States', flag: '🇺🇸' },
    { code: '+44', name: 'United Kingdom', flag: '🇬🇧' },
    { code: '+86', name: 'China', flag: '🇨🇳' },
    { code: '+81', name: 'Japan', flag: '🇯🇵' },
    { code: '+49', name: 'Germany', flag: '🇩🇪' },
    { code: '+33', name: 'France', flag: '🇫🇷' },
    { code: '+61', name: 'Australia', flag: '🇦🇺' },
    { code: '+55', name: 'Brazil', flag: '🇧🇷' },
    { code: '+52', name: 'Mexico', flag: '🇲🇽' }
  ];

  // Test database connection on component mount
  useEffect(() => {
    const testConnection = async () => {
      try {
        const response = await fetch('/api/test-db');
        const result = await response.json();
        
        if (!result.canConnect) {
          setErrorMessage('Database connection failed. Please check your configuration.', 'error');
        }
      } catch (error) {
        console.error('Error testing connection:', error);
        setErrorMessage('Database connection failed. Please check your configuration.', 'error');
      }
    };
    
    testConnection();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setShowCountrySelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const formatPhoneNumberWithCountry = (phone: string, countryCode: string): string => {
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // If already has country code, keep it
    if (cleaned.startsWith('+')) {
      return cleaned;
    }
    
    // If no country code selected and phone doesn't have one, return as-is (will be caught by validation)
    if (!countryCode) {
      return cleaned;
    }
    
    // Add the selected country code
    return `${countryCode}${cleaned}`;
  };

  const setErrorMessage = (message: string, type: 'error' | 'warning' | 'info' | 'success' = 'error') => {
    setError(message);
    setErrorType(type);
  };

  const clearError = () => {
    setError(null);
    setErrorType('error');
  };

  const handleInputChange = (field: keyof CreateCampaignData, value: string | boolean) => {
    setCampaignData(prev => ({ ...prev, [field]: value }));
  };

  const parseContactsFromText = (text: string): { contacts: ImportContact[], skippedCount: number, skippedMessage?: string } => {
    const lines = text.trim().split('\n');
    if (lines.length === 0) return { contacts: [], skippedCount: 0 };

    const parsedContacts: ImportContact[] = [];
    const skippedContacts: string[] = [];
    let headers: string[] = [];
    let isCSVWithHeaders = false;

    // Check if first line looks like headers (contains 'name' and 'phone')
    const firstLine = lines[0].trim();
    const firstLineParts = firstLine.split(/[,\t]+/).map(p => p.trim());
    
    if (firstLineParts.some(part => 
      part.toLowerCase().includes('name') || 
      part.toLowerCase().includes('phone') || 
      part.toLowerCase().includes('number')
    )) {
      isCSVWithHeaders = true;
      headers = firstLineParts.map(h => h.trim());
      
      // Validate header count (max 12: Name + Phone + 10 custom fields)
      if (headers.length > 12) {
        throw new Error(`Too many columns detected (${headers.length}). Maximum allowed is 12 (Name, Phone Number, and up to 10 custom fields).`);
      }
    }

    const dataLines = isCSVWithHeaders ? lines.slice(1) : lines;

    if (dataLines.length === 0) {
      throw new Error('No contact data found in the file. Please check your CSV format.');
    }

    dataLines.forEach((line, lineIndex) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      const parts = trimmedLine.split(/[,\t]+/).map(p => p.trim());
      
      if (isCSVWithHeaders && headers.length > 0) {
        // CSV with headers - map each column to appropriate field
        if (parts.length > headers.length) {
          console.warn(`Line ${lineIndex + 2}: More values than headers, ignoring extra values`);
        }
        
        let name = '';
        let phone = '';
        const customFields: Record<string, string> = {};
        let customFieldCount = 0;

        headers.forEach((header, index) => {
          if (index >= parts.length) return;
          
          const value = parts[index].trim();
          if (!value) return;

          const lowerHeader = header.toLowerCase();
          
          if (lowerHeader.includes('name') && !name) {
            name = value;
          } else if ((lowerHeader.includes('phone') || lowerHeader.includes('number')) && !phone) {
            phone = formatPhoneNumberWithCountry(value, defaultCountry);
          } else {
            // Custom field
            if (customFieldCount < 10) {
              customFields[header] = value;
              customFieldCount++;
            }
          }
        });

        // Validate phone number - if no country selected and no + prefix, skip this contact
        if (!defaultCountry && !phone.startsWith('+')) {
          const originalPhone = parts.find(p => p.match(/[\d\-\(\)\s]+/)) || 'invalid phone';
          skippedContacts.push(`${name || 'Unknown'} (${originalPhone})`);
          return;
        }

        if (CampaignService.validatePhoneNumberForCountry ? CampaignService.validatePhoneNumberForCountry(phone) : CampaignService.validatePhoneNumber(phone)) {
          const contact: ImportContact = { phone_number: phone };
          if (name) contact.name = name;
          if (Object.keys(customFields).length > 0) contact.custom_fields = customFields;
          parsedContacts.push(contact);
        }
      } else {
        // Legacy format: Name, Phone or just Phone
        if (parts.length >= 2) {
          // Format: Name, Phone
          const name = parts[0];
          const phone = formatPhoneNumberWithCountry(parts[1], defaultCountry);
          
          // Skip if no country selected and no + prefix
          if (!defaultCountry && !phone.startsWith('+')) {
            skippedContacts.push(`${name} (${parts[1]})`);
            return;
          }
          
          if (CampaignService.validatePhoneNumberForCountry ? CampaignService.validatePhoneNumberForCountry(phone) : CampaignService.validatePhoneNumber(phone)) {
            parsedContacts.push({ name, phone_number: phone });
          }
        } else if (parts.length === 1) {
          // Only phone number
          const phone = formatPhoneNumberWithCountry(parts[0], defaultCountry);
          
          // Skip if no country selected and no + prefix
          if (!defaultCountry && !phone.startsWith('+')) {
            skippedContacts.push(`Unknown (${parts[0]})`);
            return;
          }
          
          if (CampaignService.validatePhoneNumberForCountry ? CampaignService.validatePhoneNumberForCountry(phone) : CampaignService.validatePhoneNumber(phone)) {
            parsedContacts.push({ phone_number: phone });
          }
        }
      }
    });

    // Prepare skipped message if any
    let skippedMessage;
    if (skippedContacts.length > 0) {
      skippedMessage = `${skippedContacts.length} contacts skipped (need country code): ${skippedContacts.slice(0, 3).join(', ')}${skippedContacts.length > 3 ? '...' : ''}`;
    }

    return { 
      contacts: parsedContacts, 
      skippedCount: skippedContacts.length,
      skippedMessage 
    };
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    processFile(file);
    // Clear the file input
    event.target.value = '';
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setErrorMessage('Please upload a CSV file only', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        try {
          const result = parseContactsFromText(text);
          if (result.contacts.length === 0) {
            if (result.skippedCount > 0) {
              setErrorMessage(`No valid contacts imported. ${result.skippedMessage}`, 'warning');
            } else {
              setErrorMessage('No valid contacts found in the CSV file. Please check the format.', 'warning');
            }
          } else {
            setContacts(result.contacts);
            let message = `Successfully imported ${result.contacts.length} contacts.`;
            if (result.skippedCount > 0) {
              message += ` ${result.skippedMessage}`;
              setErrorMessage(message, 'warning');
            } else {
              setErrorMessage(message, 'success');
              setTimeout(() => clearError(), 3000); // Clear success message after 3 seconds
            }
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          setErrorMessage(errorMessage, 'error');
        }
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
        setErrorMessage('Campaign name is required', 'warning');
        return;
      }
      if (!campaignData.template_name.trim()) {
        setErrorMessage('WhatsApp template is required', 'warning');
        return;
      }
      clearError();
      setStep('automation');
      return;
    }

    if (step === 'automation') {
      setStep('contacts');
      return;
    }

    if (step === 'contacts') {
      if (contacts.length === 0) {
        setErrorMessage('Please upload a CSV file with contacts before proceeding.', 'warning');
        return;
      }
      if (!defaultCountry) {
        setErrorMessage('Please select a default country code.', 'warning');
        return;
      }
      clearError();
      setStep('review');
      return;
    }

    // Final submission
    setLoading(true);
    clearError();

    try {
      // Create campaign and send webhook to n8n
      const requestData = {
        name: campaignData.name,
        description: campaignData.description,
        template_name: campaignData.template_name,
        template_id: templateId || campaignData.template_name,
        prompt_id: campaignData.prompt_id || null,
        auto_reply: campaignData.auto_reply || false,
        contacts: contacts.map(contact => ({
          name: contact.name,
          phone_number: contact.phone_number,
          custom_fields: contact.custom_fields || {},
          lead_id: `LEAD_${Date.now()}_${Math.floor(Math.random() * 1000)}` // Generate lead_id if not present
        }))
      };
      
      console.log('=== SENDING CAMPAIGN REQUEST ===');
      console.log('Request data:', JSON.stringify(requestData, null, 2));
      
      // Prepare headers with authentication
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Add authorization header if session is available
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers,
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
      setErrorMessage(`Failed to create campaign: ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (step === 'automation') {
      setStep('details');
    } else if (step === 'contacts') {
      setStep('automation');
    } else if (step === 'review') {
      setStep('contacts');
    } else {
      router.back();
    }
  };

  const downloadTemplate = () => {
    const selectedCountry = countries.find(c => c.code === defaultCountry);
    const csvContent = `Name,Phone Number,Company,Email,City,Age,Gender,Occupation,Interest,Source,Notes,Custom Field 10
John Doe,${defaultCountry}1234567890,ABC Corp,john@example.com,New York,30,Male,Engineer,Technology,Website,VIP Customer,Premium
Jane Smith,+911234567890,XYZ Ltd,jane@example.com,London,25,Female,Designer,Art,Referral,Regular Customer,Standard
Alice Johnson,1122334455,Tech Inc,alice@example.com,Sydney,35,Female,Manager,Business,Social Media,New Lead,Basic`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contacts_template_${selectedCountry?.name.replace(/\s+/g, '_')}.csv`;
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
            {step === 'automation' && 'Automation Settings'}
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
        <div className="flex items-center space-x-2">
          <div className={`flex items-center gap-2 ${step === 'details' ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 'details' ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}>
              1
            </div>
            <span>Details</span>
          </div>
          <div className="w-8 h-px bg-border" />
          <div className={`flex items-center gap-2 ${step === 'automation' ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 'automation' ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}>
              2
            </div>
            <span>Automation</span>
          </div>
          <div className="w-8 h-px bg-border" />
          <div className={`flex items-center gap-2 ${step === 'contacts' ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 'contacts' ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}>
              3
            </div>
            <span>Contacts</span>
          </div>
          <div className="w-8 h-px bg-border" />
          <div className={`flex items-center gap-2 ${step === 'review' ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 'review' ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}>
              4
            </div>
            <span>Review</span>
          </div>
        </div>
      </div>

      {error && (
        <Alert 
          variant={errorType === 'error' ? 'destructive' : errorType === 'success' ? 'default' : 'default'} 
          className={`mb-6 ${
            errorType === 'success' ? 'border-green-200 bg-green-50' :
            errorType === 'warning' ? 'border-yellow-200 bg-yellow-50' :
            errorType === 'info' ? 'border-blue-200 bg-blue-50' :
            '' // destructive (error) uses default red styling
          }`}
        >
          <AlertDescription 
            className={
              errorType === 'success' ? 'text-green-800' :
              errorType === 'warning' ? 'text-yellow-800' :
              errorType === 'info' ? 'text-blue-800' :
              '' // destructive (error) uses default red text
            }
          >
            {error}
          </AlertDescription>
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

        {step === 'automation' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Bot className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">AI & Automation Settings</h2>
            </div>

            <div className="space-y-6">
              <div className="relative z-40">
                <PromptSelect
                  selectedPromptId={campaignData.prompt_id}
                  onPromptChange={(promptId: string, promptNameValue: string) => {
                    handleInputChange('prompt_id', promptId || ''); // Ensure empty string if no prompt
                    setPromptName(promptNameValue);
                  }}
                />
              </div>

              <div className="border-t pt-6">
                <div className="mb-4">
                  <h3 className="text-lg font-medium mb-2">Auto Reply Settings</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure automatic responses for incoming messages related to this campaign
                  </p>
                </div>
                
                <CustomToggle
                  checked={campaignData.auto_reply || false}
                  onCheckedChange={(checked) => handleInputChange('auto_reply', checked)}
                  label="Enable Auto Reply"
                />
                
                {campaignData.auto_reply && (
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <strong>Note:</strong> Auto reply requires an AI prompt to be selected. 
                      Responses will be generated based on the selected prompt and incoming message context.
                    </p>
                  </div>
                )}
              </div>
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
              <div className="flex items-center gap-3">
                {/* Country Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Country: <span className="text-red-500">*</span>
                  </span>
                  <div className="relative" ref={countryDropdownRef}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCountrySelector(!showCountrySelector)}
                      className={`h-8 px-2 text-xs ${!defaultCountry ? 'border-red-300 bg-red-50 text-red-700' : ''}`}
                    >
                      <span className="flex items-center gap-1">
                        {defaultCountry ? (
                          <>
                            {countries.find(c => c.code === defaultCountry)?.flag}
                            <span>{defaultCountry}</span>
                          </>
                        ) : (
                          <span className="text-red-600">Select Country</span>
                        )}
                      </span>
                    </Button>
                    
                    {showCountrySelector && (
                      <div className="absolute top-full right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto w-48">
                        {countries.map((country) => (
                          <button
                            key={country.code}
                            onClick={() => {
                              setDefaultCountry(country.code);
                              setShowCountrySelector(false);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-xs"
                          >
                            <span>{country.flag}</span>
                            <span className="flex-1">{country.name}</span>
                            <span className="text-gray-500">{country.code}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
                  <Download className="h-4 w-4" />
                  Download Template
                </Button>
              </div>
            </div>

            {/* File Upload Section */}
            <div className="max-w-md mx-auto">
              <label className="text-sm font-medium mb-3 block text-center">Upload CSV File</label>
              <div 
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="contacts-file-upload"
                />
                <label 
                  htmlFor="contacts-file-upload" 
                  className="cursor-pointer flex flex-col items-center gap-3 hover:text-primary transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-base font-medium">Upload your contacts file</span>
                    <p className="text-sm text-muted-foreground">
                      Drag & drop or click to select CSV file
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Simple Format Help */}
            <div className="bg-muted/50 rounded-lg p-4 max-w-2xl mx-auto">
              <h4 className="text-sm font-medium mb-2">CSV Format Requirements:</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>• <strong>Headers Required:</strong> Name, Phone Number (+ up to 10 custom fields)</div>
                <div>• <strong>Phone Numbers:</strong> Include country code (+91, +1, +44) or select default above</div>
                <div>• <strong>Country Selection:</strong> <span className="text-red-600">Required</span> - Select your default country code above</div>
                <div>• <strong>Field Limit:</strong> Maximum 12 columns total</div>
                <div>• <strong>File Type:</strong> CSV format only</div>
              </div>
              <div className="mt-2 text-xs">
                <strong>Examples:</strong> +911234567890, +1234567890, or 1234567890 
                {defaultCountry && <span>(uses selected country: {defaultCountry})</span>}
              </div>
            </div>

            {contacts.length > 0 && (
              <div>
                <h3 className="font-medium mb-3">Imported Contacts ({contacts.length})</h3>
                <div className="max-h-64 overflow-y-auto border rounded-md">
                  {contacts.map((contact, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border-b last:border-b-0">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{contact.name || 'No name'}</p>
                          <span className="text-xs text-muted-foreground">
                            {contact.phone_number}
                          </span>
                        </div>
                        {contact.custom_fields && Object.keys(contact.custom_fields).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Object.entries(contact.custom_fields).map(([key, value]) => (
                              <span
                                key={key}
                                className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-xs"
                              >
                                <span className="font-medium text-muted-foreground">{key}:</span>
                                <span className="ml-1">{value}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeContact(index)}
                        className="text-destructive hover:text-destructive ml-2"
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
                  {campaignData.prompt_id && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">AI Prompt:</span>
                      <span>{promptName}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Auto Reply:</span>
                    <span>{campaignData.auto_reply ? 'Enabled' : 'Disabled'}</span>
                  </div>
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
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">With Custom Data:</span>
                    <span>{contacts.filter(c => c.custom_fields && Object.keys(c.custom_fields).length > 0).length}</span>
                  </div>
                  {(() => {
                    const allCustomFields = new Set<string>();
                    contacts.forEach(c => {
                      if (c.custom_fields) {
                        Object.keys(c.custom_fields).forEach(key => allCustomFields.add(key));
                      }
                    });
                    return allCustomFields.size > 0 ? (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Custom Fields:</span>
                        <span>{allCustomFields.size}</span>
                      </div>
                    ) : null;
                  })()}
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