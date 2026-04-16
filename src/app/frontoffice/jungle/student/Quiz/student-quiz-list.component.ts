// student-quiz-list.component.ts
import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../../core/services/auth.service';
import { UnsplashService } from '../../../../core/services/Unsplash.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-student-quiz-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './student-quiz-list.component.html',
  styleUrls: ['./student-quiz-list.component.css']
})
export class StudentQuizListComponent implements OnInit {

  quizzes: any[] = [];
  filteredQuizzes: any[] = [];
  loading = true;
  searchTerm = '';
  levelFilter = '';
  currentUserId: number | null = null;

  levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  private api = 'http://localhost:8080/api';

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
    private unsplashService: UnsplashService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const user = this.authService.getCurrentUser();
      this.currentUserId = user?.id ? Number(user.id) : null;
    }
    this.loadQuizzes();
  }

  loadQuizzes(): void {
    this.loading = true;

    // Charger seulement les quiz PUBLISHED
    this.http.get<any[]>(`${this.api}/quizzes/status/PUBLISHED`).subscribe({
      next: (data) => {
        this.quizzes = data;

        // ✅ Charger image Unsplash pour chaque card
        data.forEach(q => {
          this.unsplashService.getImageForQuestion(q.title || 'education').subscribe({
            next: (img) => { q.cardImage = img; },
            error: () => { q.cardImage = null; }
          });
        });
        if (this.currentUserId) {
          const tasks = data.map(q =>
            this.http.get<any[]>(`${this.api}/quiz-attempts/student/${this.currentUserId}/quiz/${q.id}`)
              .pipe(catchError(() => of([])))
          );

          forkJoin(tasks).subscribe((attemptsPerQuiz: any[][]) => {
            attemptsPerQuiz.forEach((attempts, i) => {
              this.quizzes[i].attemptsCount = attempts.length;
              // Dernière tentative complétée
              const completed = attempts
                .filter(a => a.status === 'COMPLETED')
                .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
              this.quizzes[i].lastAttempt = completed[0] || null;
            });
            this.loading = false;
            this.filterQuizzes();
          });
        } else {
          this.loading = false;
          this.filterQuizzes();
        }
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  filterQuizzes(): void {
    this.filteredQuizzes = this.quizzes.filter(q => {
      const matchLevel = !this.levelFilter || q.level === this.levelFilter;
      const matchSearch = !this.searchTerm ||
        q.title?.toLowerCase().includes(this.searchTerm.toLowerCase());
      return matchLevel && matchSearch;
    });
  }

  isMaxAttemptsReached(q: any): boolean {
    if (!q.maxAttempts) return false;
    return (q.attemptsCount || 0) >= q.maxAttempts;
  }

  takeQuiz(quizId: number): void {
    this.router.navigate(['/student/quiz', quizId, 'take']);
  }

  getLevelIcon(level: string): string {
    const map: any = {
      'A1': '', 'A2': '',
      'B1': '', 'B2': '',
      'C1': '', 'C2': ''
    };
    return map[level] || '';
  }

  goToProfile(): void {
    this.router.navigate(['/student/profile']);
  }

  goToHistory(): void {
    this.router.navigate(['/student/results']);
  }
}
