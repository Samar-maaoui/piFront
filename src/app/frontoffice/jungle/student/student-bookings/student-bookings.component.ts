import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BookingService } from '../../../../backoffice/pages/bookings-page/services/booking.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Booking } from '../../../../core/models/booking';

export interface DisplayStatus {
  label: string;
  key: 'cancelled' | 'rejected' | 'missed' | 'done' | 'upcoming' | 'pending' | 'unknown';
  icon: string;
}

@Component({
  selector: 'app-student-bookings',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './student-bookings.component.html',
  styleUrls: ['./student-bookings.component.css']
})
export class StudentBookingsComponent implements OnInit {

  bookings: Booking[] = [];
  filteredBookings: Booking[] = [];
  isLoading = false;

  activeTab = 'ALL';
  tabs = [
    { value: 'ALL',       label: 'All',         icon: '' },
    { value: 'pending',   label: 'Pending',      icon: '' },
    { value: 'upcoming',  label: 'Upcoming',     icon: '' },
    { value: 'missed',    label: 'Missed',       icon: '' },
    { value: 'done',      label: 'Completed',    icon: '' },
    { value: 'cancelled', label: 'Cancelled',    icon: '' },
  ];

  isCancelling = false;
  errorMessage = '';
  studentId: number | null = null;

  constructor(
    private bookingService: BookingService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.studentId = this.authService.getCurrentUser()?.id ?? 1;
    this.loadBookings();
  }

  loadBookings(): void {
    if (!this.studentId) return;
    this.isLoading = true;
    this.errorMessage = '';
    this.bookingService.getByStudent(this.studentId).subscribe({
      next: (data: Booking[]) => {
        this.bookings = data;
        this.filterBookings();
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load bookings. Please try again.';
        this.isLoading = false;
      }
    });
  }

  // ── Feature 2 : computed display status ──────────────
  getDisplayStatus(b: Booking): DisplayStatus {
    const now = new Date();
    const start = new Date(`${b.sessionDate}T${b.startTime}`);
    const end   = new Date(`${b.sessionDate}T${b.endTime}`);

    if (b.status === 'CANCELLED')                          return { label: 'Cancelled',  key: 'cancelled', icon: '' };
    if (b.status === 'REJECTED')                           return { label: 'Rejected',   key: 'rejected',  icon: '' };
    if (b.status === 'PENDING'    && start < now)          return { label: 'Missed',     key: 'missed',    icon: '' };
    if (b.status === 'CONFIRMED'  && end   < now)          return { label: 'Completed',  key: 'done',      icon: '' };
    if (b.status === 'CONFIRMED'  && start >= now)         return { label: 'Upcoming',   key: 'upcoming',  icon: '' };
    if (b.status === 'PENDING'    && start >= now)         return { label: 'Pending',    key: 'pending',   icon: '' };
    if (b.status === 'COMPLETED')                          return { label: 'Completed',  key: 'done',      icon: '' };
    if (b.status === 'MISSED')                             return { label: 'Missed',     key: 'missed',    icon: '' };
    return { label: b.status || '', key: 'unknown', icon: '' };
  }

  filterBookings(): void {
    this.filteredBookings = this.activeTab === 'ALL'
      ? this.bookings
      : this.bookings.filter(b => this.getDisplayStatus(b).key === this.activeTab);
  }

  countByStatus(tabValue: string): number {
    if (tabValue === 'ALL') return this.bookings.length;
    return this.bookings.filter(b => this.getDisplayStatus(b).key === tabValue).length;
  }

  // ── Stats for header ──
  get pendingCount(): number  { return this.countByStatus('pending'); }
  get upcomingCount(): number { return this.countByStatus('upcoming'); }

  cancelBooking(bookingId: number): void {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    this.isCancelling = true;
    this.bookingService.cancel(bookingId, 'STUDENT', 'Cancelled by student').subscribe({
      next: () => { this.isCancelling = false; this.loadBookings(); },
      error: () => { this.errorMessage = 'Failed to cancel booking.'; this.isCancelling = false; }
    });
  }

  canCancel(b: Booking): boolean {
    const key = this.getDisplayStatus(b).key;
    return key === 'pending' || key === 'upcoming';
  }

  getTypeLabel(type: any): string {
    const map: Record<string, string> = {
      ONE_TO_ONE:   'One-to-One',
      GROUP:        'Group Session',
      INFO_SESSION: 'Info Session',
    };
    return map[type] || type || 'N/A';
  }
}
