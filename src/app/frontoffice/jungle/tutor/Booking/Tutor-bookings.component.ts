// tutor-bookings.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingService } from '../../../../backoffice/pages/bookings-page/services/booking.service';
import { EmailService } from '../../../../backoffice/services/email.service';
import { PusherBeamsService } from '../../../../core/services/pusher-beams.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Booking } from '../../../../core/models/booking';

interface TutorBooking extends Booking {
  studentEmail?: string;
  student?: { email?: string; firstName?: string; lastName?: string };
}

@Component({
  selector: 'app-tutor-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tutor-bookings.component.html',
  styleUrls: ['./Tutor-bookings.component.css']
})
export class TutorBookingsComponent implements OnInit {

  bookings: TutorBooking[] = [];
  filteredBookings: TutorBooking[] = [];
  activeTab = 'PENDING';
  isLoading = false;
  tutorId = 1;
  pendingCount   = 0;
  confirmedCount = 0;

  // Reject Modal
  showRejectModal = false;
  selectedBooking: any = null;
  selectedReason  = '';
  customReason    = '';

  rejectReasons = [
    'Not available at this time',
    'Schedule conflict',
    'Session outside working hours',
    'Student request unclear',
  ];

  tabs = [
    { value: 'PENDING',   label: 'Pending',   icon: '⏳' },
    { value: 'CONFIRMED', label: 'Accepted',  icon: '✅' },
    { value: 'COMPLETED', label: 'Completed', icon: '🏁' },
    { value: 'CANCELLED', label: 'Cancelled', icon: '❌' },
    { value: 'ALL',       label: 'All',       icon: '📋' },
  ];

  constructor(
    private bookingService: BookingService,
    private emailService: EmailService,
    private pusherBeamsService: PusherBeamsService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadBookings();
    this.initBeams();
  }

  private initBeams(): void {
    const user = this.authService.getCurrentUser();
    if (user?.id) {
      this.pusherBeamsService.initForTutor(user.id).catch(() => {});
    }
  }

  loadBookings(): void {
    this.bookingService.getByTutor(this.tutorId).subscribe(data => {
      this.bookings = data;
      this.pendingCount   = data.filter((b: any) => b.status === 'PENDING').length;
      this.confirmedCount = data.filter((b: any) => b.status === 'CONFIRMED').length;
      this.filterBookings();
    });
  }

  filterBookings(): void {
    this.filteredBookings = this.activeTab === 'ALL'
      ? this.bookings
      : this.bookings.filter(b => b.status === this.activeTab);
  }

  countByStatus(status: any): number {
    return status === 'ALL'
      ? this.bookings.length
      : this.bookings.filter(b => b.status === status).length;
  }

  confirmBooking(booking: TutorBooking): void {
    if (!booking.id) return;
    this.isLoading = true;
    this.bookingService.confirm(booking.id).subscribe({
      next: () => {
        this.loadBookings();
        this.sendBookingAcceptedEmail(booking);
      },
      error: () => { this.isLoading = false; }
    });
  }

  private sendBookingAcceptedEmail(booking: TutorBooking): void {
    const emailParams = {
      to_email:     'samarmaaoui215@gmail.com',
      student_name: booking.student?.firstName || 'Student',
      tutor_name:   'Tutor',
      subject:      booking.type || 'Tutoring Session',
      date:         booking.sessionDate,
      time:         `${booking.startTime} - ${booking.endTime}`
    };
    this.emailService.sendEmail(emailParams).catch(() => {});
  }

  openRejectModal(booking: any): void {
    this.selectedBooking = booking;
    this.selectedReason  = '';
    this.customReason    = '';
    this.showRejectModal = true;
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.selectedBooking = null;
  }

  confirmReject(): void {
    const reason = this.customReason || this.selectedReason;
    if (!reason) { alert('Please provide a reason'); return; }
    if (!this.selectedBooking?.id) return;
    this.bookingService.reject(this.selectedBooking.id, reason).subscribe({
      next: () => { this.closeRejectModal(); this.loadBookings(); },
      error: (err) => alert(err.error?.message)
    });
  }

  cancelBooking(id: number | undefined): void {
    if (!id) return;
    if (confirm('Cancel this confirmed booking?')) {
      this.bookingService.cancel(id, 'TUTOR', 'Cancelled by tutor').subscribe(() => {
        this.loadBookings();
      });
    }
  }

  getStatusIcon(status: any): string {
    const map: any = {
      'PENDING':   '⏳',
      'CONFIRMED': '✅',
      'COMPLETED': '🏁',
      'CANCELLED': '❌',
      'REJECTED':  '🚫'
    };
    return map[status] || '';
  }

  getInitial(studentId: number): string {
    return 'S' + studentId;
  }

  getTypeLabel(type: any): string {
    return type || 'N/A';
  }

  getStatusLabel(status: any): string {
    const map: Record<string, string> = {
      PENDING:   'Pending',
      CONFIRMED: 'Accepted',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled',
      REJECTED:  'Rejected'
    };
    return map[status] || 'N/A';
  }
}
