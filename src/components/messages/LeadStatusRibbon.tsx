'use client';

import { useState } from 'react';
import { LeadStatusOption } from '@/types/campaign';

interface LeadStatusPipelineProps {
  leadId: string;
  currentStatus?: string;
  statusOptions: LeadStatusOption[];
  onStatusChange: (newStatus: string) => void;
  disabled?: boolean;
}

// Dynamic color generator based on status value
const generateStatusColors = (status: string, index: number) => {
  // Predefined color palette - cycles through these colors
  const colorPalette = [
    { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', activeBg: 'bg-blue-500', activeText: 'text-white', activeBorder: 'border-blue-600' },
    { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', activeBg: 'bg-green-500', activeText: 'text-white', activeBorder: 'border-green-600' },
    { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200', activeBg: 'bg-yellow-500', activeText: 'text-white', activeBorder: 'border-yellow-600' },
    { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', activeBg: 'bg-red-500', activeText: 'text-white', activeBorder: 'border-red-600' },
    { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200', activeBg: 'bg-purple-500', activeText: 'text-white', activeBorder: 'border-purple-600' },
    { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200', activeBg: 'bg-indigo-500', activeText: 'text-white', activeBorder: 'border-indigo-600' },
    { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-200', activeBg: 'bg-pink-500', activeText: 'text-white', activeBorder: 'border-pink-600' },
    { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200', activeBg: 'bg-orange-500', activeText: 'text-white', activeBorder: 'border-orange-600' },
    { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-200', activeBg: 'bg-teal-500', activeText: 'text-white', activeBorder: 'border-teal-600' },
    { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-200', activeBg: 'bg-cyan-500', activeText: 'text-white', activeBorder: 'border-cyan-600' },
  ];

  // Option 1: Use index to cycle through colors (consistent order)
  const colorIndex = index % colorPalette.length;
  
  // Option 2: Generate consistent color based on status string hash (same status always gets same color)
  // Uncomment this if you want consistent colors regardless of order
  /*
  let hash = 0;
  for (let i = 0; i < status.length; i++) {
    const char = status.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  colorIndex = Math.abs(hash) % colorPalette.length;
  */
  
  return colorPalette[colorIndex];
};

export default function LeadStatusRibbon({
  leadId,
  currentStatus,
  statusOptions,
  onStatusChange,
  disabled = false
}: LeadStatusPipelineProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  // Sort options by order
  const sortedOptions = [...statusOptions].sort((a, b) => a.order - b.order);

  const handleStatusClick = async (newStatus: string) => {
    if (newStatus === currentStatus || isUpdating || disabled) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/contacts/${leadId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lead_status: newStatus }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update lead status');
      }

      // Notify parent component of the change
      onStatusChange(newStatus);
    } catch (error) {
      console.error('Error updating lead status:', error);
      // You might want to show a toast notification here
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Horizontal Pipeline Bar - Salesforce Style */}
      <div className="flex items-stretch bg-gray-50 rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        {sortedOptions.map((option, index) => {
          const isActive = option.value === currentStatus;
          const isDisabled = disabled || isUpdating;
          const colors = generateStatusColors(option.value, index);
          const isLast = index === sortedOptions.length - 1;
          
          const baseClasses = "relative px-3 py-2.5 text-sm font-medium transition-all duration-300 cursor-pointer select-none flex-1 text-center flex items-center justify-center";
          
          const colorClasses = isActive 
            ? `${colors.activeBg} ${colors.activeText} shadow-inner`
            : `bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900`;
          
          const borderClasses = !isLast ? 'border-r border-gray-200' : '';
          
          const disabledClasses = isDisabled ? 'opacity-50 cursor-not-allowed' : '';

          return (
            <div
              key={option.value}
              className={`${baseClasses} ${colorClasses} ${borderClasses} ${disabledClasses}`}
              onClick={() => handleStatusClick(option.value)}
              title={isActive ? `Current status: ${option.label}` : `Change to ${option.label}`}
            >
              <div className="flex items-center justify-center space-x-2">
                {/* Active indicator dot */}
                {isActive && (
                  <div className="w-2 h-2 bg-current rounded-full opacity-80" />
                )}
                <span className={`${isActive ? 'font-semibold' : 'font-medium'} whitespace-nowrap`}>
                  {option.label}
                </span>
                {/* Loading spinner */}
                {isUpdating && option.value === currentStatus && (
                  <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin opacity-75" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}