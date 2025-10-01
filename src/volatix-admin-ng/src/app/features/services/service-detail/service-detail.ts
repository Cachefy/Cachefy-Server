import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DataService } from '../../../core/services/data';
import { Service } from '../../../core/models/service.model';
import { Cache } from '../../../core/models/cache.model';
import { Pagination } from '../../../shared/components/pagination/pagination';

@Component({
  selector: 'app-service-detail',
  imports: [CommonModule, Pagination],
  templateUrl: './service-detail.html',
  styleUrl: './service-detail.css',
})
export class ServiceDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public dataService = inject(DataService);

  service = signal<Service | null>(null);
  caches = signal<Cache[]>([]);
  currentPage = signal(1);
  itemsPerPage = 10;

  // Computed properties
  totalPages = computed(() => Math.ceil(this.caches().length / this.itemsPerPage));
  paginatedCaches = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.caches().slice(start, end);
  });

  serviceSnapshot = computed(() => {
    const svc = this.service();
    const cachesData = this.caches();
    if (!svc) return {};

    return {
      serviceId: svc.id,
      service: svc,
      caches: cachesData,
      totalCaches: cachesData.length,
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
    // Load services first to get the service details
    this.dataService.getServices().subscribe((services) => {
      const foundService = services.find(
        (s) =>
          s.id === serviceId ||
          s.serviceId === serviceId ||
          this.dataService.toSlug(s.name) === serviceId
      );

      if (foundService) {
        this.service.set(foundService);

        // Load caches for this service
        this.dataService.getCachesForService(serviceId).subscribe((caches) => {
          this.caches.set(caches);
        });
      } else {
        // Service not found, redirect back to services list
        this.router.navigate(['/services']);
      }
    });
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
}
