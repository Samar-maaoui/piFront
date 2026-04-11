import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { SessionService } from '../../../../backoffice/ReservationSession/Session/services/session.service';
import { SessionFeedbackService } from '../../../../backoffice/ReservationSession/Session/services/session-feedback.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Session, getSessionDisplayStatus, getSessionStatusLabel } from '../../../../core/models/Session';

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
    this.sessionService.start(id).subscribe({
      next: () => this.loadSessions(),
      error: (err) => alert(err.error?.message || 'Error starting session')
    });
  }

  endSession(id: number | undefined): void {
    if (!id) return;
    if (confirm('End this session now?')) {
      this.sessionService.end(id).subscribe({
        next: () => this.loadSessions(),
        error: (err) => alert(err.error?.message || 'Error ending session')
      });
    }
  }

  markMissed(id: number | undefined): void {
    if (!id) return;
    if (confirm('Mark student as absent?')) {
      this.sessionService.missed(id).subscribe({
        next: () => this.loadSessions(),
        error: (err) => alert(err.error?.message)
      });
    }
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
      alert('Aucun feedback disponible pour cette session.');
      return;
    }
    alert(
      `Feedback for session #${session.id}\nRating: ${feedback.rating}/5\nComment: ${feedback.comment || 'Aucun commentaire'}`
    );
  }
}