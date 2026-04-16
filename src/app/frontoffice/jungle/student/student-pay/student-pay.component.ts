import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BookingService } from '@backoffice/pages/bookings-page/services/booking.service';
import { BookingService as FrontBookingService } from '@core/services/booking.service';
import { PaymentService } from '@core/services/payment.service';
import { AuthService } from '@core/services/auth.service';
import { Booking } from '@core/models/booking';
import { Tutor } from '@core/models/user.model';
import { Stripe } from '@stripe/stripe-js';
import Swal from 'sweetalert2';

const swalBase = Swal.mixin({ confirmButtonColor: '#2563eb', cancelButtonColor: '#6b7280' });

@Component({
  selector: 'app-student-pay',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './student-pay.component.html',
  styleUrls: ['./student-pay.component.css'],
})
export class StudentPayComponent implements OnInit {
  booking: Booking | null = null;
  tutor: Tutor | null = null;
  loading = true;
  amount = 0;

  // Stripe
  cardName = '';
  paymentProcessing = false;
  stripeReady = false;
  showModal = false;
  private stripeInstance: Stripe | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private bookingService: BookingService,
    private frontBookingService: FrontBookingService,
    private paymentService: PaymentService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    const bookingId = +this.route.snapshot.queryParams['bookingId'];
    if (!bookingId) {
      this.loading = false;
      swalBase.fire({ icon: 'error', title: 'Lien invalide', text: 'Ce lien de paiement est incorrect.' });
      return;
    }
    this.loadBooking(bookingId);
  }

  private loadBooking(id: number): void {
    this.bookingService.getById(id).subscribe({
      next: (booking) => {
        if (booking.status === 'CANCELLED' || booking.status === 'REJECTED') {
          this.loading = false;
          swalBase.fire({
            icon: 'warning',
            title: 'This booking has expired',
            text: 'This booking has been cancelled and can no longer be paid.',
            confirmButtonText: 'Go to Home',
            allowOutsideClick: false,
          }).then(() => this.router.navigate(['/']));
          return;
        }
        this.booking = booking;
        this.loadTutor(booking.tutorId);
      },
      error: () => {
        this.loading = false;
        swalBase.fire({ icon: 'error', title: 'Réservation introuvable', text: 'Cette réservation n\'existe pas ou a expiré.' });
      }
    });
  }

  private loadTutor(tutorId: number): void {
    this.frontBookingService.getTutorById(tutorId).subscribe({
      next: (tutor) => {
        this.tutor = tutor;
        if (tutor && this.booking) {
          const duration = this.calcDuration(this.booking.startTime, this.booking.endTime);
          this.amount = (tutor.hourlyRate ?? 0) * duration;
        }
        this.loading = false;
        // Auto-open payment modal
        setTimeout(() => this.openModal(), 300);
      },
      error: () => {
        this.loading = false;
        this.showModal = true;
        setTimeout(() => this.initStripe(), 300);
      }
    });
  }

  openModal(): void {
    this.showModal = true;
    this.stripeReady = false;
    this.cardName = '';
    setTimeout(() => this.initStripe(), 300);
  }

  private async initStripe(): Promise<void> {
    try {
      await this.paymentService.mountCardElements();
      this.stripeReady = true;
    } catch {
      this.showModal = false;
      swalBase.fire({ icon: 'error', title: 'Formulaire de paiement indisponible', text: 'Impossible de charger Stripe. Vérifiez votre connexion.' });
    }
  }

  async pay(): Promise<void> {
    if (!this.cardName.trim()) {
      Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: 'Veuillez saisir le nom sur la carte.', showConfirmButton: false, timer: 3000 });
      return;
    }
    const user = this.authService.getCurrentUser();
    if (!user) {
      swalBase.fire({ icon: 'warning', title: 'Non connecté', text: 'Veuillez vous connecter.' });
      return;
    }

    this.paymentProcessing = true;

    this.paymentService.createPaymentIntent({
      amount: this.amount,
      eventTitle: this.tutor ? `Session avec ${this.tutor.firstName} ${this.tutor.lastName}` : `Booking #${this.booking?.id}`,
      eventId: this.booking?.id ?? 0,
      userEmail: user.email,
    }).subscribe({
      next: async ({ clientSecret, publishableKey }) => {
        this.stripeInstance = await this.paymentService.getStripe(publishableKey);
        if (!this.stripeInstance) {
          this.paymentProcessing = false;
          swalBase.fire({ icon: 'error', title: 'Stripe indisponible' });
          return;
        }

        const result = await this.paymentService.confirmCardPayment(this.stripeInstance, clientSecret, this.cardName);
        if (!result.success) {
          this.paymentProcessing = false;
          swalBase.fire({ icon: 'error', title: 'Paiement refusé', text: result.error || 'Vérifiez vos informations bancaires.', confirmButtonText: 'Réessayer' });
          return;
        }

        // Confirm on backend with bookingId
        this.paymentService.confirmStripePayment(result.paymentIntentId!, {
          participantEmail: user.email,
          participantName: `${user.firstName} ${user.lastName}`,
          amount: this.amount,
          paymentMethod: 'ONLINE_PAYMENT',
          bookingId: this.booking?.id,
        }).subscribe({
          next: () => this.onPaymentSuccess(),
          error: () => this.onPaymentSuccess(), // payment done — treat as success
        });
      },
      error: () => {
        this.paymentProcessing = false;
        swalBase.fire({ icon: 'error', title: 'Erreur de paiement', text: 'Impossible de créer la session de paiement. Réessayez.' });
      }
    });
  }

  private onPaymentSuccess(): void {
    this.paymentProcessing = false;
    this.showModal = false;
    this.paymentService.destroyCardElements();
    swalBase.fire({
      icon: 'success',
      title: 'Paiement confirmé !',
      html: `Votre session est payée et confirmée.<br>À bientôt !`,
      timer: 2500,
      showConfirmButton: false,
      timerProgressBar: true,
    }).then(() => this.router.navigate(['/student/bookings']));
  }

  cancel(): void {
    this.paymentService.destroyCardElements();
    this.router.navigate(['/student/bookings']);
  }

  calcDuration(start: string, end: string): number {
    const normalize = (t: string) => t.length === 8 ? t.substring(0, 5) : t;
    const s = new Date(`1970-01-01T${normalize(start)}:00`);
    const e = new Date(`1970-01-01T${normalize(end)}:00`);
    return (e.getTime() - s.getTime()) / (1000 * 60 * 60);
  }

  formatDate(d: string): string {
    if (!d) return '';
    return new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }
}
