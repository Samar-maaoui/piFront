import { Component, Input, Output, EventEmitter, OnInit, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Booking } from '../models/Booking';

declare var Stripe: any;

@Component({
  selector: 'app-booking-payment',
  templateUrl: './booking-payment.component.html'
})
export class BookingPaymentComponent implements AfterViewInit {

  @Input() booking!: Booking;         // le booking sélectionné
  @Input() tutorName: string = '';    // nom du prof
  @Input() sessionPrice: number = 0;  // prix de la session
  @Output() closed = new EventEmitter<void>();
  @Output() paymentSuccess = new EventEmitter<any>();

  step: 'payment' | 'success' = 'payment';
  paymentMethod: 'CREDIT_CARD' | 'CASH' | 'BANK_TRANSFER' = 'CREDIT_CARD';
  
  cardName = '';
  bankEmail = '';
  promoCode = '';
  promoMessage = '';
  promoLoading = false;
  promoValid = false;
  discountAmount = 0;
  finalAmount = 0;

  paymentLoading = false;
  paymentError = '';

  // Stripe
  private stripe: any;
  private elements: any;
  private cardNumberEl: any;
  private cardExpiryEl: any;
  private cardCvcEl: any;
  cardType = 'unknown';

  private readonly API = 'http://localhost:8085/api/payments';
  private readonly STRIPE_KEY = 'pk_test_VOTRE_CLE_PUBLIQUE';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.finalAmount = this.sessionPrice;
  }

  ngAfterViewInit() {
    this.initStripe();
  }

  initStripe() {
    this.stripe = Stripe(this.STRIPE_KEY);
    this.elements = this.stripe.elements();

    const style = {
      base: { fontSize: '16px', color: '#333', '::placeholder': { color: '#aaa' } }
    };

    this.cardNumberEl = this.elements.create('cardNumber', { style });
    this.cardExpiryEl = this.elements.create('cardExpiry', { style });
    this.cardCvcEl    = this.elements.create('cardCvc',    { style });

    setTimeout(() => {
      this.cardNumberEl.mount('#stripe-card-number');
      this.cardExpiryEl.mount('#stripe-card-expiry');
      this.cardCvcEl.mount('#stripe-card-cvc');

      this.cardNumberEl.on('change', (e: any) => {
        this.cardType = e.brand || 'unknown';
      });
    }, 100);
  }

  applyPromoCode() {
    if (!this.promoCode.trim()) return;
    this.promoLoading = true;
    this.http.get<any>(`${this.API}/promo/${this.promoCode}`).subscribe({
      next: (res) => {
        this.promoValid = true;
        this.discountAmount = Math.round(this.sessionPrice * res.discountPercent / 100);
        this.finalAmount = this.sessionPrice - this.discountAmount;
        this.promoMessage = `✅ Code appliqué : -${res.discountPercent}%`;
        this.promoLoading = false;
      },
      error: () => {
        this.promoValid = false;
        this.discountAmount = 0;
        this.finalAmount = this.sessionPrice;
        this.promoMessage = '❌ Code invalide';
        this.promoLoading = false;
      }
    });
  }

  async confirmPayment() {
    this.paymentLoading = true;
    this.paymentError = '';

    if (this.paymentMethod === 'CASH' || this.paymentMethod === 'BANK_TRANSFER') {
      this.savePayment(null);
      return;
    }

    // Stripe — créer PaymentIntent
    this.http.post<any>(`${this.API}/create-intent`, {
      amount: Math.round(this.finalAmount * 1000), // millimes
      currency: 'tnd',
      bookingId: this.booking.id
    }).subscribe({
      next: async (res) => {
        const result = await this.stripe.confirmCardPayment(res.clientSecret, {
          payment_method: {
            card: this.cardNumberEl,
            billing_details: { name: this.cardName }
          }
        });

        if (result.error) {
          this.paymentError = result.error.message;
          this.paymentLoading = false;
        } else {
          this.savePayment(result.paymentIntent.id);
        }
      },
      error: () => {
        this.paymentError = 'Erreur lors de la création du paiement';
        this.paymentLoading = false;
      }
    });
  }

  savePayment(paymentIntentId: string | null) {
    const body = {
      bookingId: this.booking.id,          // ← TON champ
      eventId: null,                        // null car c'est un booking
      amount: this.finalAmount,
      paymentMethod: this.paymentMethod,
      participantEmail: '',                 // récupère depuis ton auth service
      stripePaymentIntentId: paymentIntentId,
      status: paymentIntentId ? 'PENDING' : 
              (this.paymentMethod === 'CASH' ? 'PENDING' : 'PENDING')
    };

    const endpoint = paymentIntentId
      ? `${this.API}/confirm-stripe/${paymentIntentId}`
      : `${this.API}/create`;

    this.http.post<any>(endpoint, body).subscribe({
      next: (payment) => {
        this.paymentLoading = false;
        this.step = 'success';
        this.paymentSuccess.emit(payment);
      },
      error: () => {
        this.paymentError = 'Erreur lors de la sauvegarde';
        this.paymentLoading = false;
      }
    });
  }

  closeModal() {
    this.closed.emit();
  }
}