import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DataService } from '../../../core/services/data';
import { AuthService } from '../../../core/services/auth.service';
import { User, UserRole } from '../../../core/models/user.model';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule, Pagination],
  templateUrl: './users-list.html',
  styleUrl: './users-list.css',
})
export class UsersList implements OnInit {
  private dataService = inject(DataService);
  authService = inject(AuthService); // Public for template access
  private router = inject(Router);
  private notificationService = inject(NotificationService);

  users = signal<User[]>([]);
  currentPage = signal(1);
  pageSize = 10;
  isLoading = signal(false);
  searchTerm = signal('');

  // Computed properties
  filteredUsers = computed(() => {
    const search = this.searchTerm().toLowerCase();
    const allUsers = this.users();

    if (!search) {
      return allUsers;
    }

    return allUsers.filter(
      (user) =>
        user.email.toLowerCase().includes(search) || user.role.toLowerCase().includes(search)
    );
  });

  paginatedUsers = computed(() => {
    const filtered = this.filteredUsers();
    const page = this.currentPage();
    const startIndex = (page - 1) * this.pageSize;
    return filtered.slice(startIndex, startIndex + this.pageSize);
  });

  totalPages = computed(() => {
    return Math.ceil(this.filteredUsers().length / this.pageSize) || 1;
  });

  ngOnInit() {
    // Check if current user is admin
    if (!this.authService.hasRole(UserRole.ADMIN)) {
      this.notificationService.showError(
        'Access Denied',
        'Only administrators can access user management.'
      );
      this.router.navigate(['/dashboard']);
      return;
    }

    this.loadUsers();
  }

  loadUsers() {
    this.isLoading.set(true);

    this.dataService.getUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load users:', error);
        this.notificationService.showError('Failed to load users', error.message);
        this.isLoading.set(false);
      },
    });
  }

  onPageChange(page: number) {
    this.currentPage.set(page);
  }

  onSearchChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
    this.currentPage.set(1); // Reset to first page when searching
  }

  viewUserDetails(user: User) {
    this.router.navigate(['/users', user.id]);
  }

  createNewUser() {
    this.router.navigate(['/users', 'new']);
  }

  async deleteUser(user: User) {
    if (user.id === this.authService.currentUser()?.id) {
      this.notificationService.showWarning('Cannot Delete', 'You cannot delete your own account.');
      return;
    }

    await this.dataService.deleteUser(user.id);
    this.loadUsers();
  }

  getRoleBadgeClass(role: string): string {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'role-badge role-admin';
      case 'manager':
        return 'role-badge role-manager';
      case 'user':
        return 'role-badge role-user';
      default:
        return 'role-badge';
    }
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString();
  }
}
