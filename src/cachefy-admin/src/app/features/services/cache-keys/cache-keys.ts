import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DataService } from '../../../core/services/data';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { Modal } from '../../../shared/components/modal/modal';

@Component({
  selector: 'app-cache-keys',
  imports: [CommonModule, Modal],
  templateUrl: './cache-keys.html',
  styleUrl: './cache-keys.css',
})
export class CacheKeys implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dataService = inject(DataService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private confirmationService = inject(ConfirmationService);

  serviceId = signal<string>('');
  serviceName = signal<string>('');
  agentResponseId = signal<string>('');
  cacheKeys = signal<Array<{ key: string; agentResponseId: string }>>([]);
  isLoading = signal(false);
  searchTerm = signal('');
  selectedCacheKey = signal<string | null>(null);
  selectedAgentResponseId = signal<string | null>(null);
  cacheDetailData = signal<any>(null);
  isLoadingDetail = signal(false);
  removingCache = signal<string | null>(null);

  formattedCacheDetail = computed(() => {
    const data = this.cacheDetailData();
    if (!data) return '';

    // If it's already a string, check if it's a JSON string
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        return JSON.stringify(parsed, null, 2);
      } catch {
        // Not valid JSON, return as is
        return data;
      }
    }

    // If it's an object or array, stringify with formatting
    if (typeof data === 'object') {
      return JSON.stringify(data, null, 2);
    }

    // For primitives (number, boolean, etc.), convert to string
    return String(data);
  });

  cacheDetailType = computed(() => {
    const data = this.cacheDetailData();
    if (!data) return 'empty';

    if (typeof data === 'string') {
      try {
        JSON.parse(data);
        return 'json';
      } catch {
        return 'string';
      }
    }

    if (typeof data === 'object') {
      return Array.isArray(data) ? 'array' : 'json';
    }

    return typeof data;
  });

  ngOnInit() {
    this.route.params.subscribe((params) => {
      this.serviceId.set(params['id']);
      this.loadCacheKeys();
    });

    this.route.queryParams.subscribe((params) => {
      if (params['serviceName']) {
        this.serviceName.set(params['serviceName']);
      }
      if (params['agentResponseId']) {
        this.agentResponseId.set(params['agentResponseId']);
      }
    });
  }

  loadCacheKeys() {
    this.isLoading.set(true);
    const serviceId = this.serviceId();

    this.dataService.getCachesForService(serviceId).subscribe({
      next: (responses: any[]) => {
        const keys: Array<{ key: string; agentResponseId: string }> = [];
        responses.forEach((response) => {
          // Filter by agentResponseId if provided
          if (this.agentResponseId() && response.id !== this.agentResponseId()) {
            return;
          }

          if (response.cacheKeys && response.cacheKeys.length > 0) {
            response.cacheKeys.forEach((key: string) => {
              keys.push({
                key: key,
                agentResponseId: response.id,
              });
            });
          }
        });
        this.cacheKeys.set(keys);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.notificationService.showError('Failed to load cache keys', error.message);
        this.isLoading.set(false);
      },
    });
  }

  filteredCacheKeys() {
    const search = this.searchTerm().toLowerCase();
    if (!search) {
      return this.cacheKeys();
    }
    return this.cacheKeys().filter((item) => item.key.toLowerCase().includes(search));
  }

  viewCacheDetail(key: string, agentResponseId: string) {
    this.selectedCacheKey.set(key);
    this.selectedAgentResponseId.set(agentResponseId);
    this.isLoadingDetail.set(true);

    this.dataService.getCacheByKey(this.serviceId(), key, agentResponseId).subscribe({
      next: (data) => {
        this.cacheDetailData.set(data);
        this.isLoadingDetail.set(false);
      },
      error: (error) => {
        this.notificationService.showError('Failed to load cache details', error.message);
        this.isLoadingDetail.set(false);
        this.selectedCacheKey.set(null);
        this.selectedAgentResponseId.set(null);
      },
    });
  }

  closeCacheDetail() {
    this.selectedCacheKey.set(null);
    this.selectedAgentResponseId.set(null);
    this.cacheDetailData.set(null);
  }

  copyCacheDetailJSON() {
    const formatted = this.formattedCacheDetail();
    navigator.clipboard.writeText(formatted).then(() => {
      this.notificationService.showSuccess('Copied!', 'Cache detail copied to clipboard');
    });
  }

  async removeCacheByKey(key: string) {
    const confirmed = await this.confirmationService.confirm({
      title: 'Remove Cache',
      message: `Are you sure you want to remove the cache "${key}"?<br><br><strong>This operation will delete this cache for all nodes.</strong>`,
      confirmText: 'Remove',
      cancelText: 'Cancel',
      type: 'warning',
    });

    if (!confirmed) return;

    this.removingCache.set(key);

    this.dataService.clearCache(this.serviceId(), key).subscribe({
      next: () => {
        // Reload cache keys after removal
        this.loadCacheKeys();
        this.removingCache.set(null);
        // Note: Success notification is already shown by the data service
      },
      error: () => {
        this.removingCache.set(null);
        // Note: Error notification is already shown by the data service
      },
    });
  }

  goBack() {
    this.router.navigate(['/service', this.serviceId()]);
  }

  formatValue(value: any): string {
    if (value === null || value === undefined) {
      return 'null';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  }
}
