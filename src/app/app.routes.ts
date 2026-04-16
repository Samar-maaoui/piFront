import { Routes } from '@angular/router';
import { PublicLayoutComponent } from './frontoffice/layout/public-layout/public-layout.component';
import { DashboardLayoutComponent } from './frontoffice/layout/dashboard-layout/dashboard-layout.component';
import { AdminLayoutComponent } from './backoffice/layout/admin-layout/admin-layout.component';
import { LandingpageComponent } from './frontoffice/pages/landingpage/landingpage.component';
import { LoginComponent } from './frontoffice/pages/login/login.component';
import { SignupComponent } from './frontoffice/pages/signup/signup.component';
import { StudentDashboardComponent } from './frontoffice/jungle/student/student-dashboard/student-dashboard.component';
import { StudentSessionsComponent } from './frontoffice/jungle/student/student-sessions/student-sessions.component';
import { StudentBookingsComponent } from './frontoffice/jungle/student/student-bookings/student-bookings.component';
import { StudentBookingHistoryComponent } from './frontoffice/jungle/student/student-booking-history/student-booking-history.component';
import { TutorDashboardComponent } from './frontoffice/jungle/tutor/tutor-dashboard/tutor-dashboard.component';
import { AdminDashboardComponent } from './backoffice/pages/admin-dashboard/admin-dashboard.component';
import { UsersComponent } from './backoffice/pages/users/users.component';
import { UserDetailComponent } from './backoffice/pages/users/user-detail/user-detail.component';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { SessionComponent } from './backoffice/ReservationSession/Session/Session.component';
import { AvailabilityComponent } from './backoffice/ReservationSession/Availability/Availability.component';
import { AdminFeedbacksComponent } from './backoffice/pages/admin-feedbacks/admin-feedbacks.component';
import { BookingListComponent } from './backoffice/pages/bookings-page/Booking-list.component';
import { TutorQuizStatsComponent } from './frontoffice/jungle/tutor/Quiz/Tutor quiz stats.component';
import { TutorListComponent } from './frontoffice/jungle/student/tutor-list/tutor-list.component';
import { BookingFormComponent } from './frontoffice/jungle/student/booking-form/booking-form.component';
import { StudentProfileComponent } from './frontoffice/jungle/student/Profile/student-profile.component';

// ✅ UNIQUEMENT l'export des routes — pas de @NgModule ici
export const routes: Routes = [

  // ══════════════════════════════════════════════
  // PUBLIC — sans authentification
  // ══════════════════════════════════════════════
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      { path: '', component: LandingpageComponent },
      { path: 'login', component: LoginComponent },
      { path: 'signup', component: SignupComponent },
    ]
  },

  // ══════════════════════════════════════════════
  // ÉTUDIANT — path: 'student'
  // ══════════════════════════════════════════════
  {
    path: 'student',
    component: DashboardLayoutComponent,
    canActivate: [authGuard, roleGuard('STUDENT')],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: StudentDashboardComponent },
      { path: 'tutors', component: TutorListComponent },
      { path: 'sessions', component: StudentSessionsComponent },
      { path: 'booking-history', component: StudentBookingHistoryComponent },

      // ✅ new et edit AVANT la liste
      {
        path: 'bookings/new',
        component: BookingFormComponent
      },
      {
        path: 'bookings/edit/:id',
        loadComponent: () =>
          import('./backoffice/pages/bookings-page/Booking-form.component')
            .then(m => m.BookingFormComponent)
      },
      { path: 'bookings', component: StudentBookingsComponent },
      // ── Quiz routes (student) ──
      {
        path: 'quiz',
        loadComponent: () =>
          import('./frontoffice/jungle/student/Quiz/student-quiz-list.component')
            .then(m => m.StudentQuizListComponent)
      },
      {
        path: 'quiz/:id/take',
        loadComponent: () =>
          import('./frontoffice/jungle/student/Quiz/student-quiz-take.component')
            .then(m => m.StudentQuizTakeComponent)
      },
      {
        path: 'results',
        loadComponent: () =>
          import('./frontoffice/jungle/student/Quiz/student-quiz-history.component')
            .then(m => m.StudentQuizHistoryComponent)
      },
      {
        path: 'booking-dashboard',
        loadComponent: () =>
          import('./frontoffice/jungle/student/booking-dashboard/student-dashboard.component')
            .then(m => m.StudentDashboardComponent)
      },
      { path: 'profile', component: StudentProfileComponent },
      {
        path: 'payments/dashboard',
        loadComponent: () =>
          import('./backoffice/pages/payments/payment-dashboard/payment-dashboard.component').then(
            (m) => m.PaymentDashboardComponent,
          ),
      },

    ]
  },

  // ══════════════════════════════════════════════
  // TUTEUR — path: 'tutor'
  // ══════════════════════════════════════════════
  {
    path: 'tutor',
    component: DashboardLayoutComponent,
    canActivate: [authGuard, roleGuard('TUTOR')],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: TutorDashboardComponent },
      {
        path: 'sessions',
        loadComponent: () =>
          import('./frontoffice/jungle/tutor/Session/tutor-sessions.component')
            .then(m => m.TutorSessionsComponent)
      },
      {
        path: 'bookings',
        loadComponent: () =>
          import('./frontoffice/jungle/tutor/Booking/Tutor-bookings.component')
            .then(m => m.TutorBookingsComponent)
      },
      {
        path: 'availability',
        loadComponent: () =>
          import('./backoffice/ReservationSession/Availability/Availability.component')
            .then(m => m.AvailabilityComponent)
      },
      {
        path: 'students',
        loadComponent: () =>
          import('./frontoffice/jungle/tutor/Student/tutor-students.component')
            .then(m => m.TutorStudentsComponent)
      },
      // ── Quiz routes (tutor) ──
      {
        path: 'quiz',
        loadComponent: () =>
          import('./frontoffice/jungle/tutor/Quiz/Tutor quiz list.component')
            .then(m => m.TutorQuizListComponent)
      },
      {
        path: 'quiz/new',
        loadComponent: () =>
          import('./frontoffice/jungle/tutor/Quiz/Tutor quiz form.component')
            .then(m => m.TutorQuizFormComponent)
      },
      {
        path: 'quiz/edit/:id',
        loadComponent: () =>
          import('./frontoffice/jungle/tutor/Quiz/Tutor quiz form.component')
            .then(m => m.TutorQuizFormComponent)
      },
      {
        path: 'quiz/:id/results',
        loadComponent: () =>
          import('./frontoffice/jungle/tutor/Quiz/Tutor quiz results component')
            .then(m => m.TutorQuizResultsComponent)
      },
      { path: 'quiz/:id/stats', component: TutorQuizStatsComponent },
      {
        path: 'booking-dashboard',
        loadComponent: () =>
          import('./frontoffice/jungle/tutor/booking-dashboard/tutor-dashboard.component')
            .then(m => m.TutorDashboardComponent)
      },

    ]
  },

  // ══════════════════════════════════════════════
  // ADMIN — path: 'admin'
  // ══════════════════════════════════════════════
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [authGuard, roleGuard('ADMIN')],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'users', component: UsersComponent },
      { path: 'users/:id', component: UserDetailComponent },
      { path: 'sessions', component: SessionComponent },
      { path: 'availability', component: AvailabilityComponent },
      { path: 'feedbacks', component: AdminFeedbacksComponent },

      // ✅ new et edit AVANT la liste
      {
        path: 'bookings/new',
        loadComponent: () =>
          import('./backoffice/pages/bookings-page/Booking-form.component')
            .then(m => m.BookingFormComponent)
      },
      {
        path: 'bookings/edit/:id',
        loadComponent: () =>
          import('./backoffice/pages/bookings-page/Booking-form.component')
            .then(m => m.BookingFormComponent)
      },
      { path: 'bookings', component: BookingListComponent },
      {
        path: 'booking-dashboard',
        loadComponent: () =>
          import('./backoffice/pages/AdminBooking/Admin bookings.component')
            .then(m => m.AdminBookingsComponent)
      },
      // ── Quiz routes (admin) ──
      {
        path: 'quiz',
        // route for admin quiz management – use the dedicated AdminQuizComponent
        loadComponent: () =>
          import('./backoffice/pages/AdminQuiz/admin-quiz.component')
            .then(m => m.AdminQuizComponent)
      },
      {
        path: 'quiz/:id/questions',
        loadComponent: () =>
          import('./backoffice/pages/Question/question-list/question-list.component')
            .then(m => m.QuestionListComponent)
      },
      {
        path: 'quiz/:id/take',
        loadComponent: () =>
          import('./backoffice/pages/Quiz/quiz-take/quiz-take.component')
            .then(m => m.QuizTakeComponent)
      },
    ]
  },

  // ══════════════════════════════════════════════
  // PAIEMENT — accessible à tout utilisateur connecté
  // ══════════════════════════════════════════════
  {
    path: 'student/pay',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./frontoffice/jungle/student/student-pay/student-pay.component')
        .then(m => m.StudentPayComponent),
  },

  // ══════════════════════════════════════════════
  // FALLBACK
  // ══════════════════════════════════════════════
  { path: '**', redirectTo: '' }
];