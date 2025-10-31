import { Component, inject, signal, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '../../../core/models/user.model';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private http = inject(HttpClient);

  healthStatus = signal<'healthy' | 'unhealthy'>('unhealthy');
  private intervalId: any;

  // Use computed for reactive role checks
  canAccessSettings = computed(() =>
    this.authService.hasAnyRole([UserRole.ADMIN, UserRole.MANAGER])
  );

  isAdmin = computed(() => {
    const user = this.authService.currentUser();
    const hasAdminRole = this.authService.hasRole(UserRole.ADMIN);

    // Debug logging
    console.log('🔍 Sidebar - Current user:', user);
    console.log('🔍 Sidebar - User role:', user?.role);
    console.log('🔍 Sidebar - UserRole.ADMIN:', UserRole.ADMIN);
    console.log('🔍 Sidebar - isAdmin:', hasAdminRole);

    return hasAdminRole;
  });

  ngOnInit() {
    this.checkHealth();
    // Check health every 30 seconds
    this.intervalId = setInterval(() => this.checkHealth(), 30000);
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private checkHealth() {
    const token = this.authService.authState().token;
    const headers = token
      ? new HttpHeaders({
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        })
      : new HttpHeaders({
          'Content-Type': 'application/json',
        });

    this.http
      .get(`${environment.apiUrl}/health/ping`, {
        headers,
        responseType: 'text',
      })
      .subscribe({
        next: (response) => {
          console.log('Health check success:', response);
          this.healthStatus.set('healthy');
        },
        error: (error) => {
          console.error('Health check error:', error);
          console.error('Error status:', error.status);
          console.error('Error message:', error.message);
          this.healthStatus.set('unhealthy');
        },
      });
  }
}
