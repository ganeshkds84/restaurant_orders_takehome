export type AuditEventType =
  | 'order_created'
  | 'status_changed'
  | 'line_added'
  | 'line_voided'
  | 'collaborator_added'
  | 'collaborator_removed'
  | 'note_added';

export interface OrderAuditEvent {
  id: string;
  orderId: string;
  actorId: string | null;
  actorName: string;
  actorRole: string;
  eventType: AuditEventType;
  oldStatus?: string | null;
  newStatus?: string | null;
  itemName?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  reason?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface OrderTimelineResponse {
  status: string;
  data: {
    timeline: OrderAuditEvent[];
    events?: OrderAuditEvent[];
  };
}
