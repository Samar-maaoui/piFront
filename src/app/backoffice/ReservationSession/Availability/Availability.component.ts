import { Component, Inject, OnInit, PLATFORM_ID, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { AvailabilityService } from './services/availability.service';
import { PermissionService } from '../../../core/services/permission.service';
import { Availability } from '../../../core/models/Availability';

@Component({
  selector: 'app-availability',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './availability.component.html',
  styleUrls: ['./availability.component.css']
})
export class AvailabilityComponent implements OnInit {

  availabilities: Availability[] = [];
  isLoading = false;
  editMode = false;
  tutorId = 1;
  selectedSlot: Availability | null = null; // ✅ ajout

  weekDays = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'];
  timeSlots = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00'];

  currentSlot: Availability = this.emptySlot();
  modalRef: NgbModalRef | null = null;

  @ViewChild('slotModal') slotModal!: TemplateRef<any>;

  constructor(
    private availabilityService: AvailabilityService,
    public perm: PermissionService,
    private modalService: NgbModal,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.loadAvailabilities();
  }

  loadAvailabilities(): void {
    this.availabilityService.getByTutor(this.tutorId).subscribe(data => {
      this.availabilities = data;
    });
  }

  openModal(): void {
    if (!this.perm.canManageAvailability()) {
      alert('You do not have permission to manage availability');
      return;
    }
    this.editMode = false;
    this.currentSlot = this.emptySlot();
    this.openModalSafe();
  }

  editSlot(slot: Availability): void {
    this.editMode = true;
    this.currentSlot = { ...slot };
    this.openModalSafe();
  }

  closeModal(): void {
    this.modalRef?.dismiss();
    this.modalRef = null;
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
        this.closeModal();
      },
      error: () => { this.isLoading = false; }
    });
  }

  // ✅ Ouvre le popup d'actions
  selectSlot(slot: Availability): void {
    this.selectedSlot = slot;
  }

  // ✅ Ferme le popup
  closePopup(): void {
    this.selectedSlot = null;
  }

  toggleSlot(slot: Availability): void {
    this.blurFocusedElement();
    this.availabilityService.toggle(slot.id!).subscribe(() => {
      this.loadAvailabilities();
      this.selectedSlot = null;
    });
  }

  deleteSlot(id: number): void {
    this.blurFocusedElement();
    if (confirm('Delete this availability slot?')) {
      this.availabilityService.delete(id).subscribe(() => {
        this.loadAvailabilities();
        this.selectedSlot = null;
      });
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

  addHour(hour: string): string {
    const [h, m] = hour.split(':').map(Number);
    return `${(h + 1).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
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

  private openModalSafe(): void {
    this.blurFocusedElement();
    this.modalRef = this.modalService.open(this.slotModal, {
      backdrop: 'static',
      keyboard: true,
      ariaLabelledBy: 'availability-modal-title',
      container: 'body'
    });
  }

  private blurFocusedElement(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
  }
  @ViewChild('actionModal') actionModal!: TemplateRef<any>;
actionModalRef: NgbModalRef | null = null;

openActionModal(slot: Availability): void {
  this.selectedSlot = slot;
  this.actionModalRef = this.modalService.open(this.actionModal, {
    container: 'body',
    centered: true,
    size: 'sm'
  });
}

closeActionModal(): void {
  this.actionModalRef?.dismiss();
  this.actionModalRef = null;
  this.selectedSlot = null;
}
}