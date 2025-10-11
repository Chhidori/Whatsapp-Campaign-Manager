import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts a UTC date string to a local Date object
 * Handles both ISO strings with and without 'Z' suffix
 */
export function parseUTCDate(dateString: string): Date {
  // Ensure the date string is treated as UTC
  const utcString = dateString.includes('Z') ? dateString : dateString + 'Z';
  return new Date(utcString);
}

/**
 * Formats a UTC date string to local time with relative formatting (ago)
 */
export function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = parseUTCDate(dateString);
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  return date.toLocaleDateString();
}

/**
 * Formats a UTC date string to local date and time
 */
export function formatDateTime(dateString: string): string {
  const date = parseUTCDate(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Formats a UTC date string to local time only
 */
export function formatTime(dateString: string): string {
  const date = parseUTCDate(dateString);
  return date.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
}

/**
 * Formats a UTC date string to a date group label (Today, Yesterday, or full date)
 */
export function formatDateGroup(dateString: string): string {
  const date = parseUTCDate(dateString);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.toDateString() === now.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }
}