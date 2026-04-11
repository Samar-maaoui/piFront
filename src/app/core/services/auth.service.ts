import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable, of, throwError, tap } from 'rxjs';
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  UserResponse
} from '../models/user.model';

// Re-export so existing imports from auth.service still work
export type { LoginRequest, LoginResponse, RegisterRequest, UserResponse };

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = 'http://localhost:8081/auth';
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: object
  ) { }

  // ============================================================
  // ANCIEN CODE MIS EN COMMENTAIRE (anciens utilisateurs statiques)
  // ============================================================
  // private staticUsers: UserResponse[] = [
  //   {
  //     id: 1,
  //     firstName: 'Alice',
  //     lastName: 'Student',
  //     email: 'alice@student.com',
  //     role: 'STUDENT',
  //     accountStatus: 'ACTIVE',
  //     createdAt: new Date().toISOString(),
  //     updatedAt: new Date().toISOString(),
  //   },
  //   {
  //     id: 2,
  //     firstName: 'Tom',
  //     lastName: 'Tutor',
  //     email: 'tom@tutor.com',
  //     role: 'TUTOR',
  //     accountStatus: 'ACTIVE',
  //     createdAt: new Date().toISOString(),
  //     updatedAt: new Date().toISOString(),
  //   },
  //   {
  //     id: 3,
  //     firstName: 'Admin',
  //     lastName: 'User',
  //     email: 'admin@site.com',
  //     role: 'ADMIN',
  //     accountStatus: 'ACTIVE',
  //     createdAt: new Date().toISOString(),
  //     updatedAt: new Date().toISOString(),
  //   }
  // ];

  // // Simple email -> password store (cleartext for dev/testing only)
  // private credentials = new Map<string, string>([
  //   ['alice@student.com', 'password'],
  //   ['tom@tutor.com', 'password'],
  //   ['admin@site.com', 'password']
  // ]);
  // ============================================================

  // ============================================================
  // NOUVEAUX UTILISATEURS STATIQUES : admin, tutor, student
  // ============================================================
  private staticUsers: UserResponse[] = [
    // --- Utilisateur STUDENT ---
    {
      id: 1,
      firstName: 'Student',
      lastName: 'User',
      email: 'student@jungle.com',
      role: 'STUDENT',
      accountStatus: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    // --- Utilisateur TUTOR ---
    {
      id: 2,
      firstName: 'Tutor',
      lastName: 'User',
      email: 'tutor@jungle.com',
      role: 'TUTOR',
      accountStatus: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    // --- Utilisateur ADMIN ---
    {
      id: 3,
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@jungle.com',
      role: 'ADMIN',
      accountStatus: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ];

  // Identifiants : email -> mot de passe (texte clair, dev/test uniquement)
  private credentials = new Map<string, string>([
    ['student@jungle.com', 'student123'],
    ['tutor@jungle.com', 'tutor123'],
    ['admin@jungle.com', 'admin123']
  ]);

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  login(request: LoginRequest): Observable<LoginResponse> {
    // Local in-memory authentication using static users
    const { email, password } = request;
    const expected = this.credentials.get(email);

    if (!expected || expected !== password) {
      return throwError(() => new HttpErrorResponse({
        status: 401,
        statusText: 'Unauthorized',
        error: { message: 'Invalid email or password' }
      }));
    }

    const user = this.staticUsers.find(u => u.email === email) as UserResponse;
    const token = btoa(`${email}:${user.role}:${Date.now()}`);

    const response: LoginResponse = { token, user };

    return of(response).pipe(
      tap(res => {
        if (this.isBrowser()) {
          localStorage.setItem(this.TOKEN_KEY, res.token);
          localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
        }
      })
    );
  }

  register(request: RegisterRequest): Observable<UserResponse> {
    // Create a new in-memory user and credentials (for local dev/testing)
    // TUTORS: First registered tutor gets id=1, second gets id=2, etc.
    // STUDENTS: Get id based on global count
    const userRole = (request as any).role || 'STUDENT';
    let id: number;

    if (userRole === 'TUTOR') {
      // Count existing tutors
      const existingTutors = this.staticUsers.filter(u => u.role === 'TUTOR');
      id = existingTutors.length + 1;
    } else {
      // Global ID assignment for other roles
      id = this.staticUsers.length + 1;
    }

    const now = new Date().toISOString();

    const newUser: UserResponse = {
      id,
      firstName: (request as any).firstName || 'New',
      lastName: (request as any).lastName || 'User',
      email: request.email,
      role: userRole,
      accountStatus: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };

    this.staticUsers.push(newUser);
    // store password if provided
    if ((request as any).password) {
      this.credentials.set(request.email, (request as any).password);
    }

    return of(newUser);
  }

  logout(): void {
    if (this.isBrowser()) {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    }
  }

  getToken(): string | null {
    if (!this.isBrowser()) return null;
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getCurrentUser(): UserResponse | null {
    if (!this.isBrowser()) return null;
    const userJson = localStorage.getItem(this.USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getUserRole(): 'STUDENT' | 'TUTOR' | 'ADMIN' | null {
    const user = this.getCurrentUser();
    return user ? user.role : null;
  }
}
