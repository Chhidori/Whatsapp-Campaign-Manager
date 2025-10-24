'use client';

import { useState, useEffect } from 'react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, MapPin, Info } from 'lucide-react';
import { ParameterMapping, ImportContact } from '@/types/campaign';
import { extractPlaceholders } from '@/lib/whatsapp-api';

// Interface for template API response
interface TemplateApiResponse {
  name: string;
  components: Array<{
    type: string;
    text?: string;
    format?: string;
    example?: Record<string, unknown>;
  }>;
}

interface TemplateParameterMappingProps {
  templateName: string;
  contacts: ImportContact[];
  parameterMappings: ParameterMapping[];
  onMappingChange: (mappings: ParameterMapping[]) => void;
}

export default function TemplateParameterMapping({ 
  templateName, 
  contacts, 
  parameterMappings, 
  onMappingChange 
}: TemplateParameterMappingProps) {
  const [templatePlaceholders, setTemplatePlaceholders] = useState<string[]>([]);
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extract available fields from contacts
  useEffect(() => {
    const fields = new Set<string>();
    fields.add('name');
    fields.add('phone_number');
    
    // Extract custom fields from all contacts
    contacts.forEach(contact => {
      if (contact.custom_fields) {
        Object.keys(contact.custom_fields).forEach(field => {
          fields.add(field);
        });
      }
    });
    
    setAvailableFields(Array.from(fields));
  }, [contacts]);

  // Fetch template information and extract placeholders
  useEffect(() => {
    const fetchTemplateInfo = async () => {
      if (!templateName) return;
      
      setLoading(true);
      setError(null);
      
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
        const templatesData = responseData.data || [];
        
        // Find the selected template
        const template = templatesData.find((t: TemplateApiResponse) => t.name === templateName);
        
        if (template) {
          // Extract placeholders using the existing utility function
          const placeholders = extractPlaceholders(template);
          setTemplatePlaceholders(placeholders);
          
          // Initialize mappings if they don't exist
          if (parameterMappings.length === 0) {
            const initialMappings: ParameterMapping[] = placeholders.map((placeholder) => {
              // Extract parameter name from placeholder
              let parameterName = placeholder.replace(/[{}]/g, '');
              
              // If it's a positional parameter like "1", convert to a descriptive name
              if (/^\d+$/.test(parameterName)) {
                parameterName = `param_${parameterName}`;
              }
              
              return {
                placeholder,
                parameter_name: parameterName,
                mapped_field: '', // User needs to select this
                type: 'text'
              };
            });
            onMappingChange(initialMappings);
          }
        } else {
          setError(`Template "${templateName}" not found`);
        }
      } catch (err) {
        console.error('Error fetching template info:', err);
        setError(err instanceof Error ? err.message : 'Failed to load template information');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplateInfo();
  }, [templateName, parameterMappings.length, onMappingChange]);

  const updateMapping = (index: number, field: string, value: string) => {
    const updatedMappings = [...parameterMappings];
    if (field === 'mapped_field') {
      updatedMappings[index] = { ...updatedMappings[index], [field]: value };
    } else if (field === 'parameter_name') {
      updatedMappings[index] = { ...updatedMappings[index], [field]: value };
    }
    onMappingChange(updatedMappings);
  };

  const getFieldDisplayName = (field: string) => {
    if (field === 'name') return 'Name';
    if (field === 'phone_number') return 'Phone Number';
    return field; // Return custom field names as-is
  };

  const hasUnmappedParameters = parameterMappings.some(mapping => !mapping.mapped_field);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Template Parameter Mapping</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading template parameters...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Template Parameter Mapping</h2>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Template Parameter Mapping</h2>
      </div>

      {templatePlaceholders.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Info className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h4 className="font-medium text-green-900 mb-1">No Parameters Required</h4>
              <p className="text-sm text-green-800">
                This template doesn&apos;t require any parameters. You can proceed to the next step.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 mb-1">Template Parameter Mapping</h4>
                <p className="text-sm text-blue-800">
                  Your selected template requires {templatePlaceholders.length} parameter(s). Map each parameter to a contact column using the dropdown.
                </p>
              </div>
            </div>
          </div>

          {hasUnmappedParameters && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please map all template parameters before proceeding.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            {parameterMappings.map((mapping, index) => (
              <div key={index} className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4 bg-white border rounded-lg">
                <div className="flex-shrink-0 w-full md:w-1/3">
                  <div className="text-sm font-medium text-gray-700 mb-1">Template Parameter</div>
                  <div className="bg-gray-50 rounded-md p-2 border">
                    <code className="text-sm font-mono text-blue-600">{mapping.placeholder}</code>
                  </div>
                </div>

                <div className="w-full md:w-1/3">
                  <div className="text-sm font-medium text-gray-700 mb-1">Parameter Name</div>
                  <div className="px-3 py-2 border rounded-md bg-gray-50 text-sm text-gray-800">{mapping.parameter_name}</div>
                </div>

                <div className="w-full md:w-1/3">
                  <div className="text-sm font-medium text-gray-700 mb-1">Map to Column <span className="text-red-500">*</span></div>
                  <Select value={mapping.mapped_field} onValueChange={(value) => updateMapping(index, 'mapped_field', value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a column..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFields.map((field) => (
                        <SelectItem key={field} value={field}>{getFieldDisplayName(field)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}