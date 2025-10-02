import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DataService } from '../../../core/services/data';
import { Service } from '../../../core/models/service.model';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-services-list',
  standalone: true,
  imports: [CommonModule, Pagination],
  templateUrl: './services-list.html',
  styleUrl: './services-list.css',
})
export class ServicesList implements OnInit {
  private dataService = inject(DataService);
  private router = inject(Router);
  private notificationService = inject(NotificationService);

  services = signal<Service[]>([]);
  currentPage = signal(1);
  pageSize = 6;

  get paginatedServices() {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.services().slice(start, start + this.pageSize);
  }

  get totalPages() {
    return Math.ceil(this.services().length / this.pageSize) || 1;
  }

  ngOnInit() {
    this.loadServices();
  }

  loadServices() {
    this.dataService.getServices().subscribe({
      next: (services) => {
        this.services.set(services);
      },
      error: (error) => {
        console.error('Failed to load services:', error);
        this.notificationService.showError('Failed to load services', error.message);
      },
    });
  }

  onPageChange(page: number) {
    this.currentPage.set(page);
  }

  viewServiceDetails(service: Service) {
    const id = service.id || service.serviceId || this.dataService.toSlug(service.name);
    this.router.navigate(['/service', id]);
  }

  pingService(service: Service) {
    this.dataService.addLog(`Ping initiated for service: ${service.name}`);
    this.notificationService.showInfo('Ping Service', `Pinging ${service.name}...`);
  }
}
