import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  EventService,
  EventModel,
  EventStatus,
} from '../../../../core/services/event.service';

declare const L: any;

@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './event-form.component.html',
  styleUrls: ['./event-form.component.scss', './event-form.component.css'],
})
export class EventFormComponent implements OnInit, AfterViewInit, OnDestroy {
  form!: FormGroup;
  isEdit = false;
  id!: number;
  loading = false;
  submitError: string = '';
  selectedFile!: File;
  event?: EventModel;

  // ── Leaflet ──────────────────────────────────────────────────────────
  private map: any;
  private marker: any;
  selectedLat: number | null = null;
  selectedLng: number | null = null;
  mapReady = false;

  // ── Geocoding ────────────────────────────────────────────────────────
  searchAddress: string = '';
  geocodingLoading = false;
  geocodingError = '';

  statusOptions: EventStatus[] = ['PUBLISHED', 'CANCELLED', 'COMPLETED'];
  formatOptions: string[] = ['Présentiel', 'En Ligne', 'Hybride'];

  constructor(
    private fb: FormBuilder,
    private service: EventService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  // ── Getters pour le template ─────────────────────────────────────────

  get currentFormat(): string {
    return this.form?.get('format')?.value || '';
  }

  /** Afficher la carte Maps */
  get showMap(): boolean {
    return (
      this.currentFormat === 'Présentiel' || this.currentFormat === 'Hybride'
    );
  }

  /** Afficher le champ lien Meet/Zoom */
  get showMeetLink(): boolean {
    return (
      this.currentFormat === 'En Ligne' || this.currentFormat === 'Hybride'
    );
  }

  get f() {
    return this.form.controls;
  }

  // ── Lifecycle ────────────────────────────────────────────────────────

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      title: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(100),
        ],
      ],
      description: [
        '',
        [
          Validators.required,
          Validators.minLength(10),
          Validators.maxLength(1000),
        ],
      ],
      category: ['', Validators.required],
      location: [''], // requis seulement si Présentiel ou Hybride
      meetLink: [''], // requis seulement si En Ligne ou Hybride
      format: ['', Validators.required],
      status: ['PUBLISHED', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
      maxParticipants: [1, [Validators.required, Validators.min(1)]],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
    });

    // ── Validation dynamique selon format ────────────────────────────
    this.form.get('format')!.valueChanges.subscribe((format: string) => {
      this.updateLocationValidators(format);
      // Ré-initialiser la carte si on passe à un format avec Maps
      if ((format === 'Présentiel' || format === 'Hybride') && !this.map) {
        setTimeout(() => this.initMap(), 300);
      }
    });

    this.id = this.route.snapshot.params['id'];
    if (this.id) {
      this.isEdit = true;
      this.loading = true;

      this.service.getById(this.id).subscribe({
        next: (data: EventModel) => {
          this.event = data;
          if (data.startDate) data.startDate = data.startDate.substring(0, 10);
          if (data.endDate) data.endDate = data.endDate.substring(0, 10);

          this.form.patchValue({
            ...data,
            format: data.format || 'Présentiel',
            status: data.status || 'PUBLISHED',
            meetLink: (data as any).meetLink || '',
          });

          this.updateLocationValidators(data.format || 'Présentiel');

          if (data.latitude && data.longitude) {
            this.selectedLat = data.latitude;
            this.selectedLng = data.longitude;
          }

          this.loading = false;
          setTimeout(() => this.initMap(), 300);
        },
        error: (err) => {
          this.submitError =
            err.message || "Erreur lors du chargement de l'événement";
          this.loading = false;
        },
      });
    }
  }

  ngAfterViewInit(): void {
    if (!this.id) {
      // En création on attend que le format soit choisi avant d'init la carte
      this.form.get('format')!.valueChanges.subscribe((format: string) => {
        if ((format === 'Présentiel' || format === 'Hybride') && !this.map) {
          setTimeout(() => this.initMap(), 300);
        }
      });
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  // ── Validation dynamique ─────────────────────────────────────────────

  private updateLocationValidators(format: string): void {
    const locationCtrl = this.form.get('location')!;
    const meetLinkCtrl = this.form.get('meetLink')!;

    if (format === 'Présentiel') {
      locationCtrl.setValidators([Validators.required]);
      meetLinkCtrl.clearValidators();
      meetLinkCtrl.setValue('');
    } else if (format === 'En Ligne') {
      locationCtrl.clearValidators();
      locationCtrl.setValue('');
      meetLinkCtrl.setValidators([Validators.required]);
      // Détruire la carte si elle existe
      if (this.map) {
        this.map.remove();
        this.map = null;
        this.marker = null;
        this.selectedLat = null;
        this.selectedLng = null;
      }
    } else if (format === 'Hybride') {
      locationCtrl.setValidators([Validators.required]);
      meetLinkCtrl.setValidators([Validators.required]);
    } else {
      locationCtrl.clearValidators();
      meetLinkCtrl.clearValidators();
    }

    locationCtrl.updateValueAndValidity();
    meetLinkCtrl.updateValueAndValidity();
  }

  // ── Leaflet ──────────────────────────────────────────────────────────

  private loadLeaflet(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof L !== 'undefined') {
        resolve();
        return;
      }
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => resolve();
      document.head.appendChild(script);
    });
  }

  private async initMap(): Promise<void> {
    // Ne pas initialiser si le format ne nécessite pas la carte
    if (!this.showMap) return;

    await this.loadLeaflet();

    const mapEl = document.getElementById('event-map');
    if (!mapEl || this.map) return;

    const defaultLat = this.selectedLat ?? 36.8065;
    const defaultLng = this.selectedLng ?? 10.1815;
    const defaultZoom = this.selectedLat ? 14 : 6;

    this.map = L.map('event-map').setView(
      [defaultLat, defaultLng],
      defaultZoom,
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(this.map);

    if (this.selectedLat && this.selectedLng) {
      this.placeMarker(this.selectedLat, this.selectedLng);
    }

    this.map.on('click', (e: any) => {
      this.selectedLat = e.latlng.lat;
      this.selectedLng = e.latlng.lng;
      this.placeMarker(this.selectedLat!, this.selectedLng!);
      this.reverseGeocode(this.selectedLat!, this.selectedLng!);
    });

    this.mapReady = true;
  }

  private placeMarker(lat: number, lng: number): void {
    if (this.marker) {
      this.map.removeLayer(this.marker);
    }
    this.marker = L.marker([lat, lng], {
      icon: L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:
          'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
      }),
    })
      .addTo(this.map)
      .bindPopup(
        `📍 ${this.form.get('location')?.value || 'Position sélectionnée'}`,
      )
      .openPopup();
  }

  searchOnMap(): void {
    if (!this.searchAddress.trim()) return;
    this.geocodingLoading = true;
    this.geocodingError = '';

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.searchAddress)}&limit=1`;

    fetch(url, { headers: { 'Accept-Language': 'fr' } })
      .then((res) => res.json())
      .then((results) => {
        if (results && results.length > 0) {
          const result = results[0];
          const lat = parseFloat(result.lat);
          const lng = parseFloat(result.lon);
          this.selectedLat = lat;
          this.selectedLng = lng;
          this.map.setView([lat, lng], 14);
          this.placeMarker(lat, lng);
          const displayName = result.display_name
            .split(',')
            .slice(0, 3)
            .join(', ');
          this.form.patchValue({ location: displayName });
        } else {
          this.geocodingError =
            'Adresse introuvable, essayez une autre recherche.';
        }
        this.geocodingLoading = false;
      })
      .catch(() => {
        this.geocodingError = 'Erreur de recherche, vérifiez votre connexion.';
        this.geocodingLoading = false;
      });
  }

  private reverseGeocode(lat: number, lng: number): void {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    fetch(url, { headers: { 'Accept-Language': 'fr' } })
      .then((res) => res.json())
      .then((result) => {
        if (result && result.display_name) {
          const displayName = result.display_name
            .split(',')
            .slice(0, 3)
            .join(', ');
          this.form.patchValue({ location: displayName });
          this.searchAddress = displayName;
        }
      })
      .catch(() => {});
  }

  locateMe(): void {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      this.selectedLat = lat;
      this.selectedLng = lng;
      this.map.setView([lat, lng], 14);
      this.placeMarker(lat, lng);
      this.reverseGeocode(lat, lng);
    });
  }

  // ── Submit ───────────────────────────────────────────────────────────

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const formData = new FormData();

    Object.keys(this.form.controls).forEach((key) => {
      let value = this.form.get(key)?.value;
      if (value !== null && value !== undefined && value !== '') {
        if (key === 'startDate' || key === 'endDate') {
          value = new Date(value).toISOString().substring(0, 10);
        }
        formData.append(key, value);
      }
    });

    if (this.selectedLat !== null && this.selectedLng !== null) {
      formData.append('latitude', this.selectedLat.toString());
      formData.append('longitude', this.selectedLng.toString());
    }

    if (this.selectedFile) {
      formData.append('file', this.selectedFile, this.selectedFile.name);
    }

    if (this.isEdit) {
      // En mode édition : retour à la liste
      this.service.update(this.id, formData).subscribe({
        next: () => this.router.navigate(['/admin/events']),
        error: (err) => {
          this.submitError = err.error || 'Erreur lors de la soumission';
          this.loading = false;
        },
      });
    } else {
      // En mode création : redirect vers la page sessions de l'event créé
      this.service.create(formData).subscribe({
        next: (createdEvent: any) => {
          console.log('RAW RESPONSE:', JSON.stringify(createdEvent)); // remove after fix

          let eventId: number | null = null;

          if (createdEvent && typeof createdEvent === 'object') {
            eventId = createdEvent.id ?? createdEvent.data?.id ?? null;
          } else if (typeof createdEvent === 'number') {
            eventId = createdEvent;
          } else if (typeof createdEvent === 'string') {
            try {
              const parsed = JSON.parse(createdEvent);
              eventId = parsed?.id ?? null;
            } catch {
              // maybe the response IS the id as a string
              const num = Number(createdEvent);
              if (!isNaN(num)) eventId = num;
            }
          }

          if (eventId && !isNaN(eventId)) {
            this.router.navigate(['/admin/events', eventId, 'sessions', 'add']);
          } else {
            console.error('eventId not found in response:', createdEvent);
            this.submitError =
              'Événement créé, mais redirection impossible. Vérifiez la console.';
            this.loading = false;
          }
        },
        error: (err) => {
          this.submitError =
            err.error || err.message || 'Erreur lors de la soumission';
          this.loading = false;
        },
      });
    }
  }
}
