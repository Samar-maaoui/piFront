import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { EventService } from '../../../core/services/event.service';
import { SessioneventService } from '../../../core/services/sessionevent.service';
import { ParticipationService } from '../../../core/services/participation.service';
import { EventModel } from '../../../core/models/event.model';
import { Session } from '../../../core/models/sessionevent.model';
import {
  Participation,
  PaymentStatus,
} from '../../../core/models/participation.model';

export interface MonthStat {
  month: string;
  events: number;
  sessions: number;
  participations: number;
  revenue: number;
}

@Component({
  selector: 'app-event-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './event-dashboard.component.html',
  styleUrls: ['./event-dashboard.component.css'],
})
export class EventDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  loading = true;
  error: string | null = null;

  events: EventModel[] = [];
  sessions: Session[] = [];
  participations: Participation[] = [];

  kpis: {
    label: string;
    value: number;
    suffix: string;
    icon: string;
    sub: string;
    color: string;
  }[] = [];
  monthStats: MonthStat[] = [];
  categoryStats: {
    name: string;
    count: number;
    percent: number;
    color: string;
  }[] = [];
  formatStats: { label: string; count: number; percent: number }[] = [];
  statusStats: { label: string; count: number; color: string }[] = [];
  paymentMethodStats: {
    label: string;
    count: number;
    percent: number;
    color: string;
  }[] = [];
  topEvents: {
    event: EventModel;
    sessionCount: number;
    participantCount: number;
    revenue: number;
    fillRate: number;
  }[] = [];
  upcomingSessions: Session[] = [];
  recentParticipations: Participation[] = [];
  alertSessions: { session: Session; fillPercent: number }[] = [];

  animatedValues: { [key: string]: number } = {};
  currentYear = new Date().getFullYear();

  private readonly MONTHS = [
    'Jan',
    'Fév',
    'Mar',
    'Avr',
    'Mai',
    'Jun',
    'Jul',
    'Aoû',
    'Sep',
    'Oct',
    'Nov',
    'Déc',
  ];
  private readonly CAT_COLORS = [
    '#00D4AA',
    '#7C6FFF',
    '#FF6B6B',
    '#FFB547',
    '#06D6A0',
    '#FF9FF3',
    '#48CAE4',
  ];

  constructor(
    private eventService: EventService,
    private sessionService: SessioneventService,
    private participationService: ParticipationService,
  ) {}

  ngOnInit(): void {
    forkJoin({
      events: this.eventService.getAll(),
      sessions: this.sessionService.getAllSessions(),
      participations: this.participationService.getAllParticipations(),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ events, sessions, participations }) => {
          this.events = events;
          this.sessions = sessions;
          this.participations = participations;
          this.compute();
          this.loading = false;
          setTimeout(() => this.animateKpis(), 150);
        },
        error: (err) => {
          this.error = err.message || 'Erreur';
          this.loading = false;
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private compute(): void {
    const paid = this.participations.filter(
      (p) => p.paymentStatus === PaymentStatus.PAID,
    );
    const totalRevenue = paid.reduce((s, p) => s + (p.amountPaid || 0), 0);
    const pending = this.participations.filter(
      (p) => p.paymentStatus === ('PENDING' as any),
    ).length;
    const upcoming = this.sessions.filter(
      (s) => new Date(s.date) >= new Date(),
    ).length;

    this.kpis = [
      {
        label: 'Événements',
        value: this.events.length,
        suffix: '',
        icon: '🎯',
        sub: `${this.events.filter((e) => e.status === 'PUBLISHED').length} publiés`,
        color: '#00D4AA',
      },
      {
        label: 'Sessions',
        value: this.sessions.length,
        suffix: '',
        icon: '📅',
        sub: `${upcoming} à venir`,
        color: '#7C6FFF',
      },
      {
        label: 'Participants',
        value: this.participations.length,
        suffix: '',
        icon: '👥',
        sub: `${paid.length} confirmés`,
        color: '#FF6B6B',
      },
      {
        label: 'Revenus',
        value: totalRevenue,
        suffix: ' TND',
        icon: '💰',
        sub: `${pending} paiements en attente`,
        color: '#FFB547',
      },
    ];

    // Month stats (current year)
    const year = new Date().getFullYear();
    this.monthStats = this.MONTHS.map((month, m) => {
      const evts = this.events.filter((e) => {
        const d = new Date(e.startDate);
        return d.getFullYear() === year && d.getMonth() === m;
      });
      const sess = this.sessions.filter((s) => {
        const d = new Date(s.date);
        return d.getFullYear() === year && d.getMonth() === m;
      });
      const sIds = sess.map((s) => s.id);
      const parts = this.participations.filter(
        (p) =>
          sIds.includes(p.sessionId) ||
          (p.registrationDate &&
            new Date(p.registrationDate).getFullYear() === year &&
            new Date(p.registrationDate).getMonth() === m),
      );
      const rev = parts
        .filter((p) => p.paymentStatus === PaymentStatus.PAID)
        .reduce((s, p) => s + (p.amountPaid || 0), 0);
      return {
        month,
        events: evts.length,
        sessions: sess.length,
        participations: parts.length,
        revenue: rev,
      };
    });

    // Category
    const catMap = new Map<string, number>();
    this.events.forEach((e) =>
      catMap.set(
        e.category || 'Autre',
        (catMap.get(e.category || 'Autre') || 0) + 1,
      ),
    );
    const total = this.events.length || 1;
    let ci = 0;
    this.categoryStats = Array.from(catMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        name,
        count,
        percent: Math.round((count / total) * 100),
        color: this.CAT_COLORS[ci++ % this.CAT_COLORS.length],
      }));

    // Format
    const pres = this.events.filter((e) => e.format === 'Présentiel').length;
    const onl = this.events.filter((e) => e.format === 'En Ligne').length;
    this.formatStats = [
      {
        label: '📍 Présentiel',
        count: pres,
        percent: Math.round((pres / total) * 100),
      },
      {
        label: '🌐 En Ligne',
        count: onl,
        percent: Math.round((onl / total) * 100),
      },
    ];

    // Status
    this.statusStats = [
      {
        label: '✅ Publiés',
        count: this.events.filter((e) => e.status === 'PUBLISHED').length,
        color: '#00D4AA',
      },
      {
        label: '🏁 Terminés',
        count: this.events.filter((e) => e.status === 'COMPLETED').length,
        color: '#7C6FFF',
      },
      {
        label: '❌ Annulés',
        count: this.events.filter((e) => e.status === 'CANCELLED').length,
        color: '#FF6B6B',
      },
    ];

    // Payment methods
    const pmMap = new Map<string, number>();
    this.participations.forEach((p) =>
      pmMap.set(
        p.paymentMethod || 'AUTRE',
        (pmMap.get(p.paymentMethod || 'AUTRE') || 0) + 1,
      ),
    );
    const pt = this.participations.length || 1;
    const pmColors: Record<string, string> = {
      CREDIT_CARD: '#7C6FFF',
      CASH: '#FFB547',
      BANK_TRANSFER: '#06D6A0',
      ONLINE_PAYMENT: '#00D4AA',
    };
    const pmLabels: Record<string, string> = {
      CREDIT_CARD: '💳 Carte bancaire',
      CASH: '💵 Espèces',
      BANK_TRANSFER: '🏦 Virement',
      ONLINE_PAYMENT: '🌐 Paiement online',
    };
    this.paymentMethodStats = Array.from(pmMap.entries()).map(([k, c]) => ({
      label: pmLabels[k] || k,
      count: c,
      percent: Math.round((c / pt) * 100),
      color: pmColors[k] || '#94a3b8',
    }));

    // Top events
    this.topEvents = this.events
      .map((ev) => {
        const evSess = this.sessions.filter((s) => s.eventId === ev.id);
        const sIds = evSess.map((s) => s.id);
        const parts = this.participations.filter((p) =>
          sIds.includes(p.sessionId),
        );
        const rev = parts
          .filter((p) => p.paymentStatus === PaymentStatus.PAID)
          .reduce((s, p) => s + (p.amountPaid || 0), 0);
        const fillRate =
          ev.maxParticipants > 0
            ? Math.min(
                100,
                Math.round((parts.length / ev.maxParticipants) * 100),
              )
            : 0;
        return {
          event: ev,
          sessionCount: evSess.length,
          participantCount: parts.length,
          revenue: rev,
          fillRate,
        };
      })
      .sort((a, b) => b.participantCount - a.participantCount)
      .slice(0, 5);

    // Upcoming
    const now = new Date();
    this.upcomingSessions = this.sessions
      .filter((s) => new Date(s.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 4);

    // Recent participations
    this.recentParticipations = [...this.participations]
      .sort(
        (a, b) =>
          new Date(b.registrationDate || 0).getTime() -
          new Date(a.registrationDate || 0).getTime(),
      )
      .slice(0, 5);

    // Alert sessions (>= 80% full)
    this.alertSessions = this.sessions
      .filter((s) => s.availableSeats && s.availableSeats > 0)
      .map((s) => {
        const count = this.participations.filter(
          (p) => p.sessionId === s.id,
        ).length;
        const fillPercent = Math.round((count / (s.availableSeats || 1)) * 100);
        return { session: s, fillPercent };
      })
      .filter((x) => x.fillPercent >= 75)
      .sort((a, b) => b.fillPercent - a.fillPercent)
      .slice(0, 4);
  }

  private animateKpis(): void {
    this.kpis.forEach((k) => {
      const target = k.value;
      let cur = 0;
      let step = 0;
      const steps = 50;
      const iv = setInterval(() => {
        step++;
        cur = step >= steps ? target : Math.round((target / steps) * step);
        this.animatedValues[k.label] = cur;
        if (step >= steps) clearInterval(iv);
      }, 1200 / steps);
    });
  }

  getAnimated(label: string): number {
    return this.animatedValues[label] ?? 0;
  }
  getEventTitle(id?: number): string {
    return this.events.find((e) => e.id === id)?.title || `Session #${id}`;
  }
  getMaxVal(data: MonthStat[], key: keyof MonthStat): number {
    return Math.max(...data.map((d) => d[key] as number), 1);
  }
  barPct(v: number, max: number): number {
    return max > 0 ? Math.round((v / max) * 100) : 0;
  }
  getDaysUntil(date: string): number {
    return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
  }
  getPaymentBadge(status?: string): string {
    return status === 'PAID'
      ? 'badge-paid'
      : status === 'PENDING'
        ? 'badge-pending'
        : status === 'FAILED'
          ? 'badge-failed'
          : 'badge-refunded';
  }

  getSessionTypeIcon(type: string): string {
    switch (type) {
      case 'ONLINE':
        return '🌐';
      case 'PRESENTIEL':
        return '📍';
      case 'HYBRID':
        return '🔀';
      default:
        return '📅';
    }
  }
}
