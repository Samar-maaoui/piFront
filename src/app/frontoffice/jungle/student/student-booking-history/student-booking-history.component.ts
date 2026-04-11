import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BookingService } from '../../../../backoffice/pages/bookings-page/services/booking.service';
import { BookingService as MainBookingService } from '../../../../backoffice/services/booking.service';
import { Booking } from '../../../../core/models/booking';

@Component({
  selector: 'app-student-booking-history',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './student-booking-history.component.html',
  styleUrls: ['./student-booking-history.component.css']
})
export class StudentBookingHistoryComponent implements OnInit {

  history: Booking[] = [];
  filteredHistory: Booking[] = [];
  isLoading = false;

  activeFilter = 'ALL';
  filters = [
    { value: 'ALL',       label: 'All',        icon: '' },
    { value: 'PENDING',   label: 'Pending',    icon: '' },
    { value: 'CONFIRMED', label: 'Confirmed',  icon: '' },
    { value: 'COMPLETED', label: 'Completed',  icon: '' },
    { value: 'CANCELLED', label: 'Cancelled',  icon: '' },
    { value: 'REJECTED',  label: 'Rejected',   icon: '' },
  ];
  searchQuery = '';

  showFeedbackModal = false;
  selectedBooking: any = null;
  feedbackRating = 0;
  hoverRating = 0;
  feedbackComment = '';
  isSubmitting = false;
  feedbackSuccess = false;
  errorMessage = '';

  readonly STUDENT_ID = 1;

  constructor(
    private bookingService: BookingService,
    private mainBookingService: MainBookingService
  ) {}

  ngOnInit(): void {
    this.loadHistory();
  }

  loadHistory(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.bookingService.getByStudent(this.STUDENT_ID).subscribe({
      next: (data: Booking[]) => {
        // Sort newest first
        this.history = data.sort((a, b) =>
          new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime()
        );
        this.applyFilter();
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load booking history. Please try again.';
        this.isLoading = false;
      }
    });
  }

  applyFilter(): void {
    let result = this.history;

    if (this.activeFilter !== 'ALL') {
      result = result.filter(b => b.status === this.activeFilter);
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(b =>
        b.sessionDate?.includes(q) ||
        b.type?.toLowerCase().includes(q) ||
        b.notes?.toLowerCase().includes(q)
      );
    }

    this.filteredHistory = result;
  }

  get completedCount(): number { return this.history.filter(b => b.status === 'COMPLETED').length; }
  get feedbackCount(): number {
    return this.history.filter(b => b.session?.feedback || (b as any).feedback).length;
  }

  getStatusIcon(status: string | undefined): string {
    const map: Record<string, string> = {
      PENDING: '', CONFIRMED: '', COMPLETED: '',
      CANCELLED: '', REJECTED: ''
    };
    return (status ? map[status] : '') || '';
  }

  getStatusLabel(status: string | undefined): string {
    const map: Record<string, string> = {
      PENDING: 'Pending', CONFIRMED: 'Confirmed', COMPLETED: 'Completed',
      CANCELLED: 'Cancelled', REJECTED: 'Rejected'
    };
    return (status ? map[status] : '') || status || '';
  }

  getTypeLabel(type: string): string {
    const map: Record<string, string> = {
      ONE_TO_ONE: 'One-to-One', GROUP: 'Group Session', INFO_SESSION: 'Info Session'
    };
    return map[type] || type || 'N/A';
  }

  openFeedback(booking: any): void {
    this.selectedBooking = booking;
    this.feedbackRating = booking.session?.feedback?.rating || 0;
    this.feedbackComment = booking.session?.feedback?.comment || '';
    this.feedbackSuccess = false;
    this.showFeedbackModal = true;
  }

  closeFeedback(): void {
    this.showFeedbackModal = false;
    this.selectedBooking = null;
    this.feedbackRating = 0;
    this.feedbackComment = '';
  }

  getRatingLabel(rating: number): string {
    const labels = ['', 'Very poor', 'Poor', 'Fair', 'Good', 'Excellent'];
    return labels[rating] || '';
  }

  submitFeedback(): void {
    if (!this.feedbackRating || !this.selectedBooking?.session?.id) return;
    this.isSubmitting = true;

    this.mainBookingService.submitFeedback(
      this.selectedBooking.session.id,
      this.STUDENT_ID,
      this.feedbackRating,
      this.feedbackComment
    ).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.feedbackSuccess = true;
        setTimeout(() => this.closeFeedback(), 1200);
        this.loadHistory();
      },
      error: () => {
        this.isSubmitting = false;
        this.errorMessage = 'Failed to submit review. Please try again.';
        this.closeFeedback();
      }
    });
  }
}
