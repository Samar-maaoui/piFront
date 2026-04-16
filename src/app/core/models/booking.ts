import { Session } from "./Session";

export interface Booking {
  id?: number;
  studentId: number;
  tutorId: number;
  type: string;           // ONE_TO_ONE | GROUP | INFO_SESSION
  status?: string;        // PENDING | ACCEPTED | CANCELLED | COMPLETED | REJECTED
  sessionDate: string;
  startTime: string;
  endTime: string;
  notes?: string;
  rejectionReason?: string;
  cancellationReason?: string;
  createdAt?: string;
  updatedAt?: string;
  session?: Session;
}

export function getBookingDisplayStatus(status: string | undefined): string {
  if (!status) return 'UNKNOWN';
  if (status === 'CONFIRMED') return 'ACCEPTED';
  return status;
}

export function getBookingStatusLabel(status: string | undefined): string {
  const map: Record<string, string> = {
    PENDING: 'Pending',
    CONFIRMED: 'Accepted',
    ACCEPTED: 'Accepted',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    REJECTED: 'Rejected'
  };
  return map[status ?? ''] || status || 'UNKNOWN';
}
