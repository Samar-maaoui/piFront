import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ParticipationService } from '../../../core/services/participation.service';
import { PaymentService } from '../../../core/services/payment.service';
@Component({
  selector: 'app-event-dashboard-front',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './event-dashboard-front.component.html',
  styleUrl: './event-dashboard-front.component.css',
})
export class EventDashboardFrontComponent implements OnInit {
  currentUser: any = null;
  participations: any[] = [];
  payments: any[] = [];
  loading = true;

  // Stats
  totalPaid = 0;
  upcomingSessions = 0;
  totalEvents = 0;
  pendingPayments = 0;

  // Timeline unifiée
  timeline: any[] = [];

  // Filtre paiements
  paymentFilter: 'ALL' | 'PAID' | 'PENDING' = 'ALL';

  constructor(
    private authService: AuthService,
    private participationService: ParticipationService,
    private paymentService: PaymentService,
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser) return;
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    const email = this.currentUser.email;

    forkJoin({
      participations: this.participationService.getAllParticipations(),
      payments: this.paymentService.getAllPayments(),
    }).subscribe({
      next: ({ participations, payments }) => {
        // ✅ Filtrer par email du user connecté
        this.participations = participations.filter(
          (p: any) => p.userEmail === email,
        );
        this.payments = payments.filter(
          (p: any) => p.participantEmail === email,
        );

        this.computeStats();
        this.buildTimeline();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  computeStats(): void {
    const today = new Date();

    this.totalEvents = this.participations.length;

    this.totalPaid = this.payments
      .filter((p) => p.status === 'PAID')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    this.pendingPayments = this.payments.filter(
      (p) => p.status === 'PENDING',
    ).length;

    // Sessions à venir (registrationDate >= aujourd'hui)
    this.upcomingSessions = this.participations.filter((p) => {
      if (!p.registrationDate) return false;
      return new Date(p.registrationDate) >= today;
    }).length;
  }

  buildTimeline(): void {
    const events = this.participations.map((p) => ({
      type: 'participation',
      date: p.registrationDate,
      title: p.eventTitle || 'Événement',
      subtitle: `Session · ${p.sessionId}`,
      status: p.status,
      paymentStatus: p.paymentStatus,
      amount: p.amountPaid,
      method: p.paymentMethod,
      raw: p,
    }));

    const pays = this.payments.map((p) => ({
      type: 'payment',
      date: p.paymentDate,
      title: `Paiement — ${p.participantName || ''}`,
      subtitle: p.reference || '',
      status: p.status,
      amount: p.amount,
      method: p.paymentMethod,
      raw: p,
    }));

    this.timeline = [...events, ...pays].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }

  get filteredPayments(): any[] {
    if (this.paymentFilter === 'ALL') return this.payments;
    return this.payments.filter((p) => p.status === this.paymentFilter);
  }

  setPaymentFilter(f: 'ALL' | 'PAID' | 'PENDING'): void {
    this.paymentFilter = f;
  }

  getProgressStep(p: any): number {
    if (p.status === 'CANCELLED') return 0;
    if (p.paymentStatus === 'PAID' && p.status === 'REGISTERED') return 2;
    if (p.status === 'REGISTERED') return 1;
    if (p.status === 'ATTENDED') return 3;
    return 1;
  }

  cancelParticipation(id: number): void {
    if (!confirm("Confirmer l'annulation ?")) return;
    this.participationService.deleteParticipation(id).subscribe({
      next: () => this.loadData(),
      error: () => alert("Erreur lors de l'annulation"),
    });
  }

  downloadReceipt(payment: any): void {
    const content = `
REÇU DE PAIEMENT
================
Référence   : ${payment.reference}
Email       : ${payment.participantEmail}
Événement   : Event #${payment.eventId}
Montant     : ${payment.amount} TND
Méthode     : ${payment.paymentMethod}
Statut      : ${payment.status}
Date        : ${new Date(payment.paymentDate).toLocaleDateString('fr-FR')}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recu-${payment.reference}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  getInitials(): string {
    if (!this.currentUser) return '?';
    return `${this.currentUser.firstName?.[0] || ''}${this.currentUser.lastName?.[0] || ''}`.toUpperCase();
  }
}
