// src/app/models/participation.ts
export enum ParticipationStatus {
  REGISTERED = 'REGISTERED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'ATTENDED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CREDIT_CARD = 'CREDIT_CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  ONLINE_PAYMENT = 'ONLINE_PAYMENT',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export interface Participation {
  id?: number;
  registrationDate?: string;
  status?: ParticipationStatus;
  paymentStatus?: PaymentStatus;
  amountPaid?: number;
  paymentMethod?: PaymentMethod;
  userId?: number | null;
  userEmail?: string;
  sessionId?: number;
  userName?: string;
  eventTitle?: string;
}
