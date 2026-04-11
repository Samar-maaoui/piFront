import { NavItem } from '../../../core/models/nav-item.model';

// ANCIEN CODE MIS EN COMMENTAIRE
// export const TUTOR_NAV: NavItem[] = [
//   { label: 'Dashboard',   route: '/tutor/dashboard', icon: '🏠' },
//   //{ label: 'My Students', route: '#',                icon: '🎓' },
//   //{ label: 'My Courses',  route: '#',                icon: '📖' },
//   //{ label: 'Schedule',    route: '#',                icon: '🗓️' },
//   //{ label: 'Earnings',    route: '#',                icon: '💰' },
// ];

// NOUVEAU TUTOR_NAV avec tous les boutons de navigation
export const TUTOR_NAV: NavItem[] = [
  { label: 'Dashboard', route: '/tutor/dashboard' },
  { label: 'Sessions', route: '/tutor/sessions' },
  { label: 'Availability', route: '/tutor/availability' },
  { label: 'My Students', route: '/tutor/students' },
  { label: 'Bookings', route: '/tutor/bookings' },
  { label: 'Quizzes', route: '/tutor/quiz' }
];
