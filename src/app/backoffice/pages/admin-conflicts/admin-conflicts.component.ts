// admin-conflicts.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  BookingConflictService, 
  BookingConflict 
} from '../../services/booking-conflit.service';

@Component({
  selector: 'app-admin-conflicts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-conflicts.component.html'
})
export class AdminConflictsComponent implements OnInit {

  conflicts: BookingConflict[] = [];
  loading = false;
  selectedDate = '';
  filterTutorId: number | null = null;

  constructor(private conflictService: BookingConflictService) {}

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loading = true;
    this.conflictService.getAll().subscribe({
      next: (data: BookingConflict[]) => { this.conflicts = data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  filterByDate(): void {
    if (!this.selectedDate) return;
    this.conflictService.getByDate(this.selectedDate).subscribe({
      next: (data: BookingConflict[]) => this.conflicts = data
    });
  }

  filterByTutor(): void {
    if (!this.filterTutorId) return;
    this.conflictService.getByTutor(this.filterTutorId).subscribe({
      next: (data: BookingConflict[]) => this.conflicts = data
    });
  }

  filterByTutorAndDate(): void {
    if (!this.filterTutorId || !this.selectedDate) return;
    this.conflictService.getByTutorAndDate(
      this.filterTutorId, this.selectedDate
    ).subscribe({
      next: (data: BookingConflict[]) => this.conflicts = data
    });
  }

  deleteConflict(id: number): void {
    this.conflictService.deleteConflict(id).subscribe({
      next: () => {
        this.conflicts = this.conflicts.filter(c => c.id !== id);
      }
    });
  }

  deleteAllByTutor(tutorId: number): void {
    this.conflictService.deleteAllByTutor(tutorId).subscribe({
      next: () => {
        this.conflicts = this.conflicts
          .filter(c => c.tutorId !== tutorId);
      }
    });
  }

  resetFilters(): void {
    this.selectedDate = '';
    this.filterTutorId = null;
    this.loadAll();
  }

  getConflictBadgeColor(type: string): string {
    switch(type) {
      case 'TIME_OVERLAP':           return 'badge-red';
      case 'OUT_OF_AVAILABILITY':    return 'badge-orange';
      case 'STUDENT_DOUBLE_BOOKING': return 'badge-purple';
      case 'MAX_SESSIONS_REACHED':   return 'badge-blue';
      default:                       return 'badge-gray';
    }
  }
}