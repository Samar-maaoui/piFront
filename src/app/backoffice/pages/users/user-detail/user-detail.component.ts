import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UserServiceService } from '../../../services/user-service.service';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './user-detail.component.html',
  styleUrls: ['./user-detail.component.css']
})
export class UserDetailComponent implements OnInit {
  user: any = null;
  loading = true;
  errorMessage = '';

  // Edit state
  editMode = false;
  editForm: any = {};
  saving = false;
  saveSuccess = false;

  // Delete state
  showDeleteModal = false;
  deleting = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserServiceService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.router.navigate(['/admin/users']); return; }
    this.loadUser(id);
  }

  loadUser(id: number): void {
    this.loading = true;
    this.errorMessage = '';
    this.userService.getUserById(id).subscribe({
      next: (data) => { this.user = data; this.loading = false; },
      error: (err) => {
        this.loading = false;
        if (err.status === 404)      this.errorMessage = 'User not found.';
        else if (err.status === 403) this.errorMessage = 'Access denied.';
        else                         this.errorMessage = 'Failed to load user. Please try again.';
      }
    });
  }

  // ── Edit ──────────────────────────────────────────────────
  openEdit(): void {
    this.editForm = {
      firstName:      this.user.firstName,
      lastName:       this.user.lastName,
      email:          this.user.email,
      role:           this.user.role,
      accountStatus:  this.user.accountStatus,
      level:          this.user.level          ?? '',
      learningGoals:  this.user.learningGoals  ?? '',
      bio:            this.user.bio            ?? '',
      specialization: this.user.specialization ?? '',
      experienceYears: this.user.experienceYears ?? '',
      hourlyRate:     this.user.hourlyRate     ?? '',
    };
    this.editMode    = true;
    this.saveSuccess = false;
    this.errorMessage = '';
  }

  cancelEdit(): void {
    this.editMode = false;
    this.errorMessage = '';
  }

  saveEdit(): void {
    this.saving = true;
    this.errorMessage = '';
    this.userService.updateUser(this.user.id, this.editForm).subscribe({
      next: (updated) => {
        this.user        = updated;
        this.saving      = false;
        this.editMode    = false;
        this.saveSuccess = true;
        setTimeout(() => this.saveSuccess = false, 3000);
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err.status === 403
          ? 'Access denied.' : 'Failed to update user. Please try again.';
      }
    });
  }

  // ── Delete ────────────────────────────────────────────────
  confirmDelete(): void { this.showDeleteModal = true; }
  cancelDelete():  void { this.showDeleteModal = false; }

  doDelete(): void {
    this.deleting = true;
    this.userService.deleteUser(this.user.id).subscribe({
      next: () => this.router.navigate(['/admin/users']),
      error: (err) => {
        this.deleting         = false;
        this.showDeleteModal  = false;
        this.errorMessage     = err.status === 403
          ? 'Access denied.' : 'Failed to delete user. Please try again.';
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────
  getInitials(): string {
    if (!this.user) return '?';
    return `${this.user.firstName?.[0] ?? ''}${this.user.lastName?.[0] ?? ''}`.toUpperCase();
  }

  getRoleColor(): string {
    const map: Record<string, string> = { STUDENT: '#15803d', TUTOR: '#1d4ed8', ADMIN: '#6d28d9' };
    return map[this.user?.role] ?? '#64748b';
  }

  getRoleBg(): string {
    const map: Record<string, string> = { STUDENT: '#dcfce7', TUTOR: '#dbeafe', ADMIN: '#ede9fe' };
    return map[this.user?.role] ?? '#f1f5f9';
  }
}

