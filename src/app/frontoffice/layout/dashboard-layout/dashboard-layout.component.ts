import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NavItem } from '../../../core/models/nav-item.model';
import { STUDENT_NAV } from '../../jungle/student/student-nav';
import { TUTOR_NAV } from '../../jungle/tutor/tutor-nav';
import { FrontDashboardHeaderComponent } from './front-dashboard-header/front-dashboard-header.component';
import { FrontSidebarComponent } from './front-sidebar/front-sidebar.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, FrontDashboardHeaderComponent, FrontSidebarComponent],
  template: `
    <div class="fd-shell">
      <app-front-dashboard-header [navItems]="navItems"></app-front-dashboard-header>
      <div class="fd-body">
        <app-front-sidebar [navItems]="navItems"></app-front-sidebar>
        <main class="fd-main">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .fd-shell { display: flex; flex-direction: column; min-height: 100vh; background: var(--fd-shell-bg); }
    .fd-body  { display: flex; flex: 1; min-height: calc(100vh - 64px); }
    .fd-main  { flex: 1; padding: 2rem 2.5rem; background: var(--fd-main-bg); overflow-y: auto; }
  `]
})
export class DashboardLayoutComponent {
  navItems: NavItem[] = [];

  constructor(private authService: AuthService) {
    const role = this.authService.getUserRole();
    this.navItems = role === 'TUTOR' ? TUTOR_NAV : STUDENT_NAV;
  }
}
