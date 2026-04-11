import { NavItem } from '../../../core/models/nav-item.model';

// ANCIEN CODE MIS EN COMMENTAIRE
// export const STUDENT_NAV: NavItem[] = [
//   { label: 'Dashboard',  route: '/student/dashboard', icon: '🏠' },
//   //{ label: 'My Courses', route: '/student/courses',   icon: '📚' },
//   //{ label: 'Progress',   route: '/student/progress',  icon: '📈' },
//   //{ label: 'Schedule',   route: '/student/schedule',  icon: '🗓️' },
//   //{ label: 'My Tutor',   route: '/student/tutor',     icon: '💬' },
// ];

// NOUVEAU STUDENT_NAV avec tous les boutons de navigation
export const STUDENT_NAV: NavItem[] = [
  { label: 'Dashboard', route: '/student/dashboard' },
  { label: 'Find Tutors', route: '/student/tutors' },
  { label: 'My Sessions', route: '/student/sessions' },
  { label: 'My Bookings', route: '/student/bookings' },
  { label: 'History', route: '/student/booking-history' },
  { label: 'Quizzes', route: '/student/quiz' },
  { label: 'Profile', route: '/student/profile' },
];
