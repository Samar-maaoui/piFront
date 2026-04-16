import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import {
  loadStripe,
  Stripe,
  StripeElements,
  StripeCardNumberElement,
  StripeCardExpiryElement,
  StripeCardCvcElement,
} from '@stripe/stripe-js';

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private readonly url = 'http://localhost:8080/api/payments';
  private stripeInstance: Stripe | null = null; //  cache Stripe

  // ✅ Les 3 éléments Stripe séparés (pour garder votre design)
  stripeElements: StripeElements | null = null;
  cardNumberElement: StripeCardNumberElement | null = null;
  cardExpiryElement: StripeCardExpiryElement | null = null;
  cardCvcElement: StripeCardCvcElement | null = null;

  constructor(private http: HttpClient) {}

  // C'est cette méthode qu'il faut appeler pour votre tableau !
  getAllPayments(): Observable<any[]> {
    return this.http.get<any[]>(`${this.url}/all`);
  }
  // payment.service.ts
  updatePaymentStatus(id: number, status: string): Observable<any> {
    return this.http.put(`${this.url}/${id}/status/${status}`, {});
  }
  updatePayment(id: number, payload: any): Observable<any> {
    return this.http.put<any>(`${this.url}/${id}`, payload);
  }

  deletePayment(id: number): Observable<void> {
    return this.http.delete<any>(`${this.url}/${id}`);
  }
  getPaymentsByEmail(email: string): Observable<any[]> {
    return this.http
      .get<any[]>(`${this.url}/all`)
      .pipe(
        map((all: any[]) => all.filter((p) => p.participantEmail === email)),
      );
  }

  /** Étape 1 : demander au backend de créer un PaymentIntent */
  createPaymentIntent(payload: {
    amount: number;
    eventTitle: string;
    eventId: number;
    userEmail: string;
    promoCode?: string;
  }): Observable<{ clientSecret: string; publishableKey: string }> {
    return this.http.post<{ clientSecret: string; publishableKey: string }>(
      `${this.url}/create-intent`,
      payload,
    );
  }

  validatePromoCode(payload: {
    promoCode: string;
    eventId: number;
    amount: number;
  }): Observable<{
    valid: boolean;
    promoCode: string;
    promoType: string;
    promoValue: number;
    discountAmount: number;
    finalAmount: number;
    message: string;
  }> {
    return this.http.post<{
      valid: boolean;
      promoCode: string;
      promoType: string;
      promoValue: number;
      discountAmount: number;
      finalAmount: number;
      message: string;
    }>(`${this.url}/validate-promo`, payload);
  }

  /** Étape 2 : charger Stripe.js (mis en cache après le premier appel) */
  async getStripe(publishableKey: string): Promise<Stripe | null> {
    if (!this.stripeInstance) {
      this.stripeInstance = await loadStripe(publishableKey);
    }
    return this.stripeInstance;
  }
  /**
   * Étape 3 : monter les 3 éléments Stripe dans le DOM
   * en respectant votre design (style injecté dans l'iframe Stripe)
   */
  mountCardElements(): Promise<void> {
    return this.getStripe(
      'pk_test_51TIrptDFtDXObNlbkZqLN0wMMNxC3jUnpeRurWHGBO67HqiCsYXXtbGVUxpWv4eTy36G7MIxRuLlroe7a243AV6k00Hoomykv7',
    ).then((stripe) => {
      if (!stripe) return;

      // Style CSS appliqué À L'INTÉRIEUR de l'iframe Stripe
      const style = {
        base: {
          fontSize: '15px',
          color: '#222',
          fontFamily: 'inherit',
          '::placeholder': { color: '#aaa' },
        },
        invalid: { color: '#e53e3e' },
      };

      this.stripeElements = stripe.elements();

      // ── CardNumber ──────────────────────────────────────
      // Détruire l'ancien si déjà monté (re-ouverture modal)
      if (this.cardNumberElement) {
        this.cardNumberElement.destroy();
        this.cardNumberElement = null;
      }
      if (this.cardExpiryElement) {
        this.cardExpiryElement.destroy();
        this.cardExpiryElement = null;
      }
      if (this.cardCvcElement) {
        this.cardCvcElement.destroy();
        this.cardCvcElement = null;
      }

      this.cardNumberElement = this.stripeElements.create('cardNumber', {
        style,
        showIcon: true, // ✅ affiche l'icône Visa/MC directement dans le champ
      });
      this.cardNumberElement.mount('#stripe-card-number');

      this.cardExpiryElement = this.stripeElements.create('cardExpiry', {
        style,
      });
      this.cardExpiryElement.mount('#stripe-card-expiry');

      this.cardCvcElement = this.stripeElements.create('cardCvc', { style });
      this.cardCvcElement.mount('#stripe-card-cvc');
    });
  }

  /*** Étape 4 : confirmer le paiement avec le CardNumberElement
   * (Stripe relie automatiquement les 3 champs) */
  async confirmCardPayment(
    stripe: Stripe,
    clientSecret: string,
    cardName: string,
  ): Promise<{ success: boolean; paymentIntentId?: string; error?: string }> {
    if (!this.cardNumberElement) {
      return {
        success: false,
        error: "Le formulaire de carte n'est pas initialisé.",
      };
    }

    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: this.cardNumberElement, // ✅ Element Stripe — plus d'IntegrationError
        billing_details: { name: cardName },
      },
    });

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return {
      success: true,
      paymentIntentId: result.paymentIntent?.id,
    };
  }

  confirmStripePayment(
    paymentIntentId: string,
    paymentData: any,
  ): Observable<any> {
    return this.http.post(
      `${this.url}/confirm-stripe?paymentIntentId=${paymentIntentId}`,
      paymentData,
    );
  }

  getLoyaltyCodes(email: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.url}/loyalty/${encodeURIComponent(email)}/codes`);
  }

  getAllLoyaltyCodes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.url}/loyalty/codes/all`);
  }

  getLoyaltyAccount(email: string): Observable<{
    totalPoints: number;
    totalSpent: number;
    tier: 'BRONZE' | 'SILVER' | 'GOLD';
    milestone100Rewarded: boolean;
    milestone300Rewarded: boolean;
    milestone700Rewarded: boolean;
  } | null> {
    return this.http.get<any>(`${this.url}/loyalty/${encodeURIComponent(email)}`);
  }
  /** Nettoyage des éléments quand le modal se ferme */
  destroyCardElements(): void {
    this.cardNumberElement?.destroy();
    this.cardExpiryElement?.destroy();
    this.cardCvcElement?.destroy();
    this.cardNumberElement = null;
    this.cardExpiryElement = null;
    this.cardCvcElement = null;
    this.stripeElements = null;
  }
}
