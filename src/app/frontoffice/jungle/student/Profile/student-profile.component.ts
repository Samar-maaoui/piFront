// student-profile.component.ts
import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../../core/services/auth.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-student-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './Student profile.component.html',
  styleUrls: ['./Student profile.component.css']
})
export class StudentProfileComponent implements OnInit {

  currentUserId: number | null = null;
  stats:       any   = null;
  badges:      any[] = [];
  progression: any[] = [];
  loading      = true;

  // Graphique progression XP (barres CSS)
  progressionPoints: any[] = [];
  maxXp = 1;

  // XP pour le prochain level
  xpForNextLevel = 500;
  xpProgress     = 0;

  // Badge animé récemment débloqué
  newBadge: any = null;

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
    if (this.currentUserId) this.loadData();
    else this.loading = false;
  }

  loadData(): void {
    forkJoin({
      stats:       this.http.get<any>(`${this.api}/quiz-attempts/student/${this.currentUserId}/stats`)
                     .pipe(catchError(() => of(null))),
      badges:      this.http.get<any[]>(`${this.api}/quiz-attempts/student/${this.currentUserId}/badges`)
                     .pipe(catchError(() => of([]))),
      progression: this.http.get<any[]>(`${this.api}/quiz-attempts/student/${this.currentUserId}/progression`)
                     .pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ stats, badges, progression }) => {
        this.stats  = stats;
        this.badges = badges;

        // Calculer XP progress vers prochain level
        if (stats) {
          const xp = stats.totalXp || 0;
          this.xpForNextLevel = this.getXpForLevel(stats.level + 1);
          const xpForCurrent  = this.getXpForLevel(stats.level);
          this.xpProgress     = Math.min(100,
            Math.round(((xp - xpForCurrent) / (this.xpForNextLevel - xpForCurrent)) * 100)
          );
        }

        // Graphique progression — derniers 10 points
        this.progressionPoints = progression.slice(-10);
        this.maxXp = Math.max(...this.progressionPoints.map(p => p.cumulativeXp), 1);

        // Détecter nouveau badge débloqué
        const unlocked = badges.filter((b: any) => b.unlocked);
        if (unlocked.length > 0) {
          this.newBadge = unlocked[unlocked.length - 1];
          setTimeout(() => this.newBadge = null, 4000);
        }

        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  // XP requis par level (progression exponentielle simple)
  getXpForLevel(level: number): number {
    return level <= 1 ? 0 : (level - 1) * 500;
  }

  getBarHeightPct(cumulativeXp: number): number {
    return Math.max(4, Math.round((cumulativeXp / this.maxXp) * 100));
  }

  getLevelTitle(level: number): string {
    const titles: any = {
      1: '🌱 Beginner',
      2: '📗 Elementary',
      3: '📘 Intermediate',
      4: '🔥 Advanced',
      5: '⚡ Expert',
      6: '💎 Master'
    };
    return titles[level] || `Level ${level}`;
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }

  getPassRate(): number {
    if (!this.stats || !this.stats.completed) return 0;
    return Math.round(((this.stats.passed || 0) / this.stats.completed) * 100);
  }

  goToQuizzes(): void {
    this.router.navigate(['/student/quiz']);
  }

  goToHistory(): void {
    this.router.navigate(['/student/results']);
  }
}