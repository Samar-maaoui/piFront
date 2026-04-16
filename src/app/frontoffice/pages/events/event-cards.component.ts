import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { EventService, EventModel } from '../../../core/services/event.service';
import { SessioneventService } from '../../../core/services/sessionevent.service';
import { ParticipationService } from '../../../core/services/participation.service';
import { Session } from '../../../core/models/sessionevent.model';
import {
  Participation,
  PaymentMethod,
  PaymentStatus,
  ParticipationStatus,
} from '../../../core/models/participation.model';
import { AuthService } from '../../../core/services/auth.service';
import { PaymentService } from '../../../core/services/payment.service';

@Component({
  selector: 'app-event-cards',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './event-cards.component.html',
  styleUrl: './event-cards.component.css',
})
export class EventCardsComponent implements OnInit {
  events: EventModel[] = [];
  filteredEvents: EventModel[] = [];
  loading = true;
  error = '';
  bankEmail = '';
  promoCode = '';
  promoMessage = '';
  discountAmount = 0;
  finalAmount = 0;
  promoValid = false;
  promoLoading = false;

  // ===== RECHERCHE & FILTRES =====
  searchQuery = '';
  filterType = '';
  filterCategory = '';
  filterDateFrom = '';
  filterDateTo = '';
  categories: string[] = [];
  searchSubject = new Subject<string>();

  private cdr = inject(ChangeDetectorRef);

  // ===== MODAL =====
  showModal = false;
  step: 'sessions' | 'payment' | 'success' = 'sessions';
  selectedEvent: EventModel | null = null;
  sessions: Session[] = [];
  sessionsLoading = false;
  selectedSession: Session | null = null;

  paymentMethod: string = PaymentMethod.CREDIT_CARD;
  paymentLoading = false;
  paymentError = '';

  cardName = '';

  // ✅ Pour la card preview — mis à jour via l'event Stripe 'change'
  cardNumberDisplay = '';
  cardExpiryDisplay = '';
  cardType: 'visa' | 'mastercard' | 'amex' | 'discover' | 'unknown' | '' = '';

  // ✅ Stocker le clientSecret dès goToPayment() — un seul intent
  private pendingClientSecret = '';
  private pendingPublishableKey = '';

  // ── Fidélité ──────────────────────────────────────────────────────────
  loyaltyPoints = 0;
  loyaltyTier: 'BRONZE' | 'SILVER' | 'GOLD' | '' = '';
  loyaltyTotalSpent = 0;
  loyaltyNewCode: string | null = null; // code promo généré au jalon

  constructor(
    private eventService: EventService,
    private sessionService: SessioneventService,
    private participationService: ParticipationService,
    private authService: AuthService,
    private paymentService: PaymentService,
  ) {}

  ngOnInit(): void {
    // Charger la fidélité dès l'ouverture de la page
    const email = this.authService.getCurrentUser()?.email;
    if (email) {
      this.paymentService.getLoyaltyAccount(email).subscribe({
        next: (acc) => {
          if (acc) {
            this.loyaltyPoints = acc.totalPoints;
            this.loyaltyTier = acc.tier;
          }
        },
        error: () => {},
      });
    }

    this.eventService.getAll().subscribe({
      next: (data: EventModel[]) => {
        this.events = data.filter((e: EventModel) => e.status === 'PUBLISHED');
        this.filteredEvents = [...this.events];
        this.categories = [
          ...new Set(this.events.map((e) => e.category).filter(Boolean)),
        ];
        this.loading = false;
      },
      error: (err: any) => {
        this.error = err.message;
        this.loading = false;
      },
    });

    // ✅ À l'intérieur de ngOnInit
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => this.applyFilters());
  }

  onSearchInput(): void {
    this.searchSubject.next(this.searchQuery);
  }

  applyFilters(): void {
    this.filteredEvents = this.events.filter((event) => {
      const query = this.searchQuery.toLowerCase().trim();
      const matchSearch =
        !query ||
        event.title.toLowerCase().includes(query) ||
        event.description?.toLowerCase().includes(query) ||
        event.location?.toLowerCase().includes(query) ||
        event.category?.toLowerCase().includes(query);

      const matchType = !this.filterType || event.format === this.filterType;
      const matchCategory =
        !this.filterCategory || event.category === this.filterCategory;
      const matchDateFrom =
        !this.filterDateFrom ||
        new Date(event.startDate) >= new Date(this.filterDateFrom);
      const matchDateTo =
        !this.filterDateTo ||
        new Date(event.startDate) <= new Date(this.filterDateTo);

      return (
        matchSearch &&
        matchType &&
        matchCategory &&
        matchDateFrom &&
        matchDateTo
      );
    });
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.filterType = '';
    this.filterCategory = '';
    this.filterDateFrom = '';
    this.filterDateTo = '';
    this.filteredEvents = [...this.events];
  }

  get hasActiveFilters(): boolean {
    return !!(
      this.searchQuery ||
      this.filterType ||
      this.filterCategory ||
      this.filterDateFrom ||
      this.filterDateTo
    );
  }

  openSessions(event: EventModel): void {
    this.selectedEvent = event;
    this.selectedSession = null;
    this.step = 'sessions';
    this.showModal = true;
    this.sessionsLoading = true;
    document.body.style.overflow = 'hidden';

    this.sessionService.getSessionsByEvent(event.id!).subscribe({
      next: (data: Session[]) => {
        this.sessions = data;
        this.sessionsLoading = false;
      },
      error: (err: any) => {
        this.error = err.message;
        this.sessionsLoading = false;
      },
    });
  }

  selectSession(session: Session): void {
    this.selectedSession = session;
  }

  applyPromoCode(): void {
    console.log('applyPromoCode called with promoCode:', this.promoCode);
    if (!this.selectedEvent) return;
    if (!this.promoCode.trim()) {
      this.promoMessage = 'Veuillez saisir un code promo.';
      this.promoValid = false;
      return;
    }

    this.promoLoading = true;
    this.paymentService
      .validatePromoCode({
        promoCode: this.promoCode.trim(),
        eventId: this.selectedEvent.id || 0,
        amount: this.selectedEvent.price,
      })
      .subscribe({
        next: (response) => {
          console.log('Promo validation response:', response);
          this.discountAmount = response.discountAmount || 0;
          this.finalAmount = response.finalAmount || this.selectedEvent!.price;
          this.promoMessage = `Code appliqué : -${this.discountAmount} TND`;
          this.promoValid = true;
          this.promoLoading = false;
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          this.promoMessage =
            err.error?.message || err.message || 'Code promo invalide.';
          this.promoValid = false;
          this.discountAmount = 0;
          this.finalAmount = this.selectedEvent!.price;
          this.promoLoading = false;
        },
      });
  }

  /**
   * ✅ On crée le PaymentIntent ICI (une seule fois)
   * et on monte les éléments Stripe après que le DOM est prêt
   */

  goToPayment(): void {
    if (!this.selectedSession) return;
    this.step = 'payment';
    this.paymentError = '';
    this.promoMessage = '';
    this.promoValid = false;
    this.discountAmount = 0;
    this.finalAmount = this.selectedEvent?.price || 0;

    if (this.paymentMethod === PaymentMethod.CREDIT_CARD) {
      // ✅ Monter les éléments Stripe après rendu du DOM
      setTimeout(() => {
        this.paymentService.mountCardElements().then(() => {
          // ✅ Écouter les changements pour mettre à jour la card preview
          this.paymentService.cardNumberElement?.on('change', (event: any) => {
            // Mettre à jour le type de carte pour les icônes SVG
            const brand = event.brand;
            if (brand === 'visa') this.cardType = 'visa';
            else if (brand === 'mastercard') this.cardType = 'mastercard';
            else if (brand === 'amex') this.cardType = 'amex';
            else if (brand === 'discover') this.cardType = 'discover';
            else if (brand && brand !== 'unknown') this.cardType = 'unknown';
            else this.cardType = '';

            // Afficher le numéro masqué dans la card preview
            if (event.complete) {
              this.cardNumberDisplay = '•••• •••• •••• ••••';
            } else {
              this.cardNumberDisplay = '';
            }
          });

          this.paymentService.cardExpiryElement?.on('change', (event: any) => {
            if (event.complete) {
              this.cardExpiryDisplay = '••/••';
            } else {
              this.cardExpiryDisplay = '';
            }
          });
        });
      }, 300);
    }
  }

  goBackToSessions(): void {
    this.step = 'sessions';
    // Détruire les éléments Stripe si on revient en arrière
    this.paymentService.destroyCardElements();
    this.promoMessage = '';
    this.promoValid = false;
    this.discountAmount = 0;
    this.finalAmount = this.selectedEvent?.price || 0;
  }

  async confirmPayment(): Promise<void> {
    console.log(
      'confirmPayment called with promoCode:',
      this.promoCode,
      'finalAmount:',
      this.finalAmount,
    );
    if (!this.selectedSession) return;
    this.paymentLoading = true;
    this.paymentError = '';

    const currentUser = this.authService.getCurrentUser();
    const userEmail = currentUser?.email || '';

    // ════════════════════════════════════════════
    // CAS 1 : CREDIT CARD → flux Stripe complet
    // ════════════════════════════════════════════
    if (this.paymentMethod === PaymentMethod.CREDIT_CARD) {
      // Create PaymentIntent with final amount and promo
      const intentObservable = this.paymentService.createPaymentIntent({
        amount: this.finalAmount || this.selectedEvent!.price,
        eventTitle: this.selectedEvent!.title || '',
        eventId: this.selectedEvent!.id || 0,
        userEmail,
        promoCode: this.promoCode.trim() || undefined,
      });

      intentObservable.subscribe({
        next: (intent) => {
          this.pendingClientSecret = intent.clientSecret;
          this.pendingPublishableKey = intent.publishableKey;

          // Now confirm the payment
          this.confirmCardPayment(intent.publishableKey, intent.clientSecret);
        },
        error: (err: any) => {
          this.paymentError =
            err.error?.message ||
            err.message ||
            'Impossible de créer le paiement Stripe.';
          this.paymentLoading = false;
        },
      });
      return;
    }

    // ════════════════════════════════════════════
    // CAS 2 : CASH / BANK_TRANSFER → logique existante
    // ════════════════════════════════════════════
    const paymentStatus =
      this.paymentMethod === PaymentMethod.CREDIT_CARD
        ? PaymentStatus.PAID
        : PaymentStatus.PENDING;

    const participation: Participation = {
      sessionId: this.selectedSession.id,
      userId: null,
      userEmail: userEmail,
      status: ParticipationStatus.REGISTERED,
      paymentStatus: paymentStatus,
      paymentMethod: this.paymentMethod as PaymentMethod,
      amountPaid: this.finalAmount || this.selectedEvent?.price,
      registrationDate: new Date().toISOString().substring(0, 10),
    };

    this.participationService.addParticipation(participation).subscribe({
      next: () => {
        if (
          this.paymentMethod === PaymentMethod.BANK_TRANSFER &&
          this.bankEmail
        ) {
          this.participationService
            .sendRib(
              this.bankEmail,
              this.selectedEvent?.title || '',
              this.selectedSession?.date || '',
              this.selectedEvent?.price || 0,
            )
            .subscribe();
        }
        this.paymentLoading = false;
        this.step = 'success';
      },
      error: (err: any) => {
        this.paymentLoading = false;
        if (
          err.error?.message?.includes('déjà inscrit') ||
          err.message?.includes('déjà inscrit')
        ) {
          this.paymentError = 'Vous êtes déjà inscrit à cette session.';
        } else {
          this.paymentError =
            err.error?.message || err.message || 'Erreur paiement';
        }
      },
    });
  }

  private async confirmCardPayment(
    publishableKey: string,
    clientSecret: string,
  ): Promise<void> {
    const stripe = await this.paymentService.getStripe(publishableKey);
    if (!stripe) {
      this.paymentError = 'Impossible de charger Stripe.';
      this.paymentLoading = false;
      return;
    }

    // ── Confirmer paiement avec la carte ──
    const result = await this.paymentService.confirmCardPayment(
      stripe,
      clientSecret,
      this.cardName,
    );

    if (!result.success) {
      this.paymentError = result.error || 'Carte refusée par Stripe.';
      this.paymentLoading = false;
      return;
    }

    // ── Sauvegarder en DB ─────────────────
    this.paymentService
      .confirmStripePayment(result.paymentIntentId!, {
        eventId: this.selectedEvent?.id,
        sessionId: this.selectedSession?.id,
        participantEmail: this.authService.getCurrentUser()?.email || '',
        amount: this.finalAmount || this.selectedEvent?.price,
        originalAmount: this.selectedEvent?.price,
        discountAmount: this.discountAmount,
        promoCode: this.promoCode,
        paymentMethod: 'CREDIT_CARD',
        status: 'PAID',
      })
      .subscribe({
        next: () => {
          this.paymentLoading = false;
          this.loadLoyaltyData();
          this.step = 'success';
        },
        error: (err: any) => {
          console.error('Erreur sauvegarde DB:', err);
          this.paymentLoading = false;
          this.loadLoyaltyData();
          this.step = 'success';
        },
      });
  }

  private loadLoyaltyData(): void {
    const email = this.authService.getCurrentUser()?.email;
    if (!email) return;
    // Sauvegarder l'état des jalons avant l'appel
    const was2 = this.loyaltyPoints >= 2;
    const was4 = this.loyaltyPoints >= 4;
    const was6 = this.loyaltyPoints >= 6;
    this.loyaltyNewCode = null;

    this.paymentService.getLoyaltyAccount(email).subscribe({
      next: (account) => {
        if (!account) return;
        this.loyaltyPoints = account.totalPoints;
        this.loyaltyTier = account.tier;
        this.loyaltyTotalSpent = account.totalSpent;
        // Détecter si un jalon vient juste d'être franchi
        if (!was6 && account.milestone700Rewarded) {
          this.loyaltyNewCode = 'FIDEL6';
        } else if (!was4 && account.milestone300Rewarded) {
          this.loyaltyNewCode = 'FIDEL4';
        } else if (!was2 && account.milestone100Rewarded) {
          this.loyaltyNewCode = 'FIDEL2';
        }
      },
      error: () => {
        /* premier paiement : pas encore de compte */
      },
    });
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedEvent = null;
    this.selectedSession = null;
    this.step = 'sessions';
    this.paymentError = '';
    this.cardName = '';
    this.cardNumberDisplay = '';
    this.cardExpiryDisplay = '';
    this.cardType = '';
    this.bankEmail = '';
    this.promoCode = '';
    this.promoMessage = '';
    this.discountAmount = 0;
    this.finalAmount = 0;
    this.promoValid = false;
    this.pendingClientSecret = '';
    this.pendingPublishableKey = '';
    // ✅ Toujours détruire les éléments Stripe à la fermeture
    this.paymentService.destroyCardElements();
    document.body.style.overflow = '';
  }

  getSessionTypeLabel(type: string): string {
    switch (type) {
      case 'ONLINE':
        return '🌐 Online';
      case 'PRESENTIEL':
        return '📍 In-person';
      case 'HYBRID':
        return '🔀 Hybrid';
      default:
        return type;
    }
  }
}
