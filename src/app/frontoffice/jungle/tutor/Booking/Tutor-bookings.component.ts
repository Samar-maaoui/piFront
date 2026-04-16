// tutor-bookings.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { BookingService } from '../../../../backoffice/pages/bookings-page/services/booking.service';
import { AvailabilityService } from '../../../../backoffice/ReservationSession/Availability/services/availability.service';
import { EmailService } from '../../../../core/services/email.service';
import { PusherBeamsService } from '../../../../core/services/pusher-beams.service';
import { AuthService } from '../../../../core/services/auth.service';
import { UserServiceService } from '../../../../backoffice/services/user-service.service';
import { Booking } from '../../../../core/models/booking';
import { forkJoin } from 'rxjs';

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
  tutorId = 0;
  tutorName = 'Tutor';
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
    private availabilityService: AvailabilityService,
    private emailService: EmailService,
    private pusherBeamsService: PusherBeamsService,
    private authService: AuthService,
    private userService: UserServiceService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    console.log('Utilisateur connecté:', user);
    if (user?.id) {
      this.tutorId = user.id;
      this.tutorName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Tutor';
    }
    console.log('tutorId utilisé:', this.tutorId);
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
    if (!this.tutorId) return;
    this.bookingService.getByTutor(this.tutorId).subscribe(data => {
      if (data.length === 0) {
        this.bookings = [];
        this.pendingCount = 0;
        this.confirmedCount = 0;
        this.filterBookings();
        return;
      }
      const uniqueStudentIds = [...new Set(data.map((b: any) => b.studentId as number))];
      const studentRequests = uniqueStudentIds.map(id => this.userService.getUserById(id));
      forkJoin(studentRequests).subscribe({
        next: (students: any[]) => {
          const studentMap = new Map<number, any>();
          students.forEach(s => { if (s?.id) studentMap.set(s.id, s); });
          this.bookings = data.map((b: any) => ({
            ...b,
            student: studentMap.get(b.studentId) || undefined
          }));
          this.pendingCount   = this.bookings.filter(b => b.status === 'PENDING').length;
          this.confirmedCount = this.bookings.filter(b => b.status === 'CONFIRMED').length;
          this.filterBookings();
        },
        error: () => {
          this.bookings = data;
          this.pendingCount   = data.filter((b: any) => b.status === 'PENDING').length;
          this.confirmedCount = data.filter((b: any) => b.status === 'CONFIRMED').length;
          this.filterBookings();
        }
      });
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
    console.log('confirmBooking appelé, booking:', booking);
    if (!booking.id) return;
    this.isLoading = true;
    this.bookingService.confirm(booking.id).subscribe({
      next: () => {
        console.log('Booking confirmé avec succès, envoi email...');
        this.blockAvailabilitySlot(booking);
        this.loadBookings();
        this.sendPaymentRequestEmail(booking);
        Swal.fire({
          icon: 'success',
          title: 'Réservation acceptée !',
          html: `Un email avec le lien de paiement a été envoyé à l'étudiant.`,
          timer: 3000,
          showConfirmButton: false,
          timerProgressBar: true,
        });
      },
      error: (err) => {
        console.error('Erreur confirmation booking:', err);
        this.isLoading = false;
        Swal.fire({ icon: 'error', title: 'Erreur', text: 'Impossible de confirmer la réservation.' });
      }
    });
  }

  private blockAvailabilitySlot(booking: TutorBooking): void {
    const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const dayOfWeek = DAY_NAMES[new Date(booking.sessionDate + 'T12:00:00').getDay()];
    this.availabilityService.add({
      tutorId:          booking.tutorId,
      availabilityType: 'ONE_TIME',
      specificDate:     booking.sessionDate,
      dayOfWeek,
      startTime:        booking.startTime,
      endTime:          booking.endTime,
      available:        false
    }).subscribe();
  }

  private sendPaymentRequestEmail(booking: TutorBooking): void {
    const studentEmail = 'samarmaaoui215@gmail.com';
    const paymentLink = `${window.location.origin}/student/pay?bookingId=${booking.id}`;
    const emailParams = {
      to_email:     studentEmail,
      student_name: `${booking.student?.firstName || ''} ${booking.student?.lastName || ''}`.trim() || 'Student',
      tutor_name:   this.tutorName,
      subject:      `Réservation acceptée — ${booking.type || 'Tutoring Session'}`,
      date:         booking.sessionDate,
      time:         `${booking.startTime} - ${booking.endTime}`,
      payment_link: paymentLink,
    };
    console.log('Envoi email:', emailParams);
    this.emailService.sendEmail(emailParams).catch(err => console.error('Erreur envoi email:', err));
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
    if (!reason) {
      Swal.fire({ icon: 'warning', title: 'Raison requise', text: 'Veuillez sélectionner ou saisir une raison.', confirmButtonColor: '#2563eb' });
      return;
    }
    if (!this.selectedBooking?.id) return;
    this.bookingService.reject(this.selectedBooking.id, reason).subscribe({
      next: () => { this.closeRejectModal(); this.loadBookings(); },
      error: (err) => Swal.fire({ icon: 'error', title: 'Erreur', text: err.error?.message || 'Impossible de rejeter la réservation.', confirmButtonColor: '#2563eb' })
    });
  }

  cancelBooking(id: number | undefined): void {
    if (!id) return;
    Swal.fire({
      icon: 'warning',
      title: 'Annuler cette réservation ?',
      text: 'Cette action est irréversible.',
      showCancelButton: true,
      confirmButtonText: 'Oui, annuler',
      cancelButtonText: 'Non',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
    }).then(result => {
      if (!result.isConfirmed) return;
      this.bookingService.cancel(id, 'TUTOR', 'Cancelled by tutor').subscribe(() => this.loadBookings());
    });
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
