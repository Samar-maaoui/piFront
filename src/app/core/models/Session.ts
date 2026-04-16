import { SessionFeedback } from "./SessionFeedback";
import { Booking } from "./booking";

export interface Session {
  id?: number;
  booking?: Booking;
  bookingId?: number;
  meetingLink?: string;
  duration?: number;
  status: SessionStatus;
  startedAt?: string;
  endedAt?: string;
  feedback?: SessionFeedback;
}

// Aligné avec ton enum Java : SCHEDULED, ONGOING, DONE, MISSED
export type SessionStatus = 'SCHEDULED' | 'ONGOING' | 'DONE' | 'MISSED';

// Transitions autorisées côté front (miroir du backend)
export const ALLOWED_TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  SCHEDULED: ['ONGOING', 'MISSED'],
  ONGOING:   ['DONE'],
  DONE:      [],
  MISSED:    []
};

// Vérifie si une transition est autorisée
export function canTransition(current: SessionStatus, next: SessionStatus): boolean {
  return ALLOWED_TRANSITIONS[current]?.includes(next) ?? false;
}

// Statut d'affichage (peut différer du statut brut, ex: FEEDBACK_PENDING)
export function getSessionDisplayStatus(session: Session): string {
  if (session.status === 'DONE' && !session.feedback) {
    return 'FEEDBACK_PENDING';
  }
  return session.status;
}

// Label affiché dans l'UI
export function getSessionStatusLabel(status: SessionStatus | string): string {
  const map: Record<string, string> = {
    SCHEDULED:        'Scheduled',
    ONGOING:          'Ongoing',
    DONE:             'Done',
    MISSED:           'Missed',
    FEEDBACK_PENDING: 'Review Pending',
    CLOSED:           'Closed',
    STARTED:          'Started',
  };
  return map[status] || status;
}

// Couleur du badge
export function getSessionStatusColor(status: SessionStatus | string): string {
  const map: Record<string, string> = {
    SCHEDULED: 'blue',
    ONGOING:   'amber',
    DONE:      'teal',
    MISSED:    'red'
  };
  return map[status] || 'gray';
}

// Label du bouton d'action
export function getTransitionLabel(next: SessionStatus): string {
  const map: Record<SessionStatus, string> = {
    ONGOING:   '▶ Démarrer',
    DONE:      '✓ Terminer',
    MISSED:    '✗ Marquer manquée',
    SCHEDULED: ''
  };
  return map[next];
}

export interface StudentDashboardDTO {
  totalSessions: number;
  upcomingSessions: number;
  totalMinutesLearned: number;
  nextSessions: Session[];
  sessionHistory: Session[];
}

export interface TutorDashboardDTO {
  totalSessions: number;
  upcomingSessions: number;
  averageRating: number;
  plannedSessions: Session[];
}