// tutor-quiz-stats.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-tutor-quiz-stats',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  templateUrl: './Tutor quiz stats.component.html',
  styleUrls: ['./Tutor quiz stats.component.css']
})
export class TutorQuizStatsComponent implements OnInit {

  quizId:  number | null = null;
  quiz:    any = null;
  stats:   any = null;
  loading  = true;
  error    = '';

  // Pour le graphique score par jour (barres CSS)
  scoreByDayEntries: { date: string; score: number }[] = [];
  maxDayScore = 100;

  private api = 'http://localhost:8081/api';

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.quizId = +this.route.snapshot.params['id'];
    this.loadData();
  }

  loadData(): void {
    this.http.get<any>(`${this.api}/quizzes/${this.quizId}`).subscribe({
      next: (quiz) => {
        this.quiz = quiz;
        this.http.get<any>(`${this.api}/quiz-attempts/quiz/${this.quizId}/stats`).subscribe({
          next: (stats) => {
            this.stats = stats;
            // Préparer graphique score par jour
            if (stats.scoreByDay) {
              this.scoreByDayEntries = Object.entries(stats.scoreByDay)
                .map(([date, score]) => ({ date, score: Math.round(score as number) }))
                .sort((a, b) => a.date.localeCompare(b.date))
                .slice(-14); // 14 derniers jours
            }
            this.loading = false;
          },
          error: () => { this.error = 'Error loading stats.'; this.loading = false; }
        });
      },
      error: () => { this.error = 'Error loading quiz.'; this.loading = false; }
    });
  }

  getBarHeight(score: number): string {
    return Math.max(4, score) + '%';
  }

  getBarHeightPct(score: number): number {
    const maxScore = Math.max(...this.scoreByDayEntries.map(e => e.score), 1);
    return Math.max(4, Math.round((score / maxScore) * 100));
  }

  getBarColor(score: number): string {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }

  formatDuration(seconds: number): string {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  }

  goBack(): void {
    this.router.navigate(['/tutor/quiz']);
  }
}