export function toLocalizedNumber(num: number, locale: string): string {
  return num.toLocaleString(locale);
}

export function formatForwardUnits(seconds: number, t: (key: string) => string): string {
  if (seconds < 60) return `${seconds} ${t('second')}`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} ${t('minute')}`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} ${t('hour')}`;
  return `${Math.floor(seconds / 86400)} ${t('day')}`;
}

export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
