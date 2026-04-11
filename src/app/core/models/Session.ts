import { SessionFeedback } from "./SessionFeedback";
import { Booking } from "./booking";

export interface Session {
  id?: number;
  booking?: Booking;  // Full booking object, use this to check booking status
  bookingId?: number; // Raw booking_id from API response
  meetingLink?: string;
  duration?: number;
  status: string;           // SCHEDULED | STARTED | COMPLETED | FEEDBACK_PENDING | CLOSED | MISSED
  startedAt?: string;
  endedAt?: string;
  feedback?: SessionFeedback;
}

export function getSessionDisplayStatus(session: Session): string {
  // If session is in FEEDBACK_PENDING state
  if (session.status === 'FEEDBACK_PENDING') {
    // If there is feedback, show as CLOSED
    return session.feedback ? 'CLOSED' : 'FEEDBACK_PENDING';
  }
  // If session is completed (DONE or COMPLETED status)
  if (session.status === 'DONE' || session.status === 'COMPLETED') {
    return session.feedback ? 'CLOSED' : 'FEEDBACK_PENDING';
  }
  return session.status;
}

export function getSessionStatusLabel(status: string): string {
  const map: Record<string, string> = {
    SCHEDULED: 'Scheduled',
    STARTED: 'Ongoing',
    ONGOING: 'Ongoing',
    DONE: 'Completed',
    COMPLETED: 'Completed',
    FEEDBACK_PENDING: 'Feedback Pending',
    CLOSED: 'Closed',
    MISSED: 'Missed'
  };
  return map[status] || status;
}

