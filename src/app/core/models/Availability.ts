export interface Availability {
  id?: number;
  tutorId: number;
  dayOfWeek: string;        // MONDAY | TUESDAY | ...
  startTime: string;
  endTime: string;
  available: boolean;
  availabilityType: string; // RECURRING | ONE_TIME
  specificDate?: string;
}