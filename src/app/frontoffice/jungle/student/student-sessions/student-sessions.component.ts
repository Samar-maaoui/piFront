import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BookingService } from '@core/services/booking.service';
import { AuthService } from '@core/services/auth.service';
import { Session, getSessionDisplayStatus, getSessionStatusLabel } from '@core/models/Session';
import { SessionFeedback } from '@core/models/SessionFeedback';
import { SessionFeedbackService } from '@backoffice/ReservationSession/Session/services/session-feedback.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-student-sessions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './student-sessions.component.html',
  styleUrls: ['./student-sessions.component.css']
})
export class StudentSessionsComponent implements OnInit {
  sessions: Session[] = [];
  filteredSessions: Session[] = [];
  loading = true;

  activeTab = 'ALL';
  tabs = [
    { value: 'ALL', label: 'Toutes' },
    { value: 'SCHEDULED', label: 'SCHEDULED' },
    { value: 'STARTED', label: 'STARTED' },
    { value: 'FEEDBACK_PENDING', label: 'FEEDBACK_PENDING' },
    { value: 'CLOSED', label: 'CLOSED' }
  ];

  // Feedback modal
  showFeedbackModal = false;
  selectedSession: Session | null = null;
  feedbackRating = 0;
  feedbackComment = '';
  submittingFeedback = false;
  isEditingFeedback = false;

  constructor(
    private bookingService: BookingService,
    private authService: AuthService,
    private feedbackService: SessionFeedbackService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadSessions();
  }

  loadSessions(): void {
    const user = this.authService.getCurrentUser();
    if (!user?.id) {
      this.loading = false;
      return;
     
    }

    this.bookingService.getStudentSessions(user.id).subscribe({
      next: (sessions: Session[]) => {
        // Load feedback for these sessions
        this.feedbackService.getByStudent(user.id).subscribe({
          next: (feedbacks: SessionFeedback[]) => {
            // Assign feedback to sessions
            this.sessions = sessions.map(session => ({
              ...session,
              feedback: feedbacks.find(f =>
                Number(f.sessionId) === Number(session.id) ||
                Number(f.session?.id) === Number(session.id)
              )
            }));
            this.filterSessions();
            this.loading = false;
          },
          error: (error) => {
            console.error('Error loading feedback:', error);
            this.sessions = sessions;
            this.filterSessions();
            this.loading = false;
          }
        });
      },
      error: (error: any) => {
        console.error('Error loading sessions:', error);
        this.loading = false;
      }
    });
  }

  filterSessions(): void {
    if (this.activeTab === 'ALL') {
      this.filteredSessions = this.sessions.filter(s => getSessionDisplayStatus(s) !== 'HIDDEN');
    } else {
      this.filteredSessions = this.sessions.filter(s => {
        const displayStatus = getSessionDisplayStatus(s);
        return displayStatus !== 'HIDDEN' && displayStatus === this.activeTab;
      });
    }
  }

  getSessionDisplayStatus(session: Session): string {
    return getSessionDisplayStatus(session);
  }

  getSessionStatusLabel(status: string): string {
    return getSessionStatusLabel(status);
  }

  getTabCount(tabValue: string): number {
    if (tabValue === 'ALL') {
      return this.sessions.filter(s => getSessionDisplayStatus(s) !== 'HIDDEN').length;
    }
    return this.sessions.filter(s => {
      const displayStatus = getSessionDisplayStatus(s);
      return displayStatus !== 'HIDDEN' && displayStatus === tabValue;
    }).length;
  }

  getEmptyMessage(): string {
    switch (this.activeTab) {
      case 'SCHEDULED': return 'No upcoming sessions';
      case 'ONGOING': return 'No ongoing sessions';
      case 'DONE': return 'No completed sessions';
      default: return 'No sessions found';
    }
  }

  getSessionStatusClass(session: Session): string {
    return session.status.toLowerCase();
  }

  getStatusClass(status: string): string {
    return `status-${status.toLowerCase()}`;
  }

  getStatusLabel(status: string): string {
    return getSessionStatusLabel(status);
  }

  getTutorName(session: Session | null): string {
    if (!session) return '';
    return `Tuteur #${session.booking?.tutorId ?? ''}`;
  }

  formatSessionDate(session: Session): string {
    if (!session.booking?.sessionDate) return '';
    const date = new Date(session.booking.sessionDate);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatDate(dateString?: string | null): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
  }

  endSession(session: Session): void {
    const sessionId = session.id;
    if (!sessionId) return;
    const dateStr = this.formatSessionDate(session);
    const tutorName = this.getTutorName(session);

    Swal.fire({
      title: 'Terminer la session ?',
      text: `Voulez-vous vraiment terminer la session du ${dateStr} avec ${tutorName} ?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Oui, terminer',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        this.bookingService.endSession(sessionId).subscribe({
          next: () => {
             Swal.fire('Terminée', 'La session a été terminée avec succès.', 'success');
             this.loadSessions();
          },
          error: (error: any) => Swal.fire('Erreur', 'Une erreur est survenue en terminant la session.', 'error')
        });
      }
    });
  }

  openFeedbackModal(session: Session): void {
    this.selectedSession = session;
    this.isEditingFeedback = !!session.feedback?.id;
    this.feedbackRating = session.feedback?.rating || 0;
    this.feedbackComment = session.feedback?.comment || '';
    this.showFeedbackModal = true;
  }

  closeFeedbackModal(): void {
    this.showFeedbackModal = false;
    this.selectedSession = null;
    this.feedbackRating = 0;
    this.feedbackComment = '';
    this.isEditingFeedback = false;
  }

  submitFeedback(): void {
    if (!this.selectedSession || !this.feedbackRating) return;

    const sessionId = this.selectedSession.id;
    if (!sessionId) return;

    const user = this.authService.getCurrentUser();

    const payload: Partial<SessionFeedback> = {
      studentId: user?.id,
      rating: this.feedbackRating,
      comment: this.feedbackComment
    };

    this.submittingFeedback = true;
    const request = this.isEditingFeedback && this.selectedSession.feedback?.id
      ? this.feedbackService.update(this.selectedSession.feedback.id, payload)
      : this.feedbackService.add(sessionId, payload);

    request.subscribe({
      next: () => {
        this.submittingFeedback = false;
        this.closeFeedbackModal();
        this.loadSessions();
      },
      error: (error: any) => {
        console.error('Error saving feedback:', error);
        this.submittingFeedback = false;
      }
    });
  }

  deleteFeedback(session: Session): void {
    const feedbackId = session.feedback?.id;
    if (!feedbackId) return;
    
    Swal.fire({
      title: 'Supprimer le feedback ?',
      text: 'Êtes-vous sûr de vouloir supprimer cet avis ?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Oui, supprimer',
      confirmButtonColor: '#d33',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        this.feedbackService.delete(feedbackId).subscribe({
          next: () => {
            session.feedback = undefined;
            this.filterSessions();
            Swal.fire('Supprimé', 'Le feedback a été supprimé.', 'success');
          },
          error: (error: any) => Swal.fire('Erreur', 'Impossible de supprimer le feedback.', 'error')
        });
      }
    });
  }

  viewFeedback(session: Session): void {
    console.log('Viewing feedback:', session.feedback);
  }
}
