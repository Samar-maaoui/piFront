import {
  Component,
  OnInit,
  ElementRef,
  ViewChild,
  ChangeDetectorRef,
  PLATFORM_ID,
  Inject,
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PaymentService } from '../../../../core/services/payment.service';

@Component({
  selector: 'app-payment-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './payment-dashboard.component.html',
  styleUrls: ['./payment-dashboard.component.css'],
  host: { ngSkipHydration: 'true' },
})
export class PaymentDashboardComponent implements OnInit {
  @ViewChild('donutChart') donutRef!: ElementRef;
  @ViewChild('barChart') barRef!: ElementRef;
  @ViewChild('lineChart') lineRef!: ElementRef;

  payments: any[] = [];
  loading = true;

  totalRevenue = 0;
  paidCount = 0;
  pendingCount = 0;
  failedCount = 0;
  refundedCount = 0;
  successRate = 0;

  private charts: any[] = [];
  private isBrowser: boolean;

  constructor(
    private paymentService: PaymentService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: Object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.paymentService.getAllPayments().subscribe({
      next: (data) => {
        this.payments = data;
        this.computeKPIs();
        this.loading = false;
        this.cdr.detectChanges();
        if (this.isBrowser) {
          setTimeout(() => this.buildCharts(), 150);
        }
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  computeKPIs(): void {
    this.paidCount = this.payments.filter((p) => p.status === 'PAID').length;
    this.pendingCount = this.payments.filter(
      (p) => p.status === 'PENDING',
    ).length;
    this.failedCount = this.payments.filter(
      (p) => p.status === 'FAILED',
    ).length;
    this.refundedCount = this.payments.filter(
      (p) => p.status === 'REFUNDED',
    ).length;
    this.totalRevenue = this.payments
      .filter((p) => p.status === 'PAID')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    this.successRate = this.payments.length
      ? Math.round((this.paidCount / this.payments.length) * 100)
      : 0;
  }

  async buildCharts(): Promise<void> {
    if (!this.isBrowser) return;

    const { Chart, registerables } = await import('chart.js');
    Chart.register(...registerables);

    this.charts.forEach((c) => c.destroy());
    this.charts = [];

    this.buildDonut(Chart);
    this.buildBar(Chart);
    this.buildLine(Chart);
  }

  buildDonut(Chart: any): void {
    if (!this.donutRef?.nativeElement) return;
    const chart = new Chart(this.donutRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['Paid', 'Pending', 'Failed', 'Refunded'],
        datasets: [
          {
            data: [
              this.paidCount,
              this.pendingCount,
              this.failedCount,
              this.refundedCount,
            ],
            backgroundColor: ['#22c55e', '#f59e0b', '#ef4444', '#3b82f6'],
            borderWidth: 0,
            hoverOffset: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { padding: 20, font: { size: 13 } },
          },
        },
        cutout: '70%',
      },
    });
    this.charts.push(chart);
  }

  buildBar(Chart: any): void {
    if (!this.barRef?.nativeElement) return;
    const methods: Record<string, number> = {};
    this.payments
      .filter((p) => p.status === 'PAID')
      .forEach((p) => {
        const m = p.paymentMethod || 'UNKNOWN';
        methods[m] = (methods[m] || 0) + (p.amount || 0);
      });

    const labelMap: Record<string, string> = {
      CREDIT_CARD: '💳 Card',
      BANK_TRANSFER: '🏦 Transfer',
      CASH: '💵 Cash',
      ONLINE_PAYMENT: '🌐 Online',
    };

    const chart = new Chart(this.barRef.nativeElement, {
      type: 'bar',
      data: {
        labels: Object.keys(methods).map((m) => labelMap[m] || m),
        datasets: [
          {
            label: 'Revenus (TND)',
            data: Object.values(methods),
            backgroundColor: ['#6366f1', '#22c55e', '#f59e0b', '#3b82f6'],
            borderRadius: 8,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
          x: { grid: { display: false } },
        },
      },
    });
    this.charts.push(chart);
  }

  buildLine(Chart: any): void {
    if (!this.lineRef?.nativeElement) return;
    const byDay: Record<string, number> = {};
    this.payments.forEach((p) => {
      if (!p.paymentDate) return;
      const day = p.paymentDate.substring(0, 10);
      byDay[day] = (byDay[day] || 0) + (p.amount || 0);
    });
    const sorted = Object.keys(byDay).sort();

    const chart = new Chart(this.lineRef.nativeElement, {
      type: 'line',
      data: {
        labels: sorted,
        datasets: [
          {
            label: 'Revenus (TND)',
            data: sorted.map((d) => byDay[d]),
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99,102,241,0.08)',
            borderWidth: 2.5,
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#6366f1',
            pointRadius: 5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
          x: { grid: { display: false } },
        },
      },
    });
    this.charts.push(chart);
  }
}
