import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../../core/services/data';
import { Service } from '../../../core/models/service.model';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { Modal } from '../../../shared/components/modal/modal';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-services-list',
  standalone: true,
  imports: [CommonModule, FormsModule, Pagination, Modal],
  templateUrl: './services-list.html',
  styleUrl: './services-list.css',
})
export class ServicesList implements OnInit {
  private dataService = inject(DataService);
  private router = inject(Router);
  private confirmationService = inject(ConfirmationService);
  private notificationService = inject(NotificationService);

  services = signal<Service[]>([]);
  currentPage = signal(1);
  pageSize = 6;

  // Form state
  showServiceForm = signal(false);
  editingService = signal<Service | null>(null);
  serviceForm = {
    name: '',
    status: 'Healthy',
    instances: 1,
    url: '',
    version: '',
    description: '',
  };

  get paginatedServices() {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.services().slice(start, start + this.pageSize);
  }

  get totalPages() {
    return Math.ceil(this.services().length / this.pageSize) || 1;
  }

  get isEditing() {
    return this.editingService() !== null;
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

  // CRUD Operations

  openCreateForm() {
    this.editingService.set(null);
    this.serviceForm = {
      name: '',
      status: 'Healthy',
      instances: 1,
      url: '',
      version: '',
      description: '',
    };
    this.showServiceForm.set(true);
  }

  openEditForm(service: Service) {
    this.editingService.set(service);
    this.serviceForm = {
      name: service.name,
      status: service.status || 'Healthy',
      instances: service.instances || 1,
      url: (service as any).url || '',
      version: (service as any).version || '',
      description: (service as any).description || '',
    };
    this.showServiceForm.set(true);
  }

  closeForm() {
    this.showServiceForm.set(false);
    this.editingService.set(null);
    this.clearForm();
  }

  clearForm() {
    this.serviceForm = {
      name: '',
      status: 'Healthy',
      instances: 1,
      url: '',
      version: '',
      description: '',
    };
  }

  validateForm(): boolean {
    if (!this.serviceForm.name.trim()) {
      this.notificationService.showError('Validation Error', 'Service name is required');
      return false;
    }
    if (this.serviceForm.instances < 0) {
      this.notificationService.showError('Validation Error', 'Instances must be a positive number');
      return false;
    }
    return true;
  }

  saveService() {
    if (!this.validateForm()) {
      return;
    }

    const serviceData: any = {
      name: this.serviceForm.name,
      status: this.serviceForm.status,
      instances: this.serviceForm.instances,
      url: this.serviceForm.url,
      version: this.serviceForm.version,
      description: this.serviceForm.description,
    };

    if (this.isEditing) {
      serviceData.id = this.editingService()!.id;
    }

    this.dataService.saveService(serviceData).subscribe({
      next: (savedService) => {
        console.log('Service saved successfully:', savedService);
        this.loadServices(); // Reload the list
        this.closeForm();
      },
      error: (error) => {
        console.error('Failed to save service:', error);
        // Error notification already shown by DataService
      },
    });
  }

  async deleteService(service: Service) {
    const confirmed = await this.confirmationService.confirmDelete(service.name);

    if (!confirmed) {
      return;
    }

    try {
      await this.dataService.deleteService(service.id!);
      this.loadServices(); // Reload the list after deletion
    } catch (error) {
      console.error('Failed to delete service:', error);
      // Error notification already shown by DataService
    }
  }
}
