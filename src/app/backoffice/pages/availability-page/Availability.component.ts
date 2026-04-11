// availability.component.ts
import { Component, OnInit, ViewChild, TemplateRef, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { AvailabilityService } from './services/availability.service';
import { Availability } from '../../../core/models/Availability';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-availability',
  templateUrl: './availability.component.html',
  styleUrls: ['./availability.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class AvailabilityComponent implements OnInit {

  availabilities: Availability[] = [];
  isLoading = false;
  editMode = false;
  tutorId = 1; // récupérer depuis auth

  weekDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];

  currentSlot: Availability = this.emptySlot();
  modalRef: NgbModalRef | null = null;

  @ViewChild('slotModal') slotModal!: TemplateRef<any>;

  constructor(
    private availabilityService: AvailabilityService,
    private modalService: NgbModal,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  ngOnInit(): void {
    this.loadAvailabilities();
  }

  loadAvailabilities(): void {
    this.availabilityService.getByTutor(this.tutorId).subscribe(data => {
      this.availabilities = data;
    });
  }

  openModal(): void {
    this.editMode = false;
    this.currentSlot = this.emptySlot();
    this.modalRef = this.modalService.open(this.slotModal);
  }

  editSlot(slot: Availability): void {
    this.editMode = true;
    this.currentSlot = { ...slot };
    this.modalRef = this.modalService.open(this.slotModal);
  }

  saveSlot(): void {
    this.isLoading = true;
    this.currentSlot.tutorId = this.tutorId;

    const action = this.editMode
      ? this.availabilityService.update(this.currentSlot.id!, this.currentSlot)
      : this.availabilityService.add(this.currentSlot);

    action.subscribe({
      next: () => {
        this.isLoading = false;
        this.loadAvailabilities();
        this.modalRef?.dismiss();
      },
      error: () => { this.isLoading = false; }
    });
  }

  toggleSlot(slot: Availability): void {
    this.availabilityService.toggle(slot.id!).subscribe(() => this.loadAvailabilities());
  }

  deleteSlot(id: number): void {
    if (confirm('Delete this availability slot?')) {
      this.availabilityService.delete(id).subscribe(() => this.loadAvailabilities());
    }
  }

  hasSlot(day: string, hour: string): boolean {
    return this.availabilities.some(a =>
      a.dayOfWeek === day &&
      a.available &&
      a.startTime <= hour &&
      a.endTime > hour
    );
  }

  getSlot(day: string, hour: string): Availability {
    return this.availabilities.find(a =>
      a.dayOfWeek === day && a.startTime <= hour && a.endTime > hour
    )!;
  }

  emptySlot(): Availability {
    return {
      tutorId: this.tutorId,
      dayOfWeek: 'MONDAY',
      startTime: '09:00',
      endTime: '10:00',
      available: true,
      availabilityType: 'RECURRING',
      specificDate: ''
    };
  }
}