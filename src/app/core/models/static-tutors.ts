// Static tutors data - English learning platform
export interface StaticTutor {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  bio: string;
  specialization: string[];
  experienceYears: number;
  hourlyRate: number;
  rating: number;
  reviewCount: number;
  profileImage?: string;
  languages: string[];
  availability: {
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    available: boolean;
  }[];
}

export const STATIC_TUTORS: StaticTutor[] = [
  {
    id: 1,
    firstName: "Sarah",
    lastName: "",
    email: "sarah.thompson@jungle.com",
    bio: "Native English speaker and certified CELTA teacher with 8 years of experience. Specialised in IELTS and TOEFL preparation, helping students achieve band scores of 7+.",
    specialization: ["IELTS Preparation", "TOEFL", "Business English", "Conversation"],
    experienceYears: 8,
    hourlyRate: 35,
    rating: 4.9,
    reviewCount: 214,
    languages: ["English", "French"],
    availability: [
      { dayOfWeek: "MONDAY",    startTime: "09:00", endTime: "12:00", available: true },
      { dayOfWeek: "MONDAY",    startTime: "14:00", endTime: "18:00", available: true },
      { dayOfWeek: "TUESDAY",   startTime: "10:00", endTime: "16:00", available: true },
      { dayOfWeek: "WEDNESDAY", startTime: "09:00", endTime: "12:00", available: true },
      { dayOfWeek: "THURSDAY",  startTime: "14:00", endTime: "18:00", available: true },
      { dayOfWeek: "FRIDAY",    startTime: "10:00", endTime: "15:00", available: true }
    ]
  },
  {
    id: 2,
    firstName: "Amine",
    lastName: "",
    email: "james.carter@jungle.com",
    bio: "Former BBC journalist and English professor with 10 years of experience. Expert in academic writing, pronunciation coaching, and advanced grammar for C1/C2 learners.",
    specialization: ["Academic Writing", "Pronunciation", "Advanced Grammar", "C1/C2 Level"],
    experienceYears: 10,
    hourlyRate: 42,
    rating: 4.8,
    reviewCount: 178,
    languages: ["English", "Spanish"],
    availability: [
      { dayOfWeek: "MONDAY",    startTime: "13:00", endTime: "19:00", available: true },
      { dayOfWeek: "TUESDAY",   startTime: "09:00", endTime: "12:00", available: true },
      { dayOfWeek: "TUESDAY",   startTime: "15:00", endTime: "20:00", available: true },
      { dayOfWeek: "WEDNESDAY", startTime: "13:00", endTime: "19:00", available: true },
      { dayOfWeek: "THURSDAY",  startTime: "09:00", endTime: "12:00", available: true },
      { dayOfWeek: "SATURDAY",  startTime: "10:00", endTime: "16:00", available: true }
    ]
  },
  {
    id: 3,
    firstName: "Ahmed",
    lastName: "",
    email: "emily.walsh@jungle.com",
    bio: "Certified English teacher specialising in beginners and intermediate learners. Patient, structured approach focused on building confidence through everyday conversation and vocabulary.",
    specialization: ["Beginner English", "Intermediate Level", "Everyday Vocabulary", "Listening Skills"],
    experienceYears: 6,
    hourlyRate: 28,
    rating: 4.7,
    reviewCount: 142,
    languages: ["English", "French", "German"],
    availability: [
      { dayOfWeek: "MONDAY",    startTime: "08:00", endTime: "12:00", available: true },
      { dayOfWeek: "TUESDAY",   startTime: "14:00", endTime: "18:00", available: true },
      { dayOfWeek: "WEDNESDAY", startTime: "08:00", endTime: "12:00", available: true },
      { dayOfWeek: "THURSDAY",  startTime: "14:00", endTime: "18:00", available: true },
      { dayOfWeek: "FRIDAY",    startTime: "09:00", endTime: "13:00", available: true }
    ]
  },
  {
    id: 4,
    firstName: "Michael",
    lastName: "",
    email: "michael.roberts@jungle.com",
    bio: "Business English specialist with a background in international finance. Trains professionals for job interviews, presentations, and corporate communication in English.",
    specialization: ["Business English", "Job Interview Prep", "Corporate Communication", "Email Writing"],
    experienceYears: 7,
    hourlyRate: 45,
    rating: 4.8,
    reviewCount: 96,
    languages: ["English", "Arabic", "French"],
    availability: [
      { dayOfWeek: "MONDAY",    startTime: "10:00", endTime: "17:00", available: true },
      { dayOfWeek: "TUESDAY",   startTime: "13:00", endTime: "19:00", available: true },
      { dayOfWeek: "WEDNESDAY", startTime: "10:00", endTime: "17:00", available: true },
      { dayOfWeek: "THURSDAY",  startTime: "13:00", endTime: "19:00", available: true },
      { dayOfWeek: "FRIDAY",    startTime: "14:00", endTime: "18:00", available: true },
      { dayOfWeek: "SATURDAY",  startTime: "11:00", endTime: "15:00", available: true }
    ]
  },
  {
    id: 5,
    firstName: "Olivia",
    lastName: "Bennett",
    email: "olivia.bennett@jungle.com",
    bio: "Cambridge-certified tutor specialising in English for children and teenagers. Fun, interactive lessons using games, storytelling, and multimedia to make learning enjoyable.",
    specialization: ["Kids & Teens English", "Cambridge YLE", "Reading & Writing", "Storytelling"],
    experienceYears: 5,
    hourlyRate: 30,
    rating: 4.9,
    reviewCount: 187,
    languages: ["English", "Italian", "French"],
    availability: [
      { dayOfWeek: "MONDAY",    startTime: "09:00", endTime: "13:00", available: true },
      { dayOfWeek: "TUESDAY",   startTime: "14:00", endTime: "18:00", available: true },
      { dayOfWeek: "WEDNESDAY", startTime: "09:00", endTime: "13:00", available: true },
      { dayOfWeek: "THURSDAY",  startTime: "14:00", endTime: "18:00", available: true },
      { dayOfWeek: "FRIDAY",    startTime: "10:00", endTime: "14:00", available: true }
    ]
  }
];

// Helper functions
export function getTutorById(id: number): StaticTutor | undefined {
  return STATIC_TUTORS.find(tutor => tutor.id === id);
}

export function getAvailableTutors(): StaticTutor[] {
  return STATIC_TUTORS.filter(tutor => tutor.availability.some(slot => slot.available));
}

export function getTutorsBySpecialization(specialization: string): StaticTutor[] {
  return STATIC_TUTORS.filter(tutor =>
    tutor.specialization.some(spec =>
      spec.toLowerCase().includes(specialization.toLowerCase())
    )
  );
}
