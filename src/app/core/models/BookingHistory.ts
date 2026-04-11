export interface BookingHistory {
  id?: number;
  bookingId?: number;
  oldStatus?: string;
  newStatus: string;
  changedBy: string;        // STUDENT | TUTOR | ADMIN | SYSTEM
  reason?: string;
  changedAt?: string;
}