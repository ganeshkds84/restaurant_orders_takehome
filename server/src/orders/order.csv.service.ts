import { OrderWithLines } from '../types/order.js';

function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) {
    return '""';
  }
  const str = String(val);
  // RFC 4180 escaping: double any double quotes inside
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Generate RFC 4180-compliant CSV string representing the day's orders and their lines.
 */
export function generateDailyOrdersCsv(orders: OrderWithLines[], dateStr: string): string {
  const headers = [
    'Order ID',
    'Table Number',
    'Status',
    'Placed At',
    'Primary Waiter Name',
    'Primary Waiter Email',
    'Order Total',
    'Line Item Name',
    'Quantity',
    'Unit Price',
    'Line Total',
    'Special Instructions',
    'Is Voided',
    'Void Reason',
  ];

  const rows: string[] = [headers.map(escapeCsvField).join(',')];

  for (const order of orders) {
    const placedAt = new Date(order.createdAt).toISOString();
    const primaryWaiterName = order.primaryWaiter?.name || '';
    const primaryWaiterEmail = order.primaryWaiter?.email || '';
    const orderTotal = typeof order.totalPrice === 'number' ? order.totalPrice.toFixed(2) : String(order.totalPrice);

    if (!order.lines || order.lines.length === 0) {
      // Order with no lines
      const row = [
        order.id,
        order.tableNumber,
        order.status,
        placedAt,
        primaryWaiterName,
        primaryWaiterEmail,
        orderTotal,
        '',
        '',
        '',
        '',
        '',
        'No',
        '',
      ];
      rows.push(row.map(escapeCsvField).join(','));
    } else {
      for (const line of order.lines) {
        const linePrice = typeof line.unitPrice === 'number' ? line.unitPrice.toFixed(2) : String(line.unitPrice);
        const lineTotal = (line.quantity * (typeof line.unitPrice === 'number' ? line.unitPrice : parseFloat(line.unitPrice))).toFixed(2);

        const row = [
          order.id,
          order.tableNumber,
          order.status,
          placedAt,
          primaryWaiterName,
          primaryWaiterEmail,
          orderTotal,
          line.itemName,
          String(line.quantity),
          linePrice,
          lineTotal,
          line.specialInstructions || '',
          line.isVoided ? 'Yes' : 'No',
          line.voidReason || '',
        ];
        rows.push(row.map(escapeCsvField).join(','));
      }
    }
  }

  return rows.join('\r\n');
}
