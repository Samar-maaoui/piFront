import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm!: FormGroup;
  submitted = false;
  loading = false;
  errorMessage = '';

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.initializeForm();
  }

  initializeForm(): void {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';

    if (this.loginForm.valid) {
      this.loading = true;
      this.loginForm.disable();
      const { email, password } = this.loginForm.value;

      this.authService.login({ email, password }).subscribe({
        next: (response) => {
          this.loading = false;
          this.loginForm.enable();
          const role = response.user.role;
          if (role === 'STUDENT') {
            this.router.navigate(['/student/dashboard']);
          } else if (role === 'TUTOR') {
            this.router.navigate(['/tutor/dashboard']);
          } else if (role === 'ADMIN') {
            this.router.navigate(['/admin/dashboard']);
          } else {
            this.router.navigate(['/']);
          }
        },
        error: (err) => {
          this.loading = false;
          this.loginForm.enable();
          if (err && err.status === 401) {
            this.errorMessage = 'Invalid email or password.';
          } else if (err && err.error && err.error.message) {
            this.errorMessage = err.error.message;
          } else if (err && err.message) {
            this.errorMessage = err.message;
          } else {
            this.errorMessage = 'An error occurred. Please try again.';
          }
        }
      });
    }
  }

  get f() {
    return this.loginForm.controls;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched || this.submitted));
  }
}
