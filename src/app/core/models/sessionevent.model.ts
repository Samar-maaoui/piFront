export enum SessionType {
  ONLINE = 'ONLINE',
  PRESENTIEL = 'PRESENTIEL',
  HYBRID = 'HYBRID',
}

export interface Session {
  id?: number;
  date: string;
  startTime: string;
  endTime: string;
  type: SessionType;
  room?: string;
  meetingLink?: string;
  availableSeats?: number;
  eventId: number;
}
