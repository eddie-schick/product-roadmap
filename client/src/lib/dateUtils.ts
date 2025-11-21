import { parse, format } from 'date-fns';

export function quarterToDateRange(quarter: string | null): { start: Date; end: Date } {
  const currentYear = new Date().getFullYear();
  const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1;
  
  if (!quarter || quarter === 'TBD') {
    // Default to current quarter
    const startMonth = (currentQuarter - 1) * 3;
    const endMonth = startMonth + 2;
    return {
      start: new Date(currentYear, startMonth, 1),
      end: new Date(currentYear, endMonth + 1, 0)
    };
  }

  const match = quarter.match(/Q(\d) (\d{4})/);
  if (!match) {
    return {
      start: new Date(),
      end: new Date()
    };
  }

  const q = parseInt(match[1]);
  const year = parseInt(match[2]);
  const startMonth = (q - 1) * 3;
  const endMonth = startMonth + 2;

  return {
    start: new Date(year, startMonth, 1),
    end: new Date(year, endMonth + 1, 0)
  };
}

export function formatDate(date: string | null): string {
  if (!date) return '';
  try {
    return format(new Date(date), 'MMM d, yyyy');
  } catch {
    return date;
  }
}

export function parseDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'yyyy-MM-dd');
  } catch {
    return dateStr;
  }
}
