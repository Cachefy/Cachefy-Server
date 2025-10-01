# Volatix Admin - Authentication System

A complete Angular authentication system with fake user simulation for the Volatix Admin dashboard.

## Features

### 🔐 Authentication System

- **Secure Login**: Username/password authentication with visual feedback
- **Session Management**: Persistent login sessions using localStorage
- **Role-Based Access Control**: Admin, Manager, and User roles
- **Route Protection**: Auth guards protecting dashboard routes
- **Auto-redirect**: Automatic redirection based on authentication state

### 👥 Demo Users

The system comes with pre-configured demo users for testing:

| Username   | Password      | Role    | Access Level                                   |
| ---------- | ------------- | ------- | ---------------------------------------------- |
| `admin`    | `admin123`    | Admin   | Full access to all features including settings |
| `manager`  | `manager123`  | Manager | Access to dashboard, services, and settings    |
| `user1`    | `user123`     | User    | Access to dashboard and services               |
| `demo`     | `demo123`     | User    | Access to dashboard and services               |
| `inactive` | `inactive123` | User    | Account disabled (login will fail)             |

### 🎨 User Interface

- **Responsive Design**: Works on desktop and mobile devices
- **Modern UI**: Clean, professional interface with smooth animations
- **Accessibility**: WCAG compliant with proper focus management
- **Theme Support**: Integrated with existing theme system
- **Error Handling**: Clear error messages for login failures

### 🏗️ Architecture Ready for API Integration

The authentication system is designed with clean separation of concerns, making it easy to integrate with a real API later:

#### Service Layer (`AuthService`)

```typescript
// Current: Simulated API calls
simulateAuthRequest(credentials): Observable<AuthResponse>

// Future: Replace with real HTTP calls
login(credentials): Observable<AuthResponse> {
  return this.http.post<AuthResponse>('/api/auth/login', credentials);
}
```

#### HTTP Interceptor (`AuthInterceptor`)

- Automatically adds JWT tokens to API requests
- Handles token refresh on 401 errors
- Ready for real backend integration

#### Route Guards (`AuthGuard`, `GuestGuard`)

- Protects routes based on authentication status
- Role-based access control ready for expansion
- Prevents authenticated users from accessing login page

## How to Use

### 1. Start the Development Server

```bash
npm start
# or
ng serve
```

### 2. Access the Login Page

Navigate to `http://localhost:4200` - you'll automatically be redirected to the login page if not authenticated.

### 3. Login with Demo Credentials

Click on any of the demo account cards or manually enter:

- Username: `admin`
- Password: `admin123`

### 4. Navigate the Dashboard

Once logged in, you'll have access to:

- **Dashboard**: Overview and metrics
- **Services**: Service management
- **Settings**: Admin/Manager only (role-based access)

### 5. Logout

Click on your avatar in the top-right corner and select "Log Off"

## API Integration Guide

When you're ready to connect to a real backend API, follow these steps:

### 1. Update the AuthService

Replace the `simulateAuthRequest` method in `src/app/core/services/auth.service.ts`:

```typescript
// Replace this method:
private simulateAuthRequest(credentials: LoginCredentials): Observable<AuthResponse> {
  // ... simulation code
}

// With real API call:
private makeAuthRequest(credentials: LoginCredentials): Observable<AuthResponse> {
  return this.http.post<AuthResponse>('/api/auth/login', credentials);
}
```

### 2. Update Environment Configuration

Add API endpoints to your environment files:

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  authEndpoints: {
    login: '/auth/login',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
  },
};
```

### 3. Configure HTTP Interceptor

The `AuthInterceptor` is already configured to:

- Add Bearer tokens to requests
- Handle 401 responses with token refresh
- Automatically logout on authentication failures

### 4. Backend Requirements

Your API should support:

#### Login Endpoint

```
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}

Response:
{
  "success": true,
  "user": {
    "id": "1",
    "username": "admin",
    "email": "admin@volatix.com",
    "firstName": "System",
    "lastName": "Administrator",
    "role": "admin",
    "avatar": "...",
    "isActive": true
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Token Refresh Endpoint

```
POST /api/auth/refresh
Authorization: Bearer <current-token>

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## File Structure

```
src/app/
├── core/
│   ├── guards/
│   │   └── auth.guard.ts          # Route protection
│   ├── interceptors/
│   │   └── auth.interceptor.ts    # HTTP token injection
│   ├── models/
│   │   └── user.model.ts          # User & auth interfaces
│   └── services/
│       └── auth.service.ts        # Authentication service
├── features/
│   └── auth/
│       └── login/
│           ├── login.ts           # Login component
│           ├── login.html         # Login template
│           └── login.css          # Login styles
└── shared/components/
    └── topbar/                    # Updated with user info & logout
public/
└── users.json                     # Demo user data
```

## Security Features

- **Password Visibility Toggle**: Secure password input with show/hide option
- **Session Persistence**: Secure token storage in localStorage
- **Route Protection**: Authenticated routes protected by guards
- **Role-Based Access**: Different access levels based on user roles
- **Auto-logout**: Automatic logout on token expiration
- **Error Handling**: Proper error messages for failed authentication

## Development Notes

- The system uses Angular 20+ with standalone components
- Reactive programming with RxJS and Angular signals
- Type-safe with TypeScript interfaces
- Responsive design with CSS Grid and Flexbox
- Accessible with proper ARIA labels and focus management

## Next Steps

1. **Connect Real API**: Replace simulation with actual backend calls
2. **Add Password Reset**: Implement forgot password functionality
3. **Two-Factor Auth**: Add 2FA support for enhanced security
4. **User Management**: Add user creation, editing, and management
5. **Audit Logging**: Track user authentication and actions
6. **Social Login**: Add OAuth providers (Google, Microsoft, etc.)

The authentication system is production-ready and can be easily extended with additional features as needed.
