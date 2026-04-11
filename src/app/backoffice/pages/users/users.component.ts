import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserServiceService } from '../../services/user-service.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent implements OnInit {
  users: any[] = [];
  loading = true;
  errorMessage = '';

  constructor(private userService: UserServiceService, private router: Router) {}

  ngOnInit(): void {
    this.getAllUsers();
  }

  getAllUsers(): void {
    this.loading = true;
    this.errorMessage = '';
    this.userService.getAllUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        if (err.status === 403) {
          this.errorMessage = 'Access denied. You do not have permission to view users.';
        } else {
          this.errorMessage = 'Failed to load users. Please try again.';
        }
      }
    });
  }

  viewUser(id: number): void {
    this.router.navigate(['/admin/users', id]);
  }
}
