import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BookingService } from '@core/services/booking.service';
import { Tutor } from '@core/models/user.model';
import { AiRecommendationService, TutorRecommendation, StudentPreferences } from '@core/services/ai-recommendation.service';

@Component({
  selector: 'app-tutor-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tutor-list.component.html',
  styleUrls: ['./tutor-list.component.css']
})
export class TutorListComponent implements OnInit {

  tutors: Tutor[] = [];
  filteredTutors: Tutor[] = [];
  loading = true;
  searchTerm = '';
  sortBy = 'rating';

  // ── AI Recommendation ──
  showAiPanel = false;
  aiLoading = false;
  aiError = '';
  recommendations: TutorRecommendation[] = [];

  preferences: StudentPreferences = {
    topic: '',
    level: 'intermediate',
    maxBudget: 50,
    sessionsPerWeek: 2,
    weakTopics: []
  };
  weakTopicsInput = '';

  constructor(
    private bookingService: BookingService,
    private aiService: AiRecommendationService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  ngOnInit(): void {
    this.loadTutors();
  }

  loadTutors(): void {
    this.bookingService.getTutors().subscribe({
      next: (tutors: Tutor[]) => {
        this.tutors = tutors;
        this.filterTutors();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  filterTutors(): void {
    let filtered = this.tutors;
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        t.specialization?.some(s => s.toLowerCase().includes(term)) ||
        t.firstName.toLowerCase().includes(term) ||
        t.lastName.toLowerCase().includes(term) ||
        t.bio?.toLowerCase().includes(term)
      );
    }
    filtered.sort((a, b) => {
      switch (this.sortBy) {
        case 'rating':      return (b.rating ?? 0) - (a.rating ?? 0);
        case 'price-low':   return (a.hourlyRate ?? 0) - (b.hourlyRate ?? 0);
        case 'price-high':  return (b.hourlyRate ?? 0) - (a.hourlyRate ?? 0);
        case 'experience':  return (b.experienceYears ?? 0) - (a.experienceYears ?? 0);
        default: return 0;
      }
    });
    this.filteredTutors = filtered;
  }

  // ── AI Recommendation ──
  toggleAiPanel(): void {
    this.showAiPanel = !this.showAiPanel;
    if (!this.showAiPanel) {
      this.recommendations = [];
      this.aiError = '';
    }
  }

  getRecommendations(): void {
    if (!this.preferences.topic.trim()) {
      this.aiError = 'Please indicate what you would like to learn.';
      return;
    }
    this.preferences.weakTopics = this.weakTopicsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    this.aiLoading = true;
    this.aiError = '';
    this.recommendations = [];

    if (!isPlatformBrowser(this.platformId)) {
      this.aiError = 'AI recommendations are only available in the browser.';
      this.aiLoading = false;
      return;
    }

    this.aiService.recommendTutors(this.tutors, this.preferences).subscribe({
      next: (recs) => {
        this.recommendations = recs;
        this.aiLoading = false;
      },
      error: (err) => {
        const status = err?.status;
        const msg = err?.error?.error?.message || err?.message || '';
        if (status === 400) {
          this.aiError = `API error: ${msg}`;
        } else if (status === 403) {
          this.aiError = 'API key invalid or quota exceeded.';
        } else if (status === 0) {
          this.aiError = 'Network error — check your internet connection.';
        } else {
          this.aiError = `Error (${status}): ${msg || 'Unknown error'}`;
        }
        this.aiLoading = false;
      }
    });
  }

  isRecommended(tutorId: number): TutorRecommendation | undefined {
    return this.recommendations.find(r => r.tutorId === tutorId);
  }

  getScoreStars(score: number): string {
    const filled = Math.round(score / 2);
    return '★'.repeat(filled) + '☆'.repeat(5 - filled);
  }

  selectTutor(tutor: Tutor): void {
    this.router.navigate(['/student/tutors', tutor.id]);
  }

  bookTutor(tutor: Tutor): void {
    this.router.navigate(['/student/bookings/new'], { queryParams: { tutorId: tutor.id } });
  }
}
