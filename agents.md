# PiFront — Agent Context & Architecture Reference

> Last updated: 2026-02-28  
> Purpose: Full context document for any AI agent working on this codebase.  
> Read this first before making any change to the project.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Current Folder Structure](#2-current-folder-structure)
3. [Key Architectural Choices](#3-key-architectural-choices)
4. [Routing — Nested Layout Shells](#4-routing--nested-layout-shells)
5. [Core Layer](#5-core-layer)
   - [Models](#models)
   - [AuthService](#authservice)
   - [authGuard](#authguard)
   - [roleGuard](#roleguard)
6. [Layout System](#6-layout-system)
   - [PublicLayoutComponent](#publiclayoutcomponent)
   - [DashboardLayoutComponent](#dashboardlayoutcomponent)
   - [AdminLayoutComponent](#adminlayoutcomponent)
   - [DashboardHeaderComponent](#dashboardheadercomponent)
   - [SidebarComponent](#sidebarcomponent)
7. [Nav Config Pattern](#7-nav-config-pattern)
8. [Login Workflow](#8-login-workflow)
9. [Signup Workflow](#9-signup-workflow)
10. [Logout](#10-logout)
11. [Rules for Agents](#11-rules-for-agents)

---

## 1. Project Overview

**PiFront** is an **Angular 17+ SSR application** (Angular Universal) using **exclusively standalone components** (no `NgModule` anywhere).

- **Backend API:** `http://localhost:8081/auth`
- **Rendering:** Server-Side Rendering via `server.ts` + `main.server.ts`
- **Auth:** JWT token stored in `localStorage` (SSR-safe)
- **Three user roles:** `STUDENT`, `TUTOR`, `ADMIN`
- **Three visual zones:** Public frontoffice, Authenticated jungle dashboards, Admin backoffice

---

## 2. Current Folder Structure

```
src/app/
│
├── app.component.ts              ← ONLY contains <router-outlet> (no header/footer here)
├── app.routes.ts                 ← Nested route tree with layout shell wrappers
├── app.config.ts                 ← Root providers: Router, HttpClient(withFetch), Hydration
├── app.config.server.ts          ← SSR-specific providers
│
├── core/                         ← Singleton, app-wide concerns
│   ├── guards/
│   │   ├── auth.guard.ts         ← Checks token exists → else redirect /login
│   │   └── role.guard.ts         ← Checks role matches route → else redirect own dashboard
│   ├── services/
│   │   └── auth.service.ts       ← JWT login/register/logout + localStorage helpers
│   └── models/
│       ├── user.model.ts         ← LoginRequest, UserResponse, LoginResponse, RegisterRequest
│       └── nav-item.model.ts     ← NavItem { label, route, icon? }
│
├── frontoffice/
│   ├── layout/
│   │   ├── header/               ← Public header (selector: app-header)
│   │   │   ├── header.component.ts
│   │   │   ├── header.component.html
│   │   │   └── header.component.css
│   │   ├── footer/               ← Public footer (selector: app-footer)
│   │   │   ├── footer.component.ts
│   │   │   ├── footer.component.html
│   │   │   └── footer.component.css
│   │   ├── public-layout/        ← Shell: app-header + router-outlet + app-footer
│   │   │   └── public-layout.component.ts
│   │   └── dashboard-layout/     ← Shell: app-dashboard-header + app-sidebar + router-outlet
│   │       └── dashboard-layout.component.ts
│   │
│   ├── pages/
│   │   ├── landingpage/          ← Route: ""  (inside PublicLayout)
│   │   ├── login/                ← Route: "login"  (inside PublicLayout)
│   │   └── signup/               ← Route: "signup" (inside PublicLayout)
│   │
│   └── jungle/                   ← Authenticated user dashboards
│       ├── student/
│       │   ├── student-nav.ts    ← STUDENT_NAV: NavItem[]
│       │   └── student-dashboard/  ← Route: "student/dashboard" 🔒 STUDENT only
│       └── tutor/
│           ├── tutor-nav.ts      ← TUTOR_NAV: NavItem[]
│           └── tutor-dashboard/  ← Route: "tutor/dashboard" 🔒 TUTOR only
│
└── backoffice/
    ├── layout/
    │   ├── header/               ← DashboardHeaderComponent (selector: app-dashboard-header)
    │   │   ├── header.component.ts    @Input() navItems + user badge + logout
    │   │   ├── header.component.html
    │   │   └── header.component.css
    │   ├── sidebar/              ← SidebarComponent (selector: app-sidebar)
    │   │   ├── sidebar.component.ts   @Input() navItems
    │   │   ├── sidebar.component.html
    │   │   └── sidebar.component.css
    │   └── admin-layout/         ← Shell: app-dashboard-header + app-sidebar + router-outlet
    │       └── admin-layout.component.ts   (also exports ADMIN_NAV)
    └── pages/
        └── admin-dashboard/      ← Route: "admin/dashboard" 🔒 ADMIN only
            └── admin-dashboard.component.ts
```

> 🔒 = protected by both `authGuard` AND `roleGuard`

---

## 3. Key Architectural Choices

| Concern | Solution |
|---|---|
| Rendering | Angular Universal SSR (`server.ts` + `main.server.ts`) |
| Components | All standalone — **never use NgModule** |
| Routing | Nested layout shells — each zone has its own parent layout route |
| HTTP | `provideHttpClient(withFetch())` — mandatory for SSR compatibility |
| Auth state | JWT token + user JSON stored in `localStorage` |
| SSR safety | All `localStorage` access wrapped with `isPlatformBrowser(platformId)` |
| Route protection | Two guards: `authGuard` (token check) + `roleGuard(role)` (role check) |
| Navigation config | `NavItem[]` arrays defined per role, passed as `@Input()` to header & sidebar |
| Forms | Reactive Forms (`FormBuilder`, `Validators`) — no template-driven forms |

---

## 4. Routing — Nested Layout Shells

```typescript
// app.routes.ts
export const routes: Routes = [

  // ── Public Shell ──────────────────────────────────────────────
  // Renders: <app-header> + <router-outlet> + <app-footer>
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      { path: '',       component: LandingpageComponent },
      { path: 'login',  component: LoginComponent },
      { path: 'signup', component: SignupComponent },
    ]
  },

  // ── Authenticated Shell ────────────────────────────────────────
  // Renders: <app-dashboard-header> + <app-sidebar> + <router-outlet>
  // authGuard: must be logged in
  // roleGuard: per child, only the matching role can enter
  {
    path: '',
    component: DashboardLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'student/dashboard', component: StudentDashboardComponent, canActivate: [roleGuard('STUDENT')] },
      { path: 'tutor/dashboard',   component: TutorDashboardComponent,   canActivate: [roleGuard('TUTOR')]   },
    ]
  },

  // ── Admin Shell ────────────────────────────────────────────────
  // Renders: <app-dashboard-header> + <app-sidebar> + <router-outlet>
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [authGuard, roleGuard('ADMIN')],
    children: [
      { path: 'dashboard', component: AdminDashboardComponent },
    ]
  },

  { path: '**', redirectTo: '' }
];
```

### Important: Two routes share `path: ''`
Angular matches the **first route that satisfies the guards**. The public shell always matches for unauthenticated users. The dashboard shell is reached only when `authGuard` passes.

---

## 5. Core Layer

### Models

**`core/models/user.model.ts`** — all auth-related interfaces:

```typescript
interface LoginRequest    { email: string; password: string; }
interface UserResponse    { id, firstName, lastName, email, role, accountStatus, createdAt, updatedAt }
interface LoginResponse   { token: string; user: UserResponse; }
interface RegisterRequest { firstName, lastName, email, password, role, + optional student/tutor fields }
```

**`core/models/nav-item.model.ts`** — navigation item shape:

```typescript
interface NavItem { label: string; route: string; icon?: string; }
```

---

### AuthService

**File:** `core/services/auth.service.ts`  
**API base:** `http://localhost:8081/auth`

| Method | HTTP | Description |
|---|---|---|
| `login(request)` | `POST /auth/login` | Saves `auth_token` + `auth_user` to localStorage via `tap()` |
| `register(request)` | `POST /auth/register` | Returns `UserResponse` |
| `logout()` | — | Removes `auth_token` and `auth_user` from localStorage |
| `getToken()` | — | Returns JWT string or `null` |
| `getCurrentUser()` | — | Returns parsed `UserResponse` or `null` |
| `isLoggedIn()` | — | `true` if token exists |
| `getUserRole()` | — | Returns `'STUDENT' \| 'TUTOR' \| 'ADMIN' \| null` |

> All interfaces are now defined in `core/models/user.model.ts` and **re-exported** from `auth.service.ts` for backward compatibility. Import from either location.

---

### authGuard

**File:** `core/guards/auth.guard.ts`

Functional `CanActivateFn`. Checks `authService.isLoggedIn()`.  
- ✅ Token present → allow
- ❌ No token → redirect to `/login`

---

### roleGuard

**File:** `core/guards/role.guard.ts`

Guard **factory** — call it with the required role: `roleGuard('STUDENT')`.  
Returns a `CanActivateFn` that checks `authService.getUserRole()` against the required role.

**Redirect matrix when role doesn't match:**

| Logged-in role | Required role | Redirected to |
|---|---|---|
| `STUDENT` | `TUTOR` or `ADMIN` | `/student/dashboard` |
| `TUTOR` | `STUDENT` or `ADMIN` | `/tutor/dashboard` |
| `ADMIN` | `STUDENT` or `TUTOR` | `/admin/dashboard` |
| `null` | any | `/login` |

> Always pair `roleGuard` **after** `authGuard`: `canActivate: [authGuard, roleGuard('ROLE')]`

---

## 6. Layout System

### PublicLayoutComponent

**File:** `frontoffice/layout/public-layout/public-layout.component.ts`  
**Selector:** `app-public-layout`  
**Template:** `<app-header> + <router-outlet> + <app-footer>`

Wraps the existing `HeaderComponent` (public nav with Login/Sign Up buttons) and `FooterComponent`. Used for all public pages (landing, login, signup).

---

### DashboardLayoutComponent

**File:** `frontoffice/layout/dashboard-layout/dashboard-layout.component.ts`  
**Selector:** `app-dashboard-layout`  
**Template:** `<app-dashboard-header [navItems]> + <app-sidebar [navItems]> + <router-outlet>`

**Nav resolution logic** (happens once in constructor):
```typescript
const role = authService.getUserRole();
this.navItems = role === 'TUTOR' ? TUTOR_NAV : STUDENT_NAV;
```

The layout resolves which nav to use based on role, then passes it **down** as `@Input()` to both the header and sidebar. Neither header nor sidebar ever touches `AuthService` directly.

---

### AdminLayoutComponent

**File:** `backoffice/layout/admin-layout/admin-layout.component.ts`  
**Selector:** `app-admin-layout`  
**Template:** Same structure as DashboardLayout but uses hardcoded `ADMIN_NAV`.  
**Also exports:** `ADMIN_NAV: NavItem[]`

---

### DashboardHeaderComponent

**File:** `backoffice/layout/header/header.component.ts`  
**Selector:** `app-dashboard-header`

```typescript
@Input() navItems: NavItem[]   // Nav links rendered in the top bar
```

Displays: logo, nav links (from `navItems`), logged-in user name, role badge (colour-coded), logout button.  
Calls `authService.getCurrentUser()` for user info.  
`logout()` calls `authService.logout()` then navigates to `/login`.

**Role badge colours:**
- `STUDENT` → green
- `TUTOR` → blue
- `ADMIN` → red

---

### SidebarComponent

**File:** `backoffice/layout/sidebar/sidebar.component.ts`  
**Selector:** `app-sidebar`

```typescript
@Input() navItems: NavItem[]   // Links rendered in the left sidebar
```

Purely presentational. Iterates `navItems` and renders `routerLink` + `routerLinkActive` styled links.

---

## 7. Nav Config Pattern

Each role owns its nav config as a plain TypeScript constant:

```typescript
// frontoffice/jungle/student/student-nav.ts
export const STUDENT_NAV: NavItem[] = [
  { label: 'Dashboard',  route: '/student/dashboard', icon: 'home'  },
  { label: 'My Courses', route: '/student/courses',   icon: 'book'  },
  { label: 'Progress',   route: '/student/progress',  icon: 'chart' },
];

// frontoffice/jungle/tutor/tutor-nav.ts
export const TUTOR_NAV: NavItem[] = [
  { label: 'Dashboard',   route: '/tutor/dashboard',  icon: 'home'   },
  { label: 'My Students', route: '/tutor/students',   icon: 'users'  },
  { label: 'Earnings',    route: '/tutor/earnings',   icon: 'dollar' },
];

// backoffice/layout/admin-layout/admin-layout.component.ts (exported from here)
export const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard',   route: '/admin/dashboard', icon: '🏠' },
  { label: 'Users',       route: '#',                icon: '👥' },
  { label: 'Courses',     route: '#',                icon: '📚' },
  { label: 'Enrollments', route: '#',                icon: '📋' },
  { label: 'Payments',    route: '#',                icon: '💳' },
  { label: 'Reports',     route: '#',                icon: '📊' },
  { label: 'Settings',    route: '#',                icon: '⚙️' },
];
```

**To add a new page to a role:** add a `NavItem` entry to that role's nav file and add the route to `app.routes.ts`. Nothing else changes.

---

## 8. Login Workflow

### Step-by-step

1. **Form** — `LoginComponent` builds a Reactive Form: `email` (required, email), `password` (required, min 6), `rememberMe` (checkbox, UI only).
2. **Validation** — `submitted = true` on submit triggers all inline error messages. Invalid form stops here.
3. **HTTP** — `authService.login({ email, password })` → `POST http://localhost:8081/auth/login`
4. **Storage** — On success, `tap()` in `AuthService` stores:
   - `localStorage["auth_token"]` = JWT string
   - `localStorage["auth_user"]` = JSON stringified `UserResponse`
5. **Redirect** by role:

| Role | Redirects to |
|---|---|
| `STUDENT` | `/student/dashboard` |
| `TUTOR` | `/tutor/dashboard` |
| `ADMIN` | `/admin/dashboard` |
| unknown | `/` |

6. **Error handling:**

| HTTP Status | Message |
|---|---|
| `401` | "Invalid email or password." |
| other | "An error occurred. Please try again." |

### Sequence Diagram

```
User          LoginComponent        AuthService          Backend
 │                  │                    │                  │
 │── fills form ───►│                    │                  │
 │                  │─ validate() ──────►│                  │
 │                  │── login(creds) ───►│── POST /login ──►│
 │                  │                    │◄── {token,user} ─│
 │                  │                    │─ localStorage ───┤
 │                  │◄── LoginResponse ──│                  │
 │                  │─ navigate by role  │                  │
 │◄── redirected ───│                    │                  │
```

---

## 9. Signup Workflow

`SignupComponent` calls `authService.register()` → `POST http://localhost:8081/auth/register`.

Role-specific fields in `RegisterRequest`:

| Field | STUDENT | TUTOR |
|---|---|---|
| `firstName`, `lastName`, `email`, `password`, `role` | ✅ | ✅ |
| `level`, `learningGoals` | ✅ | — |
| `bio`, `specialization`, `experienceYears`, `hourlyRate` | — | ✅ |

On success → redirect to `/login`.

---

## 10. Logout

`authService.logout()` removes both localStorage keys:
```
localStorage.removeItem('auth_token')
localStorage.removeItem('auth_user')
```
The `DashboardHeaderComponent` calls this on the logout button click and then navigates to `/login`.  
After logout, both `authGuard` and `roleGuard` will redirect any protected route attempt back to `/login`.

---

## 11. Rules for Agents

> Read carefully before making any change.

1. **Never create a new component if one already exists.** Check the folder structure above first. Rename or repurpose the existing component instead.

2. **Never use NgModule.** All components are standalone. Use `imports: []` in the `@Component` decorator.

3. **Never put header/footer in `AppComponent`.** The root component only renders `<router-outlet>`. Layout is handled by shell components (`PublicLayoutComponent`, `DashboardLayoutComponent`, `AdminLayoutComponent`).

4. **Always use `RouterModule`** (not individual `RouterLink`/`RouterLinkActive`) in standalone component `imports` when the template uses router directives.

5. **Guards must be chained correctly:** `canActivate: [authGuard, roleGuard('ROLE')]`. Never apply `roleGuard` without `authGuard` preceding it on the same route or parent route.

6. **All localStorage access must be SSR-safe.** Wrap with `isPlatformBrowser(this.platformId)`. Inject `PLATFORM_ID` via `@Inject(PLATFORM_ID)`.

7. **Nav items live in nav config files**, not in components. Add new nav entries to the relevant `*-nav.ts` file. The layout components pick them up automatically.

8. **Models live in `core/models/`.** Do not re-declare interfaces inline in services or components.

9. **The `DashboardLayoutComponent` resolves nav once in the constructor** based on role. Do not add role-checking logic inside `DashboardHeaderComponent` or `SidebarComponent` — they are purely presentational and receive data via `@Input()`.

10. **When adding a new role's dashboard:**
    - Create a `*-nav.ts` file with the nav items
    - Create a layout component (or reuse `DashboardLayoutComponent` if the shell is the same)
    - Add routes to `app.routes.ts` with `canActivate: [authGuard, roleGuard('NEW_ROLE')]`
    - Add the redirect case to `login.component.ts` and `role.guard.ts`

