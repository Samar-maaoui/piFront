import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavItem } from '../../../../core/models/nav-item.model';

@Component({
  selector: 'app-front-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './front-sidebar.component.html',
  styleUrls: ['./front-sidebar.component.css']
})
export class FrontSidebarComponent {
  @Input() navItems: NavItem[] = [];
}

