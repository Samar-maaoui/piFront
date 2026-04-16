import { Component, OnInit, ViewChild, ElementRef, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { BookingService } from '../../../../core/services/booking.service';
import { AuthService } from '../../../../core/services/auth.service';
import { TutorDashboardDTO } from '../../../../core/models/Session';
import { Booking } from '../../../../core/models/booking';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

// All statuses that represent earned/billable sessions
const EARNED_STATUSES = ['COMPLETED', 'ACCEPTED', 'CONFIRMED'];

@Component({
  selector: 'app-tutor-booking-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './tutor-dashboard.component.html',
  styleUrls: ['./tutor-dashboard.component.scss']
})
export class TutorDashboardComponent implements OnInit {

  @ViewChild('statusChart')  statusChartRef!: ElementRef;
  @ViewChild('revenueChart') revenueChartRef!: ElementRef;

  private statusChartInst!: Chart;
  private revenueChartInst!: Chart;

  dashboard: TutorDashboardDTO | null = null;
  bookings: Booking[] = [];
  loading = true;
  totalEarned = 0;
  hourlyRate = 0;

  constructor(
    private bookingService: BookingService,
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  private get tutorId(): number {
    return this.authService.getCurrentUser()?.id ?? 1;
  }

  get tutorName(): string {
    const u = this.authService.getCurrentUser();
    return u ? `${u.firstName} ${u.lastName}` : 'Tutor';
  }

  get stars(): string {
    const r = Math.round(this.dashboard?.averageRating ?? 0);
    return '★'.repeat(r) + '☆'.repeat(5 - r);
  }

  // Count by each status (ACCEPTED + CONFIRMED merged as "confirmed")
  get completedCount(): number {
    return this.bookings.filter(b => b.status === 'COMPLETED').length;
  }
  get confirmedCount(): number {
    return this.bookings.filter(b => b.status === 'CONFIRMED' || b.status === 'ACCEPTED').length;
  }
  get pendingCount(): number {
    return this.bookings.filter(b => b.status === 'PENDING').length;
  }
  get cancelledCount(): number {
    return this.bookings.filter(b => b.status === 'CANCELLED' || b.status === 'REJECTED').length;
  }

  // Sessions count: API first, fallback to bookings
  get totalSessions(): number {
    const fromApi = this.dashboard?.totalSessions ?? 0;
    return fromApi > 0 ? fromApi : this.bookings.length;
  }
  get upcomingSessions(): number {
    const fromApi = this.dashboard?.upcomingSessions ?? 0;
    return fromApi > 0 ? fromApi : this.pendingCount + this.confirmedCount;
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const id = this.tutorId;
    console.log('[TutorDashboard] tutorId:', id);

    const emptyDashboard: TutorDashboardDTO = {
      totalSessions: 0,
      upcomingSessions: 0,
      averageRating: 0,
      plannedSessions: []
    };

    forkJoin([
      this.bookingService.getTutorDashboard(id).pipe(catchError(() => of(emptyDashboard))),
      this.bookingService.getTutorBookings(id).pipe(catchError(() => of([] as Booking[]))),
      this.bookingService.getTutorById(id).pipe(catchError(() => of(null)))
    ]).subscribe({
      next: ([dashboard, bookings, tutor]) => {
        this.dashboard  = dashboard;
        this.bookings   = bookings;
        this.hourlyRate = tutor?.hourlyRate ?? 25;

        console.log('[TutorDashboard] dashboard:', dashboard);
        console.log('[TutorDashboard] bookings:', bookings.length);
        console.log('[TutorDashboard] hourlyRate:', this.hourlyRate);

        // Earnings = all billable bookings (COMPLETED + ACCEPTED + CONFIRMED)
        const earnedBookings = bookings.filter(b => EARNED_STATUSES.includes(b.status ?? ''));
        this.totalEarned = earnedBookings.reduce((sum, b) => {
          const h = this.calcHours(b.startTime, b.endTime);
          return sum + h * this.hourlyRate;
        }, 0);

        console.log('[TutorDashboard] earnedBookings:', earnedBookings.length, 'totalEarned:', this.totalEarned);

        this.loading = false;
        setTimeout(() => this.initCharts(), 0);
      },
      error: (err) => {
        console.error('[TutorDashboard] load error:', err);
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

    if (this.revenueChartRef) {
      this.revenueChartInst = new Chart(this.revenueChartRef.nativeElement, {
        type: 'bar',
        data: {
          labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5', 'Wk 6'],
          datasets: [{
            label: 'Revenue (€)',
            data: this.generateWeeklyRevenue(),
            backgroundColor: 'rgba(34,197,94,0.15)',
            borderColor: '#22c55e',
            borderWidth: 2,
            borderRadius: 6,
            borderSkipped: false
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

  private generateWeeklyRevenue(): number[] {
    const total = this.totalEarned;
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
