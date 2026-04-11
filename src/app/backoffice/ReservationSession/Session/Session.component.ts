// session.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SessionService } from './services/session.service';
import { SessionFeedbackService } from './services/session-feedback.service';
import { Session, getSessionDisplayStatus, getSessionStatusLabel } from '../../../core/models/Session';
import { AuthService } from '../../../core/services/auth.service';
import { PermissionService } from '../../../core/services/permission.service';
declare var bootstrap: any;

@Component({
  selector: 'app-session',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule
  ],
  templateUrl: './session.component.html',
  styleUrls: ['./session.component.css']
})
export class SessionComponent implements OnInit {

  sessions: Session[] = [];
  filteredSessions: Session[] = [];
  activeTab = 'ALL';
  selectedSession: Session | null = null;

  // convenience flags derived from permissions
  isTutor  = false;
  isStudent = false;
  isAdmin = false;

  feedback = { rating: 0, comment: '' };

  tabs = [
    { value: 'ALL',             label: 'All',             icon: '📋' },
    { value: 'SCHEDULED',       label: 'Scheduled',       icon: '📅' },
    { value: 'STARTED',         label: 'Started',         icon: '🔴' },
    { value: 'FEEDBACK_PENDING', label: 'Feedback Pending', icon: '⏳' },
    { value: 'CLOSED',          label: 'Closed',          icon: '✅' },
    { value: 'MISSED',          label: 'Missed',          icon: '❌' },
  ];

  constructor(
    private sessionService: SessionService,
    private feedbackService: SessionFeedbackService,
    private auth: AuthService,
    public perm: PermissionService
  ) {
    // derive booleans via permission service
    this.isTutor = this.perm.canStartSession();
    this.isStudent = this.perm.canGiveFeedback();
    this.isAdmin = this.perm.canExportData();
  }

  ngOnInit(): void {
    this.loadSessions();
  }

  loadSessions(): void {
    // Changer selon le rôle
    const tutorId = 1;
    this.sessionService.getByTutor(tutorId).subscribe(data => {
      this.sessions = data;
      this.filteredSessions = data;
    });
  }

  filterSessions(): void {
    this.filteredSessions = this.activeTab === 'ALL'
      ? this.sessions.filter(s => getSessionDisplayStatus(s) !== 'HIDDEN')
      : this.sessions.filter(s => {
          const displayStatus = getSessionDisplayStatus(s);
          return displayStatus !== 'HIDDEN' && displayStatus === this.activeTab;
        });
  }

  getSessionDisplayStatus(session: Session): string {
    return getSessionDisplayStatus(session);
  }

  getSessionStatusLabel(status: string): string {
    return getSessionStatusLabel(status);
  }

  countByStatus(status: string): number {
    if (status === 'ALL') {
      return this.sessions.filter(s => getSessionDisplayStatus(s) !== 'HIDDEN').length;
    }
    return this.sessions.filter(s => {
      const displayStatus = getSessionDisplayStatus(s);
      return displayStatus !== 'HIDDEN' && displayStatus === status;
    }).length;
  }

  startSession(id?: number): void {
    if (!id) return;
    this.sessionService.start(id).subscribe(() => this.loadSessions());
  }

  endSession(id?: number): void {
    if (!id) return;
    this.sessionService.end(id).subscribe(() => this.loadSessions());
  }

  markMissed(id?: number): void {
    if (!id) return;
    if (confirm('Mark this session as missed?')) {
      this.sessionService.missed(id).subscribe(() => this.loadSessions());
    }
  }

  openFeedback(session: Session): void {
    this.selectedSession = session;
    this.feedback = { rating: 0, comment: '' };
    const modal = new bootstrap.Modal(document.getElementById('feedbackModal'));
    modal.show();
  }

  submitFeedback(): void {
    if (!this.selectedSession || this.feedback.rating === 0) {
      alert('Please select a rating');
      return;
    }
    this.feedbackService.add(this.selectedSession.id!, {
      studentId: 1,
      rating: this.feedback.rating,
      comment: this.feedback.comment
    }).subscribe(() => {
      this.loadSessions();
      bootstrap.Modal.getInstance(document.getElementById('feedbackModal')).hide();
    });
  }

  getRatingLabel(): string {
    const labels: any = {
      0: 'Select a rating',
      1: '😞 Poor',
      2: '😐 Fair',
      3: '🙂 Good',
      4: '😊 Very Good',
      5: '🤩 Excellent!'
    };
    return labels[this.feedback.rating];
  }

  getStatusClass(status: string): string {
    const map: any = {
      'SCHEDULED':       'bg-primary',
      'ONGOING':         'bg-danger',
      'STARTED':         'bg-danger',
      'DONE':            'bg-success',
      'COMPLETED':       'bg-success',
      'FEEDBACK_PENDING':'bg-warning text-dark',
      'CLOSED':          'bg-success',
      'MISSED':          'bg-secondary'
    };
    return map[status] || 'bg-secondary';
  }
}