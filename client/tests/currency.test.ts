import { describe, it, expect } from 'vitest';
import { formatCurrency } from '../src/utils/currency';

describe('INR Currency Formatter (formatCurrency)', () => {
  it('formats standard integer numbers into INR format with ₹ and two decimals', () => {
    expect(formatCurrency(90)).toBe('₹90.00');
    expect(formatCurrency(220)).toBe('₹220.00');
    expect(formatCurrency(320)).toBe('₹320.00');
  });

  it('formats decimal numbers properly', () => {
    expect(formatCurrency(12.5)).toBe('₹12.50');
    expect(formatCurrency(99.99)).toBe('₹99.99');
  });

  it('formats thousands with Indian grouping separator (lakhs/thousands)', () => {
    expect(formatCurrency(1250)).toBe('₹1,250.00');
    expect(formatCurrency(150000)).toBe('₹1,50,000.00');
  });

  it('handles string input values safely', () => {
    expect(formatCurrency('280.00')).toBe('₹280.00');
    expect(formatCurrency('60')).toBe('₹60.00');
  });

  it('handles zero, null, undefined and invalid values safely', () => {
    expect(formatCurrency(0)).toBe('₹0.00');
    expect(formatCurrency('0')).toBe('₹0.00');
    expect(formatCurrency(null)).toBe('₹0.00');
    expect(formatCurrency(undefined)).toBe('₹0.00');
    expect(formatCurrency('invalid')).toBe('₹0.00');
  });
});
