import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { SessionService } from '../../../../backoffice/ReservationSession/Session/services/session.service';
import { SessionFeedbackService } from '../../../../backoffice/ReservationSession/Session/services/session-feedback.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Session, getSessionDisplayStatus, getSessionStatusLabel } from '../../../../core/models/Session';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-tutor-sessions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tutor-sessions.component.html',
  styleUrls: ['./tutor-sessions.component.css']
})
export class TutorSessionsComponent implements OnInit {

  sessions: Session[] = [];
  filteredSessions: Session[] = [];
  activeTab = 'ALL';
  tutorId = 1;

  tabs = [
    { value: 'SCHEDULED',       label: 'Scheduled',       icon: '' },
    { value: 'STARTED',         label: 'Started',         icon: '' },
    { value: 'FEEDBACK_PENDING', label: 'Feedback Pending', icon: '' },
    { value: 'CLOSED',          label: 'Closed',          icon: '' },
    { value: 'MISSED',          label: 'Missed',          icon: '' },
    { value: 'ALL',             label: 'All',             icon: '' },
  ];

  constructor(
    private sessionService: SessionService,
    private feedbackService: SessionFeedbackService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.tutorId = user?.id || 1;
    this.loadSessions();
  }

  loadSessions(): void {
    forkJoin({
      sessions: this.sessionService.getByTutor(this.tutorId),
      feedbacks: this.feedbackService.getByTutor(this.tutorId)
    }).subscribe({
      next: ({ sessions, feedbacks }) => {
        this.sessions = sessions.map(session => ({
          ...session,
          feedback: feedbacks.find(f =>
            Number(f.sessionId) === Number(session.id) ||
            Number(f.session?.id) === Number(session.id)
          )
        }));
        console.log('Sessions with feedbacks:', this.sessions);
        this.filterSessions();
      },
      error: (err) => {
        console.error('Error loading sessions or feedbacks:', err);
        this.sessions = [];
        this.filterSessions();
      }
    });
  }

  private getVisibleSessions(): Session[] {
    return this.sessions.filter(s => getSessionDisplayStatus(s) !== 'HIDDEN');
  }

  filterSessions(): void {
    this.filteredSessions = this.activeTab === 'ALL'
      ? this.getVisibleSessions()
      : this.getVisibleSessions().filter(s => getSessionDisplayStatus(s) === this.activeTab);
  }

  countByStatus(status: string): number {
    return status === 'ALL'
      ? this.getVisibleSessions().length
      : this.getVisibleSessions().filter(s => getSessionDisplayStatus(s) === status).length;
  }

  startSession(id: number | undefined): void {
    if (!id) return;
    
    const session = this.sessions.find(s => s.id === id);
    if (session && session.booking?.sessionDate && session.booking?.startTime) {
      const scheduledDateTimeStr = `${session.booking.sessionDate}T${session.booking.startTime}`;
      const scheduledDate = new Date(scheduledDateTimeStr);
      const now = new Date();
      
      if (now < scheduledDate) {
        Swal.fire({
          icon: 'warning',
          title: 'Trop tôt',
          text: 'Vous ne pouvez pas démarrer la session avant l\'heure prévue.',
        });
        return;
      }
    }

    this.sessionService.start(id).subscribe({
      next: () => this.loadSessions(),
      error: (err) => Swal.fire('Erreur', err.error?.message || 'Error starting session', 'error')
    });
  }

  endSession(id: number | undefined): void {
    if (!id) return;
    const session = this.sessions.find(s => s.id === id);
    const dateStr = session?.booking?.sessionDate || '';
    const student = session?.booking?.studentId || '';

    Swal.fire({
      title: 'Terminer la session ?',
      text: `Voulez-vous vraiment terminer la session du ${dateStr} avec l'étudiant #${student} ?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Oui, terminer',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        this.sessionService.end(id).subscribe({
          next: () => {
            Swal.fire('Terminée', 'La session a été terminée.', 'success');
            this.loadSessions();
          },
          error: (err) => Swal.fire('Erreur', err.error?.message || 'Error ending session', 'error')
        });
      }
    });
  }

  markMissed(id: number | undefined): void {
    if (!id) return;
    const session = this.sessions.find(s => s.id === id);
    const dateStr = session?.booking?.sessionDate || '';
    const student = session?.booking?.studentId || '';

    Swal.fire({
      title: 'Signaler une absence ?',
      text: `Voulez-vous marquer l'étudiant #${student} comme absent pour la session du ${dateStr} ?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Oui, absent',
      confirmButtonColor: '#d33',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        this.sessionService.missed(id).subscribe({
          next: () => {
            Swal.fire('Signalé', "L'étudiant a été marqué comme absent.", 'success');
            this.loadSessions();
          },
          error: (err) => Swal.fire('Erreur', err.error?.message || 'Erreur', 'error')
        });
      }
    });
  }

  getSessionStatusLabel(status: string): string {
    return getSessionStatusLabel(status);
  }

  getSessionDisplayStatus(s: Session): string {
    return getSessionDisplayStatus(s);
  }

  getStatusIcon(status: string): string {
    const map: any = {
      'SCHEDULED': '',
      'ONGOING':   '',
      'DONE':      '',
      'COMPLETED': '',
      'MISSED':    '',
      'FEEDBACK_PENDING': '',
      'CLOSED': ''
    };
    return map[status] || '';
  }

  viewFeedback(session: Session): void {
    const feedback = session.feedback;
    if (!feedback) {
      Swal.fire('Info', 'Aucun feedback disponible pour cette session.', 'info');
      return;
    }
    Swal.fire({
      title: `Feedback (Session #${session.id})`,
      html: `<strong>Note:</strong> ${feedback.rating}/5<br><br><strong>Commentaire:</strong><br>${feedback.comment || 'Aucun commentaire'}`,
      icon: 'info'
    });
  }
}