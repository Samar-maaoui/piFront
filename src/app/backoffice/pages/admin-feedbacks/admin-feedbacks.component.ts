import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionFeedbackService } from '../../ReservationSession/Session/services/session-feedback.service';
import { SessionFeedback } from '../../../core/models/SessionFeedback';

@Component({
    selector: 'app-admin-feedbacks',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="feedbacks-page">
      <h2>⭐ Session Feedbacks</h2>
      <p class="subtitle">Visualisez les retours des étudiants et tuteurs sur les sessions.</p>

      <div *ngIf="loading" class="loading-state">Chargement des feedbacks...</div>
      <div *ngIf="errorMessage" class="error-state">{{ errorMessage }}</div>

      <div *ngIf="!loading && feedbacks.length === 0" class="placeholder-card">
        <span class="placeholder-icon">💬</span>
        <p>Aucun feedback disponible pour le moment.</p>
      </div>

      <div *ngIf="!loading && feedbacks.length > 0" class="feedback-list">
        <div *ngFor="let feedback of feedbacks" class="feedback-card">
          <div class="feedback-card__header">
            <div>
              <strong>Session #{{ feedback.sessionId }}</strong>
              <span class="feedback-meta">• Student #{{ feedback.studentId }}</span>
            </div>
            <span class="feedback-score">{{ feedback.rating }}/5</span>
          </div>
          <p class="feedback-comment">{{ feedback.comment || 'No comment.' }}</p>
          <div class="feedback-footer">
            <small>{{ feedback.createdAt ? (feedback.createdAt | date:'short') : '' }}</small>
            <div class="feedback-actions">
              <button class="btn btn-sm btn-secondary me-2" (click)="viewFeedback(feedback)">Voir</button>
              <button class="btn btn-sm btn-danger" (click)="deleteFeedback(feedback.id!)">Supprimer</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .feedbacks-page { padding: 2rem; }
    h2 { font-size: 1.8rem; color: #1e293b; margin-bottom: 0.5rem; }
    .subtitle { color: #64748b; margin-bottom: 1.5rem; }
    .placeholder-card {
      background: #fff;
      border: 2px dashed #cbd5e1;
      border-radius: 12px;
      padding: 3rem;
      text-align: center;
      color: #94a3b8;
    }
    .placeholder-icon { font-size: 3rem; display: block; margin-bottom: 1rem; }
    .feedback-list { display: grid; gap: 1rem; }
    .feedback-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 1.25rem;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
    }
    .feedback-card__header {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: center;
      margin-bottom: 0.75rem;
    }
    .feedback-meta { color: #64748b; margin-left: 0.5rem; }
    .feedback-score { font-size: 1rem; font-weight: 700; color: #0f172a; }
    .feedback-comment { margin-bottom: 1rem; color: #334155; }
    .feedback-footer { display: flex; justify-content: space-between; align-items: center; color: #64748b; }
    .loading-state, .error-state { color: #334155; padding: 1rem 0; }
  `]
})
export class AdminFeedbacksComponent implements OnInit {
  feedbacks: SessionFeedback[] = [];
  loading = true;
  errorMessage = '';

  constructor(private feedbackService: SessionFeedbackService) {}

  ngOnInit(): void {
    this.loadFeedbacks();
  }

  loadFeedbacks(): void {
    this.loading = true;
    this.errorMessage = '';
    this.feedbackService.getAll().subscribe({
      next: (data) => {
        this.feedbacks = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading feedbacks:', error);
        this.errorMessage = 'Unable to load feedbacks.';
        this.loading = false;
      }
    });
  }

  deleteFeedback(id: number): void {
    if (!confirm('Supprimer ce feedback définitivement ?')) return;
    this.feedbackService.delete(id).subscribe({
      next: () => this.loadFeedbacks(),
      error: (error) => {
        console.error('Error deleting feedback:', error);
        this.errorMessage = 'Erreur lors de la suppression du feedback.';
      }
    });
  }

  viewFeedback(feedback: SessionFeedback): void {
    alert(`Feedback for session #${feedback.sessionId}\nStudent #${feedback.studentId}\nRating: ${feedback.rating}/5\nComment: ${feedback.comment || 'Aucun commentaire'}`);
  }
}
