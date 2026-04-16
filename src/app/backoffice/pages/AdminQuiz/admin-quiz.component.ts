import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { QuizService } from '../../../../app/backoffice/pages/Quiz/quiz.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-quiz',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DecimalPipe],
  templateUrl: './admin-quiz.component.html',
  styleUrls: ['./admin-quiz.component.css']
})
export class AdminQuizComponent implements OnInit {

  quizzes:         any[] = [];
  filteredQuizzes: any[] = [];
  searchTerm   = '';
  activeFilter = 'ALL';
  levelFilter  = '';

  totalQuizzes   = 0;
  publishedCount = 0;
  draftCount     = 0;
  totalAttempts  = 0;

  filters = [
    { value: 'ALL',       label: 'All',       icon: '📋' },
    { value: 'PUBLISHED', label: 'Published', icon: '✅' },
    { value: 'DRAFT',     label: 'Drafts',    icon: '📝' },
    { value: 'ARCHIVED',  label: 'Archived',  icon: '🗄️' },
  ];

  levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  tutorsMap: Map<number, string> = new Map();

  private api = 'http://localhost:8080/api';

  constructor(
    private quizService: QuizService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadTutors();
    this.loadQuizzes();
  }

  loadTutors(): void {
    this.http.get<any[]>(`${this.api}/users`).subscribe({
      next: (users) => {
        users.forEach(u => {
          const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || u.email || `User #${u.id}`;
          this.tutorsMap.set(u.id, name);
        });
      },
      error: () => {}
    });
  }

  getTutorName(id: number): string {
    return this.tutorsMap.get(id) || `Tutor #${id}`;
  }

  loadQuizzes(): void {
    this.quizService.getAll().subscribe({
      next: (data) => {
        this.quizzes = data;
        this.quizzes.forEach(q => {
          this.http.get<any[]>(`${this.api}/quiz-attempts/quiz/${q.id}`)
            .subscribe({
              next: (attempts) => {
                q.attemptsCount = attempts.length;
                const completed = attempts.filter((a: any) => a.status === 'COMPLETED');
                q.avgScore = completed.length
                  ? completed.reduce((sum: number, a: any) => sum + a.percentage, 0) / completed.length
                  : null;
              },
              error: () => { q.attemptsCount = 0; q.avgScore = null; }
            });
        });
        this.totalQuizzes   = data.length;
        this.publishedCount = data.filter(q => q.status === 'PUBLISHED').length;
        this.draftCount     = data.filter(q => q.status === 'DRAFT').length;
        this.filterQuizzes();
      },
      error: () => Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load quizzes.', confirmButtonColor: '#e74c3c' })
    });
  }

  filterQuizzes(): void {
    this.filteredQuizzes = this.quizzes.filter(q => {
      const matchStatus = this.activeFilter === 'ALL' || q.status === this.activeFilter;
      const matchLevel  = !this.levelFilter || q.level === this.levelFilter;
      const matchSearch = !this.searchTerm || q.title?.toLowerCase().includes(this.searchTerm.toLowerCase());
      return matchStatus && matchLevel && matchSearch;
    });
    this.totalAttempts = this.filteredQuizzes.reduce((sum, q) => sum + (q.attemptsCount || 0), 0);
  }

  publishQuiz(id: number): void {
    Swal.fire({
      icon: 'question',
      title: 'Publish this quiz?',
      text: 'Students will be able to see it.',
      showCancelButton: true,
      confirmButtonText: 'Yes, publish',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#2db4a0',
      cancelButtonColor: '#aaa'
    }).then(result => {
      if (result.isConfirmed) {
        this.quizService.publish(id).subscribe({
          next: () => {
            Swal.fire({ icon: 'success', title: 'Published!', text: 'Quiz is now visible to students.', confirmButtonColor: '#2db4a0' });
            this.loadQuizzes();
          },
          error: () => Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to publish quiz.', confirmButtonColor: '#e74c3c' })
        });
      }
    });
  }

  archiveQuiz(id: number): void {
    Swal.fire({
      icon: 'warning',
      title: 'Archive this quiz?',
      text: 'Students will no longer see it.',
      showCancelButton: true,
      confirmButtonText: 'Yes, archive',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#f39c12',
      cancelButtonColor: '#aaa'
    }).then(result => {
      if (result.isConfirmed) {
        this.quizService.archive(id).subscribe({
          next: () => {
            Swal.fire({ icon: 'success', title: 'Archived!', text: 'Quiz has been archived.', confirmButtonColor: '#2db4a0' });
            this.loadQuizzes();
          },
          error: () => Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to archive quiz.', confirmButtonColor: '#e74c3c' })
        });
      }
    });
  }

  setDraft(id: number): void {
    Swal.fire({
      icon: 'question',
      title: 'Set back to Draft?',
      text: 'This quiz will be hidden from students.',
      showCancelButton: true,
      confirmButtonText: 'Yes, set draft',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#3498db',
      cancelButtonColor: '#aaa'
    }).then(result => {
      if (result.isConfirmed) {
        this.quizService.setDraft(id).subscribe({
          next: () => {
            Swal.fire({ icon: 'success', title: 'Updated!', text: 'Quiz is now in Draft.', confirmButtonColor: '#2db4a0' });
            this.loadQuizzes();
          },
          error: () => Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to update quiz.', confirmButtonColor: '#e74c3c' })
        });
      }
    });
  }

  deleteQuiz(id: number): void {
    Swal.fire({
      icon: 'warning',
      title: 'Delete this quiz?',
      text: 'This action cannot be undone!',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#e74c3c',
      cancelButtonColor: '#aaa'
    }).then(result => {
      if (result.isConfirmed) {
        this.quizService.delete(id).subscribe({
          next: () => {
            Swal.fire({ icon: 'success', title: 'Deleted!', text: 'Quiz has been deleted.', confirmButtonColor: '#2db4a0' });
            this.loadQuizzes();
          },
          error: () => Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to delete quiz.', confirmButtonColor: '#e74c3c' })
        });
      }
    });
  }

  getLevelIcon(level: string): string {
    const map: any = { 'A1': '🌱', 'A2': '🌿', 'B1': '📗', 'B2': '📘', 'C1': '🔥', 'C2': '⚡' };
    return map[level] || '📋';
  }

  getStatusIcon(status: string): string {
    const map: any = { 'DRAFT': '📝', 'PUBLISHED': '✅', 'ARCHIVED': '🗄️' };
    return map[status] || '';
  }

  getScoreClass(score: number): string {
    if (!score) return '';
    if (score >= 80) return 'score-high';
    if (score >= 60) return 'score-mid';
    return 'score-low';
  }
}