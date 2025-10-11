import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../core/services/data';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmationService } from '../../core/services/confirmation.service';
import { Cache } from '../../core/models/cache.model';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  private dataService = inject(DataService);
  private notificationService = inject(NotificationService);
  private confirmationService = inject(ConfirmationService);

  metrics = signal({
    activeCaches: 0,
    totalItems: 0,
    hitRatio: '0%',
  });

  logs = signal<string[]>([]);
  caches = signal<Cache[]>([]);
  clearingCache = signal<string | null>(null);
  isLoading = signal(false);

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);
    
    // Load services to compute metrics
    this.dataService.getServices().subscribe({
      next: () => {
        this.updateMetrics();
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });

    // Get logs
    this.logs.set(this.dataService.getLogs());
  }

  updateMetrics() {
    const newMetrics = this.dataService.getDashboardMetrics();
    this.metrics.set(newMetrics);
  }

  async clearCache(cache: Cache) {
    const confirmed = await this.confirmationService.confirm({
      title: 'Clear Cache',
      message: `Are you sure you want to clear the cache "${cache.name}"? This action cannot be undone.`,
      confirmText: 'Clear Cache',
      cancelText: 'Cancel',
      type: 'warning',
    });

    if (!confirmed) return;

    this.clearingCache.set(cache.name);

    this.dataService.clearCache(cache.serviceId, cache.name).subscribe({
      next: () => {
        // Reload caches after clearing
        this.loadData();
        this.clearingCache.set(null);
      },
      error: () => {
        this.clearingCache.set(null);
      },
    });
  }

  // Demo methods for testing notifications
  testSuccessNotification() {
    this.notificationService.showCreateSuccess('Test Service');
  }

  testErrorNotification() {
    this.notificationService.showCreateError('Test Service', 'Connection timeout occurred');
  }

  testWarningNotification() {
    this.notificationService.showWarning(
      'System Warning',
      'Cache memory usage is above 80%',
      'Warning'
    );
  }

  testInfoNotification() {
    this.notificationService.showInfo(
      'System Info',
      'Maintenance window scheduled for tomorrow at 2 AM',
      'Info'
    );
  }

  // Demo methods for testing confirmation modal
  async testDeleteConfirmation() {
    const confirmed = await this.confirmationService.confirmDelete('Test Record');
    if (confirmed) {
      this.notificationService.showDeleteSuccess('Test Record');
    }
  }

  async testWarningConfirmation() {
    const confirmed = await this.confirmationService.confirmWarning({
      title: 'Clear Cache',
      message:
        'Are you sure you want to clear all cached data? This will affect system performance temporarily.',
      confirmText: 'Clear Cache',
      cancelText: 'Keep Cache',
    });
    if (confirmed) {
      this.notificationService.showInfo(
        'Cache Cleared',
        'All cached data has been cleared successfully'
      );
    }
  }

  async testInfoConfirmation() {
    const confirmed = await this.confirmationService.confirmInfo({
      title: 'System Update',
      message: 'A new system update is available. Would you like to proceed with the update?',
      confirmText: 'Update Now',
      cancelText: 'Later',
    });
    if (confirmed) {
      this.notificationService.showInfo('Update Started', 'System update has been initiated');
    }
  }
}
