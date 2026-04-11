import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Role, SignupFormData } from './signup.model';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css']
})
export class SignupComponent {
  signupForm!: FormGroup;
  selectedRole: Role | null = null;
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
    this.signupForm = this.formBuilder.group({
      // Required fields
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['', Validators.required],

      // Student fields (optional until STUDENT role is selected)
      level: [''],
      learningGoals: [''],

      // Tutor fields (optional until TUTOR role is selected)
      bio: [''],
      specialization: [''],
      experienceYears: [''],
      hourlyRate: ['']
    });
  }

  onRoleChange(role: Role): void {
    this.selectedRole = role;
    this.signupForm.patchValue({ role });

    // Update validators based on role
    if (role === 'STUDENT') {
      this.signupForm.get('level')?.setValidators([Validators.required]);
      this.signupForm.get('learningGoals')?.setValidators([Validators.required]);
      this.signupForm.get('bio')?.clearValidators();
      this.signupForm.get('specialization')?.clearValidators();
      this.signupForm.get('experienceYears')?.clearValidators();
      this.signupForm.get('hourlyRate')?.clearValidators();
    } else if (role === 'TUTOR') {
      this.signupForm.get('bio')?.setValidators([Validators.required]);
      this.signupForm.get('specialization')?.setValidators([Validators.required]);
      this.signupForm.get('experienceYears')?.setValidators([Validators.required, Validators.min(0)]);
      this.signupForm.get('hourlyRate')?.setValidators([Validators.required, Validators.min(0)]);
      this.signupForm.get('level')?.clearValidators();
      this.signupForm.get('learningGoals')?.clearValidators();
    }

    // Update validation status
    Object.keys(this.signupForm.controls).forEach(key => {
      this.signupForm.get(key)?.updateValueAndValidity({ emitEvent: false });
    });
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';

    if (this.signupForm.valid) {
      this.loading = true;
      const formData: SignupFormData = {
        ...this.signupForm.value,
        accountStatus: 'ACTIVE'
      };

      this.authService.register(formData).subscribe({
        next: (_user) => {
          this.loading = false;
          // After successful registration, redirect to login
          this.router.navigate(['/login']);
        },
        error: (err) => {
          this.loading = false;
          if (err.status === 409) {
            this.errorMessage = 'An account with this email already exists.';
          } else {
            this.errorMessage = 'Registration failed. Please try again.';
          }
        }
      });
    }
  }

  get f() {
    return this.signupForm.controls;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.signupForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched || this.submitted));
  }
}
