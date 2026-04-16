// booking-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BookingService } from './services/booking.service';
import { Booking, getBookingDisplayStatus } from '../../../core/models/booking';
import { AuthService } from '../../../core/services/auth.service';


@Component({
  selector: 'app-booking-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule
  ],
  templateUrl: './booking-list.component.html',
  styleUrls: ['./booking-list.component.css']
})
export class BookingListComponent implements OnInit {

  bookings: Booking[] = [];
  filteredBookings: Booking[] = [];
  selectedStatus = '';
  selectedType = '';
  selectedDate = '';

  stats = { total: 0, pending: 0, confirmed: 0, completed: 0 };

  currentRole: string | null = null;
  currentUserId: number | null = null;

  constructor(private bookingService: BookingService, private auth: AuthService) {
    const user = this.auth.getCurrentUser();
    this.currentRole = user?.role ?? null;
    this.currentUserId = user?.id ?? null;
  }

  ngOnInit(): void {
  this.loadBookings();
  }

  loadBookings(): void {
    if (this.currentRole === 'STUDENT' && this.currentUserId) {
      this.bookingService.getByStudent(this.currentUserId).subscribe(data => {
        this.applyBookings(data);
      });
    } else if (this.currentRole === 'TUTOR' && this.currentUserId) {
      this.bookingService.getByTutor(this.currentUserId).subscribe(data => {
        this.applyBookings(data);
      });
    } else {
      // ADMIN or unknown: load all
      this.bookingService.getAll().subscribe(data => {
        this.applyBookings(data);
      });
    }
  }

  private applyBookings(data: Booking[]) {
    this.bookings = data;
    this.filteredBookings = data;
    this.calculateStats();
  }

  filterBookings(): void {
    this.filteredBookings = this.bookings.filter(b => {
      const matchStatus = this.selectedStatus ? b.status === this.selectedStatus : true;
      const matchType   = this.selectedType   ? b.type === this.selectedType     : true;
      const matchDate   = this.selectedDate   ? b.sessionDate === this.selectedDate : true;
      return matchStatus && matchType && matchDate;
    });
  }

  resetFilters(): void {
    this.selectedStatus = '';
    this.selectedType   = '';
    this.selectedDate   = '';
    this.filteredBookings = this.bookings;
  }

  getBookingDisplayStatus(status?: string): string {
    return getBookingDisplayStatus(status);
  }

  cancelBooking(id?: number): void {
    if (!id) {
      return;
    }
    if (confirm('Are you sure you want to cancel this booking?')) {
      this.bookingService.cancel(id, 'STUDENT', 'Cancelled by student').subscribe(() => {
        this.loadBookings();
      });
    }
  }

  calculateStats(): void {
    this.stats.total     = this.bookings.length;
    this.stats.pending   = this.bookings.filter(b => b.status === 'PENDING').length;
    this.stats.confirmed = this.bookings.filter(b => b.status === 'CONFIRMED').length;
    this.stats.completed = this.bookings.filter(b => b.status === 'COMPLETED').length;
  }

  confirmBooking(id?: number): void {
    if (!id) return;
    this.bookingService.confirm(id).subscribe(() => this.loadBookings());
  }

  rejectBooking(id?: number): void {
    if (!id) return;
    const reason = prompt('Reason for rejection?') || '';
    this.bookingService.reject(id, reason).subscribe(() => this.loadBookings());
  }

  getStatusClass(status: string): string {
    const map: any = {
      'PENDING':   'bg-warning text-dark',
      'CONFIRMED': 'bg-success',
      'ACCEPTED':  'bg-success',
      'COMPLETED': 'bg-info',
      'CANCELLED': 'bg-danger',
      'REJECTED':  'bg-secondary'
    };
    return map[status] || 'bg-secondary';
  }

  getTypeLabel(type: string | undefined): string {
    const map: Record<string, string> = {
      'ONE_TO_ONE': '1-on-1',
      'GROUP': 'Group',
      'INFO_SESSION': 'Info'
    };
    return map[type || ''] || (type || 'Unknown');
  }
}