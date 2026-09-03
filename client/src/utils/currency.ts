/**
 * Formats a monetary amount into standard Indian Rupee (INR / ₹) currency format.
 * Examples:
 *   formatCurrency(90) => "₹90.00"
 *   formatCurrency(220) => "₹220.00"
 *   formatCurrency(1250) => "₹1,250.00"
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) {
    return '₹0.00';
  }
  const numericVal = typeof amount === 'number' ? amount : Number(amount);
  if (isNaN(numericVal)) {
    return '₹0.00';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericVal);
}
