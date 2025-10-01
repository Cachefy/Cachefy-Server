import { Component, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LoginCredentials } from '../../../core/models/user.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  // Form state
  credentials = signal<LoginCredentials>({
    username: '',
    password: '',
  });

  // UI state
  showPassword = signal(false);
  rememberMe = signal(false);

  // Demo credentials for easy testing
  demoCredentials = [
    { username: 'admin', password: 'admin123', role: 'Admin' },
    { username: 'manager', password: 'manager123', role: 'Manager' },
    { username: 'user1', password: 'user123', role: 'User' },
    { username: 'demo', password: 'demo123', role: 'Demo User' },
  ];

  constructor(private authService: AuthService, private router: Router) {
    // Auto-redirect if already authenticated
    effect(() => {
      if (this.authService.isAuthenticated()) {
        this.router.navigate(['/dashboard']);
      }
    });
  }

  // Computed properties from auth service
  get isLoading() {
    return this.authService.isLoading();
  }

  get error() {
    return this.authService.authError();
  }

  get hasError() {
    return !!this.error;
  }

  onSubmit(): void {
    if (!this.credentials().username || !this.credentials().password) {
      return;
    }

    this.authService.clearError();

    this.authService.login(this.credentials()).subscribe({
      next: (response) => {
        if (response.success) {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (error) => {
        console.error('Login failed:', error);
      },
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword.set(!this.showPassword());
  }

  fillDemoCredentials(demo: any): void {
    this.credentials.set({
      username: demo.username,
      password: demo.password,
    });
  }

  onUsernameChange(value: string): void {
    this.credentials.update((creds) => ({ ...creds, username: value }));
  }

  onPasswordChange(value: string): void {
    this.credentials.update((creds) => ({ ...creds, password: value }));
  }

  clearError(): void {
    this.authService.clearError();
  }
}
