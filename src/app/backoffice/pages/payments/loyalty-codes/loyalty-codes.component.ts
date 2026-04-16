import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentService } from '../../../../core/services/payment.service';

@Component({
  selector: 'app-loyalty-codes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './loyalty-codes.component.html',
  styleUrl: './loyalty-codes.component.css',
})
export class LoyaltyCodesComponent implements OnInit {
  codes: any[] = [];
  filtered: any[] = [];
  loading = true;

  searchTerm = '';
  filterStatus = '';
  sortField = 'expirationDate';
  sortDir: 'asc' | 'desc' = 'asc';

  // Toast
  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';

  constructor(private paymentService: PaymentService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.paymentService.getAllLoyaltyCodes().subscribe({
      next: (data) => {
        this.codes = data;
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toast('Erreur lors du chargement', 'error');
      },
    });
  }

  applyFilters(): void {
    let result = [...this.codes];

    if (this.searchTerm.trim()) {
      const t = this.searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          c.code?.toLowerCase().includes(t) ||
          c.ownerEmail?.toLowerCase().includes(t),
      );
    }

    if (this.filterStatus === 'active') {
      result = result.filter((c) => this.getStatus(c) === 'active');
    } else if (this.filterStatus === 'used') {
      result = result.filter((c) => this.getStatus(c) === 'used');
    } else if (this.filterStatus === 'expired') {
      result = result.filter((c) => this.getStatus(c) === 'expired');
    }

    result.sort((a, b) => {
      let vA = a[this.sortField] ?? '';
      let vB = b[this.sortField] ?? '';
      if (typeof vA === 'string') vA = vA.toLowerCase();
      if (typeof vB === 'string') vB = vB.toLowerCase();
      if (vA < vB) return this.sortDir === 'asc' ? -1 : 1;
      if (vA > vB) return this.sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    this.filtered = result;
  }

  sortBy(field: string): void {
    if (this.sortField === field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDir = 'asc';
    }
    this.applyFilters();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.filterStatus = '';
    this.applyFilters();
  }

  getStatus(c: any): 'active' | 'used' | 'expired' {
    if (c.usesCount >= c.maxUses) return 'used';
    if (c.expirationDate && new Date(c.expirationDate) < new Date()) return 'expired';
    return 'active';
  }

  getStatusLabel(c: any): string {
    const s = this.getStatus(c);
    if (s === 'active') return '✅ Active';
    if (s === 'used') return '💸 Used';
    return '⏰ Expired';
  }

  // ── Stats ────────────────────────────────────────────────────
  get totalActive(): number  { return this.codes.filter(c => this.getStatus(c) === 'active').length; }
  get totalUsed(): number    { return this.codes.filter(c => this.getStatus(c) === 'used').length; }
  get totalExpired(): number { return this.codes.filter(c => this.getStatus(c) === 'expired').length; }

  get uniqueOwners(): number {
    return new Set(this.codes.map(c => c.ownerEmail).filter(Boolean)).size;
  }

  // ── Toast ────────────────────────────────────────────────────
  toast(message: string, type: 'success' | 'error' = 'success'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => (this.showToast = false), 3000);
  }
}
