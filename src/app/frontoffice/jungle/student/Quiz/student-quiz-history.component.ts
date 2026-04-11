import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../../core/services/auth.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-student-quiz-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './student-quiz-history.component.html',
  styleUrls: ['./student-quiz-history.component.css']
})
export class StudentQuizHistoryComponent implements OnInit {

  attempts: any[] = [];
  stats:    any   = null;
  loading         = true;
  currentUserId: number | null = null;

  private api = 'http://localhost:8081/api';

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const user = this.authService.getCurrentUser();
      this.currentUserId = user?.id ? Number(user.id) : null;
    }
    if (this.currentUserId) {
      this.loadData();
    } else {
      this.loading = false;
    }
  }

  loadData(): void {
    forkJoin({
      attempts: this.http.get<any[]>(`${this.api}/quiz-attempts/student/${this.currentUserId}`)
                  .pipe(catchError(() => of([]))),
      stats:    this.http.get<any>(`${this.api}/quiz-attempts/student/${this.currentUserId}/stats`)
                  .pipe(catchError(() => of(null)))
    }).subscribe({
    next: ({ attempts, stats }) => {
  console.log('STATS:', stats);  // ← ajoute ça
  this.stats = stats;

        const quizIds = [...new Set(attempts.map((a: any) => a.quizId))];
        if (quizIds.length === 0) {
          this.attempts = attempts;
          this.loading  = false;
          return;
        }

        // ✅ Retourne un objet placeholder si le quiz est introuvable (supprimé)
        const quizTasks = quizIds.map((id: any) =>
          this.http.get<any>(`${this.api}/quizzes/${id}`)
            .pipe(catchError(() => of({ id, title: `Quiz #${id}` })))
        );

        forkJoin(quizTasks).subscribe(quizzes => {
          const quizMap: any = {};
          quizzes.forEach((q: any) => { if (q) quizMap[q.id] = q.title; });

          this.attempts = attempts
            .map((a: any) => ({ ...a, quizTitle: quizMap[a.quizId] || `Quiz #${a.quizId}` }))
            .sort((a: any, b: any) =>
              new Date(b.completedAt || b.startedAt).getTime() -
              new Date(a.completedAt || a.startedAt).getTime()
            );

          this.loading = false;
        });
      },
      error: () => { this.loading = false; }
    });
  }

  formatDuration(seconds: number): string {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  goBack(): void {
    this.router.navigate(['/student/quiz']);
  }
}