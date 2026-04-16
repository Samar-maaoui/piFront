import { Component, OnInit, ViewChild, ElementRef, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { BookingService } from '../../../../core/services/booking.service';
import { AuthService } from '../../../../core/services/auth.service';
import { StudentDashboardDTO } from '../../../../core/models/Session';
import { Booking } from '../../../../core/models/booking';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

// Statuses that count as "active/done" for spending calculation
const PAID_STATUSES = ['COMPLETED', 'ACCEPTED', 'CONFIRMED'];

@Component({
  selector: 'app-student-booking-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.scss']
})
export class StudentDashboardComponent implements OnInit {

  @ViewChild('statusChart') statusChartRef!: ElementRef;
  @ViewChild('hoursChart')  hoursChartRef!: ElementRef;

  private statusChartInst!: Chart;
  private hoursChartInst!: Chart;

  dashboard: StudentDashboardDTO | null = null;
  bookings: Booking[] = [];
  loading = true;
  totalSpent = 0;

  constructor(
    private bookingService: BookingService,
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  // ── Derived from bookings (always accurate) ──────────
  get totalBookings(): number   { return this.bookings.length; }
  get completedCount(): number  { return this.bookings.filter(b => b.status === 'COMPLETED').length; }
  get pendingCount(): number    { return this.bookings.filter(b => b.status === 'PENDING').length; }
  get cancelledCount(): number  { return this.bookings.filter(b => b.status === 'CANCELLED').length; }
  get confirmedCount(): number  {
    return this.bookings.filter(b => b.status === 'CONFIRMED' || b.status === 'ACCEPTED').length;
  }

  // ── From sessions API (with fallback to bookings) ────
  get totalSessions(): number {
    const fromApi = this.dashboard?.totalSessions ?? 0;
    return fromApi > 0 ? fromApi : this.totalBookings;
  }

  get upcomingSessions(): number {
    const fromApi = this.dashboard?.upcomingSessions ?? 0;
    return fromApi > 0 ? fromApi : (this.pendingCount + this.confirmedCount);
  }

  get hoursLearned(): number {
    const fromApi = Math.floor((this.dashboard?.totalMinutesLearned ?? 0) / 60);
    if (fromApi > 0) return fromApi;
    // fallback: estimate from completed bookings duration
    return this.bookings
      .filter(b => b.status === 'COMPLETED')
      .reduce((sum, b) => sum + this.calcHours(b.startTime, b.endTime), 0);
  }

  get studentName(): string {
    const u = this.authService.getCurrentUser();
    return u ? `${u.firstName} ${u.lastName}` : 'Student';
  }

  private get studentId(): number {
    return this.authService.getCurrentUser()?.id ?? 1;
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const id = this.studentId;
    console.log('[StudentDashboard] studentId:', id);

    // Fallback DTO if sessions endpoint fails
    const emptyDashboard: StudentDashboardDTO = {
      totalSessions: 0,
      upcomingSessions: 0,
      totalMinutesLearned: 0,
      nextSessions: [],
      sessionHistory: []
    };

    forkJoin([
      this.bookingService.getStudentDashboard(id).pipe(catchError(() => of(emptyDashboard))),
      this.bookingService.getStudentBookings(id).pipe(catchError(() => of([] as Booking[])))
    ]).subscribe({
      next: ([dashboard, bookings]) => {
        this.dashboard = dashboard;
        this.bookings  = bookings;

        console.log('[StudentDashboard] dashboard:', dashboard);
        console.log('[StudentDashboard] bookings:', bookings.length);

        // Calculate total spent from PAID_STATUSES bookings
        const paidBookings = bookings.filter(b => PAID_STATUSES.includes(b.status ?? ''));
        const tutorIds = [...new Set(paidBookings.map(b => b.tutorId))];

        if (tutorIds.length === 0) {
          this.loading = false;
          setTimeout(() => this.initCharts(), 0);
          return;
        }

        forkJoin(
          tutorIds.map(tid => this.bookingService.getTutorById(tid).pipe(catchError(() => of(null))))
        ).subscribe(tutors => {
          const rateMap: Record<number, number> = {};
          tutors.forEach((t, i) => { rateMap[tutorIds[i]] = t?.hourlyRate ?? 25; });

          this.totalSpent = paidBookings.reduce((sum, b) => {
            const h = this.calcHours(b.startTime, b.endTime);
            return sum + h * (rateMap[b.tutorId] ?? 25);
          }, 0);

          this.loading = false;
          setTimeout(() => this.initCharts(), 0);
        });
      },
      error: (err) => {
        console.error('[StudentDashboard] load error:', err);
        this.loading = false;
      }
    });
  }

  calcHours(start: string, end: string): number {
    if (!start || !end) return 1;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return Math.max(((eh * 60 + em) - (sh * 60 + sm)) / 60, 0) || 1;
  }

  private initCharts(): void {
    if (this.statusChartRef) {
      this.statusChartInst = new Chart(this.statusChartRef.nativeElement, {
        type: 'doughnut',
        data: {
          labels: ['Completed', 'Confirmed/Accepted', 'Pending', 'Cancelled'],
          datasets: [{
            data: [this.completedCount, this.confirmedCount, this.pendingCount, this.cancelledCount],
            backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'],
            borderWidth: 0,
            hoverOffset: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%',
          plugins: {
            legend: { position: 'bottom', labels: { padding: 16, font: { size: 12 }, color: '#6b7280' } }
          }
        }
      });
    }

    if (this.hoursChartRef) {
      this.hoursChartInst = new Chart(this.hoursChartRef.nativeElement, {
        type: 'line',
        data: {
          labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5', 'Wk 6'],
          datasets: [{
            label: 'Hours',
            data: this.generateWeeklyHours(),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59,130,246,0.08)',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#3b82f6',
            pointRadius: 4,
            pointHoverRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { color: '#94a3b8', font: { size: 11 } } },
            x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } } }
          }
        }
      });
    }
  }

  private generateWeeklyHours(): number[] {
    const total = this.hoursLearned;
    let rem = total;
    const arr = Array(6).fill(0);
    for (let i = 5; i >= 1; i--) {
      const v = Math.floor(Math.random() * (rem / i) * 1.5);
      arr[i] = Math.min(v, rem);
      rem -= arr[i];
    }
    arr[0] = rem;
    return arr;
  }
}
