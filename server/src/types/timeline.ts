export type AuditEventType =
  | 'order_created'
  | 'status_changed'
  | 'line_added'
  | 'line_voided'
  | 'collaborator_added'
  | 'collaborator_removed'
  | 'note_added';

export interface DbOrderAuditEvent {
  id: string;
  order_id: string;
  actor_id: string | null;
  actor_name: string;
  actor_role: string;
  event_type: AuditEventType;
  old_status: string | null;
  new_status: string | null;
  item_name: string | null;
  quantity: number | null;
  unit_price: string | number | null;
  reason: string | null;
  notes: string | null;
  created_at: Date | string;
}

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

export interface RecordAuditEventInput {
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
}
