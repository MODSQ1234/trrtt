
import type { Trade } from '../types';
import { Side } from '../types';

// Helper for conditional class names
export const cn = (...classes: (string | undefined | false)[]) => {
  return classes.filter(Boolean).join(' ');
};

// Date and Time Formatting
const dateTimeFormatter = new Intl.DateTimeFormat('he-IL', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export const formatDateTime = (isoString: string) => {
  if (!isoString) return '';
  try {
    return dateTimeFormatter.format(new Date(isoString));
  } catch (e) {
    return "תאריך לא חוקי";
  }
};

// Currency Formatting
const currencyFormatters: { [key: string]: Intl.NumberFormat } = {
  ILS: new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }),
  USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
};

export const formatCurrency = (value: number, currency: 'ILS' | 'USD' | 'OTHER' = 'ILS') => {
  if (currency === 'OTHER') {
    return new Intl.NumberFormat('he-IL').format(value);
  }
  return currencyFormatters[currency].format(value);
};

// Trade Calculation
export const calculateNetAmount = (trade: Trade) => {
  const grossAmount = trade.quantity * trade.price;
  const totalDeductions = (trade.fees || 0) + (trade.tax || 0);
  const signedGross = trade.side === Side.SELL ? grossAmount : -grossAmount;
  return signedGross - totalDeductions;
};
