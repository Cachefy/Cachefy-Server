import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../../core/services/data';
import { AuthService } from '../../../core/services/auth.service';
import { User, UserRole } from '../../../core/models/user.model';
import { NotificationService } from '../../../core/services/notification.service';
import { Modal } from '../../../shared/components/modal/modal';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, Modal],
  templateUrl: './user-detail.html',
  styleUrl: './user-detail.css',
})
export class UserDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dataService = inject(DataService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);

  user = signal<User | null>(null);
  isNew = signal(false);
  isLoading = signal(false);
  isSaving = signal(false);
  isServiceModalOpen = signal(false);
  isLoadingServiceNames = signal(false);

  allServiceNames = signal<string[]>([]);
  selectedServiceName = signal<string>('');

  // Form data - only fields supported by the API
  formData = signal({
    email: '',
    role: 'User' as string,
    password: '',
    confirmPassword: '',
  });

  userRoles = [
    { value: UserRole.ADMIN, label: 'Administrator' },
    { value: UserRole.MANAGER, label: 'Manager' },
    { value: UserRole.USER, label: 'User' },
  ];

  // Computed - directly from user model linkedServiceNames
  linkedServiceNames = computed(() => {
    const user = this.user();
    return user?.linkedServiceNames || [];
  });

  availableServiceNames = computed(() => {
    const user = this.user();
    const serviceNames = this.allServiceNames();
    if (!user) return serviceNames;

    // Filter out services that are already linked
    const linkedNames = user.linkedServiceNames || [];
    return serviceNames.filter((name) => !linkedNames.includes(name));
  });
  canSave = computed(() => {
    const form = this.formData();
    const isNew = this.isNew();

    // Email is required
    if (!form.email || !form.email.includes('@')) {
      return false;
    }

    // Password is required for new users
    if (isNew && (!form.password || form.password.length < 6)) {
      return false;
    }

    // Password confirmation must match
    if (isNew && form.password !== form.confirmPassword) {
      return false;
    }

    return true;
  });

  ngOnInit() {
    // Check if current user is admin
    if (!this.authService.hasRole(UserRole.ADMIN)) {
      this.notificationService.showError('Access Denied', 'Only administrators can manage users.');
      this.router.navigate(['/dashboard']);
      return;
    }

    const userId = this.route.snapshot.paramMap.get('id');

    if (userId === 'new') {
      this.isNew.set(true);
    } else if (userId) {
      this.loadUser(userId);
    }
  }

  loadUser(userId: string) {
    this.isLoading.set(true);

    this.dataService.getUserById(userId).subscribe({
      next: (user) => {
        console.log('📋 Loaded user:', user);
        console.log('👤 User role from API:', user.role);
        console.log('📊 User roles options:', this.userRoles);

        this.user.set(user);
        // Keep the role as-is from API (with uppercase first character)
        const role = user.role || 'User';
        console.log('✅ Role:', role);

        this.formData.set({
          email: user.email,
          role: role,
          password: '',
          confirmPassword: '',
        });

        console.log('📝 Form data after set:', this.formData());
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load user:', error);
        this.isLoading.set(false);
        this.router.navigate(['/users']);
      },
    });
  }

  loadServicesForModal() {
    console.log('🔍 loadServicesForModal called');
    console.log('📊 Current allServiceNames:', this.allServiceNames());
    console.log('📊 Current isLoadingServiceNames:', this.isLoadingServiceNames());

    this.isLoadingServiceNames.set(true);
    console.log('⏳ Set loading to TRUE');

    this.dataService.getServiceNames().subscribe({
      next: (serviceNames) => {
        console.log('✅ API SUCCESS - Received service names:', serviceNames);
        console.log('✅ Service names count:', serviceNames.length);
        console.log('✅ Service names array:', JSON.stringify(serviceNames));

        this.allServiceNames.set(serviceNames);
        console.log('✅ Set allServiceNames signal');

        this.isLoadingServiceNames.set(false);
        console.log('✅ Set loading to FALSE');

        // Log computed values after update
        setTimeout(() => {
          console.log('📊 After update - allServiceNames():', this.allServiceNames());
          console.log('📊 After update - availableServiceNames():', this.availableServiceNames());
          console.log('📊 After update - isLoadingServiceNames():', this.isLoadingServiceNames());
        }, 100);
      },
      error: (error) => {
        console.error('❌ Failed to load service names:', error);
        this.notificationService.showError('Error', 'Failed to load service names');
        this.isLoadingServiceNames.set(false);
      },
    });
  }

  async saveUser() {
    if (!this.canSave()) {
      return;
    }

    this.isSaving.set(true);
    const form = this.formData();
    const currentUser = this.user();

    // Only send fields that the API accepts
    const userData: Partial<User> & { password?: string } = {
      email: form.email,
      role: form.role,
    };

    if (currentUser?.id) {
      userData.id = currentUser.id;
    }

    // Include password only if provided (for new users or password change)
    if (form.password) {
      userData.password = form.password;
    }

    this.dataService.saveUser(userData).subscribe({
      next: (savedUser) => {
        this.isSaving.set(false);

        if (this.isNew()) {
          this.isNew.set(false);
          this.user.set(savedUser);
          this.router.navigate(['/users', savedUser.id]);
        } else {
          // Update the current user with saved data
          this.user.set(savedUser);
        }
      },
      error: (error) => {
        console.error('Failed to save user:', error);
        this.isSaving.set(false);
      },
    });
  }

  onServiceSelect(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    this.selectedServiceName.set(selectElement.value);
  }

  linkService() {
    const serviceName = this.selectedServiceName();
    const user = this.user();

    if (!serviceName || !user) {
      return;
    }

    // Add service name to the existing list
    const updatedServiceNames = [...(user.linkedServiceNames || []), serviceName];

    // Update user with new service list
    this.dataService.saveUser({ id: user.id, linkedServiceNames: updatedServiceNames }).subscribe({
      next: (updatedUser) => {
        this.user.set(updatedUser);
        this.selectedServiceName.set('');
        this.notificationService.showSuccess(
          'Service Linked',
          'Service access granted successfully'
        );
      },
      error: (error) => {
        console.error('Failed to link service:', error);
        this.notificationService.showError('Error', 'Failed to link service');
      },
    });
  }

  unlinkService(serviceName: string) {
    const user = this.user();

    if (!user) {
      return;
    }

    // Remove service name from the list
    const updatedServiceNames = (user.linkedServiceNames || []).filter(
      (name) => name !== serviceName
    );

    // Update user with new service list
    this.dataService.saveUser({ id: user.id, linkedServiceNames: updatedServiceNames }).subscribe({
      next: (updatedUser) => {
        this.user.set(updatedUser);
        this.notificationService.showSuccess(
          'Service Unlinked',
          'Service access revoked successfully'
        );
      },
      error: (error) => {
        console.error('Failed to unlink service:', error);
        this.notificationService.showError('Error', 'Failed to unlink service');
      },
    });
  }

  goBack() {
    this.router.navigate(['/users']);
  }

  clearForm() {
    this.formData.set({
      email: '',
      role: 'User',
      password: '',
      confirmPassword: '',
    });
  }

  openServiceModal() {
    console.log('Opening service modal...');
    this.loadServicesForModal();
    this.isServiceModalOpen.set(true);
  }

  closeServiceModal() {
    this.isServiceModalOpen.set(false);
    this.selectedServiceName.set('');
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

  // Form update helpers
  updateFormField(field: string, value: any) {
    this.formData.update((current) => ({ ...current, [field]: value }));
  }
}
