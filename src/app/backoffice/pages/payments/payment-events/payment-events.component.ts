import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PaymentService } from '../../../../core/services/payment.service';

@Component({
  selector: 'app-payment-events',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './payment-events.component.html',
  styleUrls: ['./payment-events.component.css'],
})
export class PaymentEventsComponent implements OnInit {
  payments: any[] = [];
  filteredPayments: any[] = [];
  loading = false;
  error: string | null = null;

  // Toast
  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';

  // Recherche & Filtres
  searchTerm = '';
  filterStatus = '';
  filterMethod = '';
  filterDateFrom = '';
  filterDateTo = '';
  sortField = 'paymentDate';
  sortDir: 'asc' | 'desc' = 'desc';

  // Modal statut
  showConfirmModal = false;
  pendingPaymentId: number | null = null;
  pendingStatus = '';

  // Modal suppression
  showDeleteModal = false;
  paymentToDelete: any = null;
  deleteLoading = false;

  // Modal modification
  showEditModal = false;
  paymentToEdit: any = null;
  editLoading = false;
  editForm: any = {
    amount: null,
    status: '',
    paymentMethod: '',
    participantName: '',
    participantEmail: '',
  };

  constructor(
    private paymentService: PaymentService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.paymentService.getAllPayments().subscribe({
      next: (data) => {
        this.payments = data ?? [];
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message || 'Erreur lors du chargement';
        this.loading = false;
      },
    });
  }
  // ── Recherche & Filtres ──────────────────────────────
  applyFilters(): void {
    let result = [...this.payments];

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.participantName?.toLowerCase().includes(term) ||
          p.participantEmail?.toLowerCase().includes(term) ||
          p.reference?.toLowerCase().includes(term) ||
          p.id?.toString().includes(term),
      );
    }

    if (this.filterStatus) {
      result = result.filter((p) => p.status === this.filterStatus);
    }

    if (this.filterMethod) {
      result = result.filter((p) => p.paymentMethod === this.filterMethod);
    }

    if (this.filterDateFrom) {
      const from = new Date(this.filterDateFrom);
      result = result.filter((p) => new Date(p.paymentDate) >= from);
    }

    if (this.filterDateTo) {
      const to = new Date(this.filterDateTo);
      to.setHours(23, 59, 59);
      result = result.filter((p) => new Date(p.paymentDate) <= to);
    }

    result.sort((a, b) => {
      let valA = a[this.sortField] ?? '';
      let valB = b[this.sortField] ?? '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return this.sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    this.filteredPayments = result;
  }

  onSearch(): void {
    this.applyFilters();
  }
  onFilterChange(): void {
    this.applyFilters();
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
    this.filterMethod = '';
    this.filterDateFrom = '';
    this.filterDateTo = '';
    this.sortField = 'paymentDate';
    this.sortDir = 'desc';
    this.applyFilters();
  }

  get activeFilterCount(): number {
    let count = 0;
    if (this.searchTerm) count++;
    if (this.filterStatus) count++;
    if (this.filterMethod) count++;
    if (this.filterDateFrom) count++;
    if (this.filterDateTo) count++;
    return count;
  }

  // ── Helpers ─────────────────────────────────────────────────────
  getPaymentStatusClass(status?: string): string {
    if (!status) return 'pending';
    const s = status.toUpperCase();
    if (s === 'PAID' || s === 'SUCCESS') return 'paid';
    if (s === 'PENDING') return 'pending';
    if (s === 'FAILED') return 'failed';
    if (s === 'REFUNDED') return 'refunded';
    return 'pending';
  }

  getPaymentStatusIcon(status?: string): string {
    if (!status) return '';
    switch (status.toUpperCase()) {
      case 'SUCCESS':
      case 'PAID':
        return '✅';
      case 'PENDING':
        return '⏳';
      case 'FAILED':
        return '❌';
      default:
        return '❓';
    }
  }

  getTotalRevenue(): number {
    return this.payments
      .filter((p) => p.status === 'SUCCESS' || p.status === 'PAID')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  }

  getPaidCount(): number {
    return this.payments.filter(
      (p) => p.status === 'SUCCESS' || p.status === 'PAID',
    ).length;
  }

  getPendingCount(): number {
    return this.payments.filter((p) => p.status === 'PENDING').length;
  }

  // ── Toast ────────────────────────────────────────────────────────
  triggerToast(
    message = 'Opération réussie !',
    type: 'success' | 'error' = 'success',
  ) {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => (this.showToast = false), 3000);
  }

  // ── Modal statut ─────────────────────────────────────────────────
  onStatusChange(id: number, newStatus: string) {
    this.pendingPaymentId = id;
    this.pendingStatus = newStatus;
    this.showConfirmModal = true;
    this.cdr.detectChanges();
  }

  confirmUpdate() {
    if (this.pendingPaymentId && this.pendingStatus) {
      this.paymentService
        .updatePaymentStatus(this.pendingPaymentId, this.pendingStatus)
        .subscribe({
          next: () => {
            const p = this.payments.find(
              (item) => item.id === this.pendingPaymentId,
            );
            if (p) p.status = this.pendingStatus;
            this.triggerToast('Statut mis à jour avec succès !');
            this.closeStatusModal();
          },
          error: () => {
            this.triggerToast('Erreur lors de la mise à jour', 'error');
            this.closeStatusModal();
          },
        });
    }
  }

  cancelUpdate() {
    this.closeStatusModal();
    this.load();
  }

  closeStatusModal() {
    this.showConfirmModal = false;
    this.pendingPaymentId = null;
    this.pendingStatus = '';
  }

  // ── Modal suppression ────────────────────────────────────────────
  openDeleteModal(payment: any) {
    this.paymentToDelete = payment;
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.paymentToDelete = null;
    this.deleteLoading = false;
  }

  confirmDelete() {
    if (!this.paymentToDelete) return;
    this.deleteLoading = true;
    this.paymentService.deletePayment(this.paymentToDelete.id).subscribe({
      next: () => {
        this.payments = this.payments.filter(
          (p) => p.id !== this.paymentToDelete.id,
        );
        this.triggerToast('Paiement supprimé avec succès !');
        this.closeDeleteModal();
      },
      error: () => {
        this.triggerToast('Erreur lors de la suppression', 'error');
        this.closeDeleteModal();
      },
    });
  }

  // ── Modal modification ───────────────────────────────────────────
  openEditModal(payment: any) {
    this.paymentToEdit = payment;
    this.editForm = {
      amount: payment.amount,
      status: payment.status,
      paymentMethod: payment.paymentMethod,
      participantName: payment.participantName,
      participantEmail: payment.participantEmail,
    };
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
    this.paymentToEdit = null;
    this.editLoading = false;
  }

  confirmEdit() {
    if (!this.paymentToEdit) return;
    this.editLoading = true;
    this.paymentService
      .updatePayment(this.paymentToEdit.id, this.editForm)
      .subscribe({
        next: (updated: any) => {
          const index = this.payments.findIndex(
            (p) => p.id === this.paymentToEdit.id,
          );
          if (index !== -1) {
            this.payments[index] = { ...this.payments[index], ...updated };
          }
          this.triggerToast('Paiement modifié avec succès !');
          this.closeEditModal();
        },
        error: () => {
          this.triggerToast('Erreur lors de la modification', 'error');
          this.closeEditModal();
        },
      });
  }
}
