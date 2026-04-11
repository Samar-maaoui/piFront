import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  constructor(private auth: AuthService) {}

  private role(): 'STUDENT' | 'TUTOR' | 'ADMIN' | null {
    return this.auth.getUserRole();
  }

  // Reservation / booking
  canCreateReservation(): boolean {
    return this.role() === 'STUDENT';
  }

  canViewOwnReservations(): boolean {
    return ['STUDENT', 'TUTOR', 'ADMIN'].includes(this.role() as string);
  }

  canViewAllReservations(): boolean {
    return this.role() === 'ADMIN';
  }

  canModifyReservation(status?: string): boolean {
    const r = this.role();
    if (r === 'ADMIN') {
      return true;
    }
    if (r === 'STUDENT' && status === 'PENDING') {
      return true;
    }
    return false;
  }

  canConfirmReservation(): boolean {
    return ['TUTOR', 'ADMIN'].includes(this.role() as string);
  }

  canRefuseReservation(): boolean {
    return ['TUTOR', 'ADMIN'].includes(this.role() as string);
  }

  canCancelReservation(): boolean {
    return ['STUDENT', 'TUTOR', 'ADMIN'].includes(this.role() as string);
  }

  // Availability (tutor dashboard)
  canManageAvailability(): boolean {
    return ['TUTOR', 'ADMIN'].includes(this.role() as string);
  }

  // Session actions
  canStartSession(): boolean {
    return this.role() === 'TUTOR';
  }

  canEndSession(): boolean {
    return this.role() === 'TUTOR';
  }

  canJoinSession(): boolean {
    return ['STUDENT', 'TUTOR'].includes(this.role() as string);
  }

  canGiveFeedback(): boolean {
    return this.role() === 'STUDENT';
  }

  canViewFeedbacksReceived(): boolean {
    return ['TUTOR', 'ADMIN'].includes(this.role() as string);
  }

  canDeleteFeedback(isOwn: boolean): boolean {
    return isOwn || this.role() === 'TUTOR';
  }

  canViewHistory(isOwn: boolean): boolean {
    if (isOwn) {
      return true;
    }
    return ['TUTOR', 'ADMIN'].includes(this.role() as string);
  }

  canExportData(): boolean {
    return this.role() === 'ADMIN';
  }
}
