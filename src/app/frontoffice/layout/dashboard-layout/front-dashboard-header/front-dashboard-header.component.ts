import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NavItem } from '../../../../core/models/nav-item.model';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-front-dashboard-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './front-dashboard-header.component.html',
  styleUrls: ['./front-dashboard-header.component.css']
})
export class FrontDashboardHeaderComponent {
  @Input() navItems: NavItem[] = [];

  constructor(public authService: AuthService, private router: Router) {}

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

