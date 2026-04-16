export type EventStatus = 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';

export interface EventModel {
  id?: number;
  title: string;
  description: string;
  category: string;
  location: string;
  format: 'Présentiel' | 'En Ligne' | 'Hybride';
  status: EventStatus;
  price: number;
  maxParticipants: number;
  startDate: string;
  endDate: string;
  mediaFileName?: string;
  latitude?: number;
  longitude?: number;
}
