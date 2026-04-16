import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { PaymentService } from '../../../core/services/payment.service';

@Component({
  selector: 'app-loyalty',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './loyalty.component.html',
  styleUrl: './loyalty.component.css',
})
export class LoyaltyComponent implements OnInit {
  account: any = null;
  codes: any[] = [];
  loading = true;
  copiedCode: string | null = null;

  constructor(
    private authService: AuthService,
    private paymentService: PaymentService,
  ) {}

  ngOnInit(): void {
    const email = this.authService.getCurrentUser()?.email;
    if (!email) { this.loading = false; return; }

    this.paymentService.getLoyaltyAccount(email).subscribe({
      next: (acc) => {
        this.account = acc;
        this.loadCodes(email);
      },
      error: () => { this.loading = false; },
    });
  }

  private loadCodes(email: string): void {
    this.paymentService.getLoyaltyCodes(email).subscribe({
      next: (data) => { this.codes = data; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  get tierIcon(): string {
    if (this.account?.tier === 'GOLD') return '🏆';
    if (this.account?.tier === 'SILVER') return '🥈';
    return '🥉';
  }

  get progressPercent(): number {
    if (!this.account) return 0;
    const pts = this.account.totalPoints;
    if (this.account.tier === 'GOLD') return 100;
    if (this.account.tier === 'SILVER') return Math.min(((pts - 3) / 3) * 100, 100);
    return Math.min((pts / 3) * 100, 100);
  }

  get nextTierLabel(): string {
    if (!this.account) return '';
    if (this.account.tier === 'GOLD') return 'Maximum tier reached!';
    if (this.account.tier === 'SILVER') return `${6 - this.account.totalPoints} events until GOLD`;
    return `${3 - this.account.totalPoints} events until SILVER`;
  }

  isExpired(code: any): boolean {
    if (!code.expirationDate) return false;
    return new Date(code.expirationDate) < new Date();
  }

  isUsed(code: any): boolean {
    return code.usesCount >= code.maxUses;
  }

  getStatus(code: any): 'active' | 'used' | 'expired' {
    if (this.isUsed(code)) return 'used';
    if (this.isExpired(code)) return 'expired';
    return 'active';
  }

  copyCode(code: string): void {
    navigator.clipboard.writeText(code).then(() => {
      this.copiedCode = code;
      setTimeout(() => (this.copiedCode = null), 2000);
    });
  }

  get activeCodes(): any[] { return this.codes.filter(c => this.getStatus(c) === 'active'); }
  get usedCodes(): any[]   { return this.codes.filter(c => this.getStatus(c) === 'used'); }
  get expiredCodes(): any[] { return this.codes.filter(c => this.getStatus(c) === 'expired'); }
}
