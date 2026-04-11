export type AccountStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type Role = 'STUDENT' | 'TUTOR';

export interface StudentProfile {
  level: string;
  learningGoals: string;
}

export interface TutorProfile {
  bio: string;
  specialization: string;
  experienceYears: number;
  hourlyRate: number;
}

export interface SignupFormData {
  // User data (required for signup)
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: Role;
  accountStatus?: AccountStatus;

  // Optional: student profile data (used when role = STUDENT)
  level?: string;
  learningGoals?: string;

  // Optional: tutor profile data (used when role = TUTOR)
  bio?: string;
  specialization?: string;
  experienceYears?: number;
  hourlyRate?: number;
}

