import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DataService } from '../../../core/services/data';
import { Service } from '../../../core/models/service.model';
import { Agent } from '../../../core/models/agent.model';
import { AgentResponse } from '../../../core/models/agent-response.model';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { Modal } from '../../../shared/components/modal/modal';

@Component({
  selector: 'app-service-detail',
  imports: [CommonModule, Pagination, Modal],
  templateUrl: './service-detail.html',
  styleUrl: './service-detail.css',
})
export class ServiceDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public dataService = inject(DataService);
  private confirmationService = inject(ConfirmationService);

  service = signal<Service | null>(null);
  agentResponses = signal<AgentResponse[]>([]);
  currentPage = signal(1);
  itemsPerPage = 10;
  isFlushingCaches = signal(false);
  removingCache = signal<string | null>(null);
  isLoading = signal(false);
  isLoadingCaches = signal(false);
  expandedParameters = signal<Set<number>>(new Set());

  // Agent status
  serviceAgent = signal<Agent | null>(null);
  agentStatus = signal<'online' | 'offline' | 'loading'>('loading');
  agentStatusMessage = signal<string>('');

  // Cache detail modal
  cacheDetailModalOpen = signal(false);
  cacheDetailData = signal<any>(null);
  cacheDetailLoading = signal(false);
  currentCacheKey = signal<string>('');
  currentAgentResponseId = signal<string>('');

  // Keys panel modal
  keysPanelModalOpen = signal(false);

  // Track if cache detail was opened from keys panel
  cacheDetailFromKeysPanel = signal(false);

  // Computed properties
  totalPages = computed(() => Math.ceil(this.agentResponses().length / this.itemsPerPage));

  allCacheKeys = computed(() => {
    const keys: Array<{ key: string; agentResponseId: string }> = [];
    this.agentResponses().forEach((response) => {
      if (response.cacheKeys && response.cacheKeys.length > 0) {
        response.cacheKeys.forEach((key) => {
          keys.push({
            key: key,
            agentResponseId: response.id,
          });
        });
      }
    });
    return keys;
  });

  totalCacheKeys = computed(() => this.allCacheKeys().length);

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

    return 'primitive';
  });

  paginatedAgentResponses = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.agentResponses().slice(start, end);
  });

  serviceSnapshot = computed(() => {
    const svc = this.service();
    const responses = this.agentResponses();
    if (!svc) return {};

    return {
      serviceId: svc.id,
      service: svc,
      agentResponses: responses,
      totalAgents: responses.length,
      generatedAt: new Date().toISOString(),
    };
  });

  ngOnInit() {
    const serviceId = this.route.snapshot.paramMap.get('id');
    if (serviceId) {
      this.loadServiceData(serviceId);
    }
  }

  private loadServiceData(serviceId: string) {
    this.isLoading.set(true);

    // Load services first to get the service details
    this.dataService.getServices().subscribe({
      next: (services) => {
        const foundService = services.find(
          (s) =>
            s.id === serviceId ||
            s.serviceId === serviceId ||
            this.dataService.toSlug(s.name) === serviceId
        );

        if (foundService) {
          this.service.set(foundService);
          this.isLoading.set(false);

          // Load agent information if service has agentId
          if (foundService.agentId) {
            this.loadAgentStatus(foundService.agentId);
          }

          // Load agent responses for this service
          this.isLoadingCaches.set(true);
          this.dataService.getCachesForService(serviceId).subscribe({
            next: (responses) => {
              this.agentResponses.set(responses as AgentResponse[]);
              this.isLoadingCaches.set(false);
            },
            error: () => {
              this.isLoadingCaches.set(false);
            },
          });
        } else {
          // Service not found, redirect back to services list
          this.isLoading.set(false);
          this.router.navigate(['/services']);
        }
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  private loadAgentStatus(agentId: string) {
    this.agentStatus.set('loading');

    // Get agent details
    const agents = this.dataService.getAgents();
    const agent = agents.find((a) => a.id === agentId);

    if (agent) {
      this.serviceAgent.set(agent);
    }

    // Ping agent to get current status
    this.dataService.pingAgent(agentId).subscribe({
      next: (result) => {
        this.agentStatus.set(result.status);
        this.agentStatusMessage.set(result.message || '');

        // Get the updated agent from dataService after ping
        const updatedAgents = this.dataService.getAgents();
        const updatedAgent = updatedAgents.find((a) => a.id === agentId);

        if (updatedAgent) {
          this.serviceAgent.set(updatedAgent);
        }
      },
      error: (error) => {
        this.agentStatus.set('offline');
        this.agentStatusMessage.set(error.message || 'Failed to ping agent');

        // Get the updated agent from dataService after ping error
        const updatedAgents = this.dataService.getAgents();
        const updatedAgent = updatedAgents.find((a) => a.id === agentId);

        if (updatedAgent) {
          this.serviceAgent.set(updatedAgent);
        }
      },
    });
  }

  refreshAgentStatus() {
    const service = this.service();
    if (service?.agentId) {
      this.loadAgentStatus(service.agentId);
    }
  }

  goBack() {
    this.router.navigate(['/services']);
  }

  copyJSON() {
    const json = JSON.stringify(this.serviceSnapshot(), null, 2);
    navigator.clipboard.writeText(json).then(() => {
      // You could add a toast notification here
      console.log('JSON copied to clipboard');
    });
  }

  downloadJSON() {
    const json = JSON.stringify(this.serviceSnapshot(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `service-${this.service()?.id || 'unknown'}-snapshot.json`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  onPageChange(page: number) {
    this.currentPage.set(page);
  }

  getServiceDetails() {
    const svc = this.service();
    if (!svc) return [];

    return [
      { label: 'Service ID', value: svc.id || svc.serviceId || '—' },
      { label: 'Name', value: svc.name || '—' },
      { label: 'Status', value: svc.status || '—' },
      { label: 'Instances', value: svc.instances?.toString() || '—' },
      { label: 'Last Seen', value: svc.lastSeen || svc.lastSeenText || '—' },
    ].filter((item) => item.value !== '—');
  }

  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'healthy':
        return 'status-healthy';
      case 'degraded':
        return 'status-degraded';
      case 'down':
        return 'status-down';
      case 'maintenance':
        return 'status-maintenance';
      default:
        return '';
    }
  }

  async flushAllCaches() {
    const service = this.service();
    if (!service) return;

    // Count total cache keys across all agent responses
    const totalCaches = this.agentResponses().reduce(
      (sum, response) => sum + (response.cacheKeys?.length || 0),
      0
    );

    const confirmed = await this.confirmationService.confirm({
      title: 'Flush All Caches',
      message: `Are you sure you want to flush all ${totalCaches} cache(s) for ${service.name}? This action cannot be undone.`,
      confirmText: 'Flush All',
      cancelText: 'Cancel',
      type: 'warning',
    });

    if (!confirmed) return;

    this.isFlushingCaches.set(true);

    this.dataService.flushServiceCaches(service.id!).subscribe({
      next: () => {
        // Reload caches after flush
        this.loadAgentResponsesForService(service.id!);
        this.isFlushingCaches.set(false);
      },
      error: () => {
        this.isFlushingCaches.set(false);
      },
    });
  }

  private loadAgentResponsesForService(serviceId: string) {
    this.isLoadingCaches.set(true);

    this.dataService.getCachesForService(serviceId).subscribe({
      next: (responses) => {
        this.agentResponses.set(responses as AgentResponse[]);
        this.isLoadingCaches.set(false);
      },
      error: () => {
        this.isLoadingCaches.set(false);
      },
    });
  }

  async removeCacheByKey(cacheKey: string) {
    const service = this.service();
    if (!service) return;

    const confirmed = await this.confirmationService.confirm({
      title: 'Remove Cache',
      message: `Are you sure you want to remove the cache "${cacheKey}"? This action cannot be undone.`,
      confirmText: 'Remove',
      cancelText: 'Cancel',
      type: 'warning',
    });

    if (!confirmed) return;

    this.removingCache.set(cacheKey);

    this.dataService.clearCache(service.id!, cacheKey).subscribe({
      next: () => {
        // Reload caches after removal
        this.loadAgentResponsesForService(service.id!);
        this.removingCache.set(null);
      },
      error: () => {
        this.removingCache.set(null);
      },
    });
  }

  toggleParametersExpanded(index: number) {
    const expanded = new Set(this.expandedParameters());
    if (expanded.has(index)) {
      expanded.delete(index);
    } else {
      expanded.add(index);
    }
    this.expandedParameters.set(expanded);
  }

  isParametersExpanded(index: number): boolean {
    return this.expandedParameters().has(index);
  }

  openCacheDetail(cacheKey: string, agentResponseId: string) {
    const service = this.service();
    if (!service) return;

    // Track if we're coming from the keys panel
    const fromKeysPanel = this.keysPanelModalOpen();
    this.cacheDetailFromKeysPanel.set(fromKeysPanel);

    // Close the keys panel if it's open
    if (fromKeysPanel) {
      this.keysPanelModalOpen.set(false);
    }

    this.currentCacheKey.set(cacheKey);
    this.currentAgentResponseId.set(agentResponseId);
    this.cacheDetailModalOpen.set(true);
    this.cacheDetailLoading.set(true);
    this.cacheDetailData.set(null);

    this.dataService.getCacheByKey(service.id!, cacheKey, agentResponseId).subscribe({
      next: (data) => {
        this.cacheDetailData.set(data);
        this.cacheDetailLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load cache details:', error);
        this.cacheDetailLoading.set(false);
      },
    });
  }

  closeCacheDetailModal() {
    this.cacheDetailModalOpen.set(false);
    this.cacheDetailData.set(null);
    this.currentCacheKey.set('');
    this.currentAgentResponseId.set('');

    // Restore the keys panel if we came from there
    if (this.cacheDetailFromKeysPanel()) {
      this.keysPanelModalOpen.set(true);
      this.cacheDetailFromKeysPanel.set(false);
    }
  }

  copyCacheDetailJSON() {
    const formatted = this.formattedCacheDetail();
    navigator.clipboard.writeText(formatted).then(() => {
      console.log('Cache detail copied to clipboard');
    });
  }

  openKeysPanel() {
    this.keysPanelModalOpen.set(true);
  }

  closeKeysPanel() {
    this.keysPanelModalOpen.set(false);
  }
}
