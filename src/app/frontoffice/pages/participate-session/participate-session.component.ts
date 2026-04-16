import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EventService, EventModel } from '../../../core/services/event.service';
import { SessioneventService } from '../../../core/services/sessionevent.service';
import { ParticipationService } from '../../../core/services/participation.service';
import { Session } from '../../../core/models/sessionevent.model';
import { AuthService } from '../../../core/services/auth.service';

import {
  Participation,
  PaymentMethod,
  PaymentStatus,
  ParticipationStatus,
} from '../../../core/models/participation.model';

@Component({
  selector: 'app-participate-session',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './participate-session.component.html',
  styleUrl: './participate-session.component.css',
})
export class ParticipateSessionComponent implements OnInit {
  event: EventModel | null = null;
  sessions: Session[] = [];
  loading = true;
  error = '';

  // Étapes : 'sessions' | 'payment' | 'success'
  step: 'sessions' | 'payment' | 'success' = 'sessions';

  selectedSession: Session | null = null;
  paymentMethod: PaymentMethod = PaymentMethod.CREDIT_CARD;
  paymentMethods = Object.values(PaymentMethod);
  paymentLoading = false;
  paymentError = '';

  cardNumber = '';
  cardName = '';
  cardExpiry = '';
  cardCvv = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sessionService: SessioneventService,
    private eventService: EventService,
    private participationService: ParticipationService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    const eventId = +this.route.snapshot.params['id'];

    this.eventService.getById(eventId).subscribe({
      next: (data: EventModel) => {
        this.event = data;
      },
      error: (err: any) => {
        this.error = err.message;
      },
    });

    this.sessionService.getSessionsByEvent(eventId).subscribe({
      next: (data: Session[]) => {
        this.sessions = data;
        this.loading = false;
      },
      error: (err: any) => {
        this.error = err.message;
        this.loading = false;
      },
    });
  }

  selectSession(session: Session): void {
    this.selectedSession = session;
  }

  goToPayment(): void {
    if (!this.selectedSession) return;
    this.step = 'payment';
    window.scrollTo(0, 0);
  }

  goBackToSessions(): void {
    this.step = 'sessions';
    window.scrollTo(0, 0);
  }

  confirmPayment(): void {
    if (!this.selectedSession) return;
    this.paymentLoading = true;

    // ✅ Récupérer le user connecté
    const currentUser = this.authService.getCurrentUser();
    const userEmail = currentUser?.email || '';
    // ✅ DEBUG temporaire — à supprimer après
    console.log('Current user:', currentUser);
    console.log('Email envoyé:', currentUser?.email);

    const participation: Participation = {
      sessionId: this.selectedSession.id,
      userId: null, //
      userEmail: userEmail, //
      status: ParticipationStatus.REGISTERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: this.paymentMethod,
      amountPaid: this.event?.price,
      registrationDate: new Date().toISOString().substring(0, 10),
    };

    this.participationService.addParticipation(participation).subscribe({
      next: () => {
        this.paymentLoading = false;
        this.step = 'success';
        window.scrollTo(0, 0);
      },
      error: (err: any) => {
        this.paymentLoading = false;
        this.paymentError = err.message || 'Erreur lors du paiement';
      },
    });
  }

  getSessionTypeLabel(type: string): string {
    switch (type) {
      case 'ONLINE':
        return '🌐 En ligne';
      case 'PRESENTIEL':
        return '📍 Présentiel';
      case 'HYBRID':
        return '🔀 Hybride';
      default:
        return type;
    }
  }

  formatCardNumber(event: any): void {
    let value = event.target.value.replace(/\D/g, '').substring(0, 16);
    this.cardNumber = value.replace(/(.{4})/g, '$1 ').trim();
  }

  backToEvents(): void {
    this.router.navigate(['/events']);
  }
}
