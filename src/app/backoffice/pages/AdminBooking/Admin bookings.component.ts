import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingService } from './services/booking.service';
import { Booking } from '../../../core/models/booking';

@Component({
  selector: 'app-admin-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-bookings.component.html',
  styleUrls: ['./admin-bookings.component.css']
})
export class AdminBookingsComponent implements OnInit {

  bookings: Booking[] = [];
  filteredBookings: Booking[] = [];
  isLoading = false;

  filter = { status: '', type: '', date: '', search: '' };
  conflicts: any[] = [];
  showConflicts = false;

  statCards = [
    { label: 'Total', icon: '📋', color: '#2D5757', count: 0, key: 'total' },
    { label: 'Pending', icon: '⏳', color: '#F6BD60', count: 0, key: 'pending' },
    { label: 'Confirmed', icon: '✅', color: '#28a745', count: 0, key: 'confirmed' },
    { label: 'Completed', icon: '🏁', color: '#17a2b8', count: 0, key: 'completed' },
    { label: 'Cancelled', icon: '❌', color: '#dc3545', count: 0, key: 'cancelled' },
  ];

  constructor(private bookingService: BookingService) { }

  ngOnInit(): void {
    this.loadBookings();
  }

  loadBookings(): void {
    this.bookingService.getAll().subscribe(data => {
      this.bookings = data;
      this.filteredBookings = data;
      this.updateStats();
    });
  }

  updateStats(): void {
    this.statCards.forEach(s => {
      s.count = s.key === 'total'
        ? this.bookings.length
        : this.bookings.filter(b => b.status === s.key.toUpperCase()).length;
    });
  }

  applyFilter(): void {
    this.filteredBookings = this.bookings.filter(b => {
      const matchStatus = this.filter.status ? b.status === this.filter.status : true;
      const matchType = this.filter.type ? b.type === this.filter.type : true;
      const matchDate = this.filter.date ? b.sessionDate === this.filter.date : true;
      const matchSearch = this.filter.search
        ? String(b.id).includes(this.filter.search) ||
        String(b.studentId).includes(this.filter.search)
        : true;
      return matchStatus && matchType && matchDate && matchSearch;
    });
  }

  resetFilter(): void {
    this.filter = { status: '', type: '', date: '', search: '' };
    this.filteredBookings = this.bookings;
  }

  confirmBooking(id: number): void {
    this.bookingService.confirm(id).subscribe(() => this.loadBookings());
  }

  cancelBooking(id: number): void {
    if (confirm('Cancel this booking?')) {
      this.bookingService.cancel(id, 'ADMIN', 'Cancelled by admin').subscribe(() => this.loadBookings());
    }
  }

  viewHistory(id: number): void {
    // Navigate to history page
    console.log('View history for booking', id);
  }

  exportCSV(): void {
    const headers = ['ID', 'StudentID', 'TutorID', 'Type', 'Date', 'Start', 'End', 'Status'];
    const rows = this.filteredBookings.map(b =>
      [b.id, b.studentId, b.tutorId, b.type, b.sessionDate, b.startTime, b.endTime, b.status].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bookings.csv';
    a.click();
  }

  getStatusClass(status: any): string {
    const map: any = {
      'PENDING': 'bg-warning text-dark',
      'CONFIRMED': 'bg-success',
      'COMPLETED': 'bg-info',
      'CANCELLED': 'bg-danger',
      'REJECTED': 'bg-secondary'
    };
    return map[status] || 'bg-secondary';
  }

  getTypeLabel(type: any): string {
    return type || 'N/A';
  }

  getStatusIcon(status: any): string {
    return '';
  }

  getStatusLabel(status: any): string {
    return status || 'UNKNOWN';
  }

  getInitial(type: string, id: number): string {
    return type;
  }

  isConflict(b: any): boolean {
    return false;
  }

  resolveConflict(pair: any, keepId: number): void {
    this.showConflicts = false;
  }
}
