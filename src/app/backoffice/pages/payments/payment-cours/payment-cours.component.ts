import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-payment-cours',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="text-align:center; padding: 4rem; color: #94a3b8;">
      <div style="font-size: 4rem;">🚧</div>
      <h2 style="color: #1e293b;">Course Payments</h2>
      <p>Coming soon...</p>
    </div>
  `,
})
export class PaymentCoursComponent {}
