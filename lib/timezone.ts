import { fromZonedTime, toZonedTime, format as tzFormat } from 'date-fns-tz';
import { DEFAULT_TIMEZONE } from './constants';

export const COMMON_TIMEZONES = [
  'Europe/Madrid',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Rome',
  'Europe/Amsterdam',
  'Europe/Stockholm',
  'Europe/Zurich',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Mexico_City',
  'America/Toronto',
  'America/Sao_Paulo',
  'America/Buenos_Aires',
  'Asia/Dubai',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Hong_Kong',
  'Asia/Seoul',
  'Asia/Bangkok',
  'Asia/Kolkata',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',
  'Africa/Johannesburg',
  'Africa/Cairo',
  'UTC',
];

/**
 * Convert date in user's timezone to UTC for storage
 * @param date - Date in user's local timezone
 * @param timezone - IANA timezone string (e.g., "Europe/Madrid")
 * @returns UTC date for database storage
 */
export function convertToUTC(date: Date, timezone: string): Date {
  return fromZonedTime(date, timezone);
}

/**
 * Convert UTC date from database to user's timezone for display
 * @param utcDate - UTC date from database
 * @param timezone - IANA timezone string (e.g., "Europe/Madrid")
 * @returns Date in user's timezone
 */
export function convertFromUTC(utcDate: Date, timezone: string): Date {
  return toZonedTime(utcDate, timezone);
}

/**
 * Format UTC date for display in user's timezone
 * @param utcDate - UTC date from database
 * @param timezone - IANA timezone string
 * @param formatStr - date-fns format string
 * @returns Formatted date string in user's timezone
 */
export function formatInTimezone(
  utcDate: Date,
  timezone: string,
  formatStr: string = 'PPP p'
): string {
  const zonedDate = convertFromUTC(utcDate, timezone);
  return tzFormat(zonedDate, formatStr, { timeZone: timezone });
}

/**
 * Parse time input ("HH:mm") in user's timezone
 * Creates a date with the specified time in the user's timezone
 * @param timeString - Time in "HH:mm" format (e.g., "14:00")
 * @param date - Base date to apply the time to
 * @param timezone - IANA timezone string
 * @returns Date with time applied in user's timezone
 */
export function parseTimeInTimezone(
  timeString: string,
  date: Date,
  timezone: string
): Date {
  const [hours, minutes] = timeString.split(':').map(Number);

  // Convert the base date to user's timezone
  const zonedDate = toZonedTime(date, timezone);

  // Set the time in user's timezone
  zonedDate.setHours(hours, minutes, 0, 0);

  return zonedDate;
}

/**
 * Extract time string ("HH:mm") from date in specific timezone
 * @param date - Date to extract time from (can be UTC)
 * @param timezone - IANA timezone string
 * @returns Time string in "HH:mm" format
 */
export function extractTimeInTimezone(date: Date, timezone: string): string {
  return formatInTimezone(date, timezone, 'HH:mm');
}

/**
 * Get default timezone
 */
export function getDefaultTimezone(): string {
  return DEFAULT_TIMEZONE;
}
