import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DataService } from '../../../core/services/data';
import { Service } from '../../../core/models/service.model';
import { Agent } from '../../../core/models/agent.model';
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
  agents = signal<Agent[]>([]);
  selectedAgent = signal<Agent | null>(null);
  currentPage = signal(1);
  pageSize = 6;
  isLoading = signal(false);
  isLoadingAgents = signal(false);

  // Computed properties
  filteredServices = computed(() => {
    const allServices = this.services();
    const selected = this.selectedAgent();
    
    if (!selected) {
      return allServices;
    }
    
    // Filter services by selected agent
    return allServices.filter(service => service.agentId === selected.id);
  });

  paginatedServices = computed(() => {
    const filtered = this.filteredServices();
    const page = this.currentPage();
    const startIndex = (page - 1) * this.pageSize;
    return filtered.slice(startIndex, startIndex + this.pageSize);
  });

  totalPages = computed(() => {
    return Math.ceil(this.filteredServices().length / this.pageSize) || 1;
  });

  servicesByAgent = computed(() => {
    const allServices = this.services();
    const allAgents = this.agents();
    
    return allAgents.map(agent => ({
      agent,
      services: allServices.filter(service => service.agentId === agent.id),
      serviceCount: allServices.filter(service => service.agentId === agent.id).length
    }));
  });

  activeAgentsCount = computed(() => {
    return this.servicesByAgent().filter(a => a.agent.status === 'online').length;
  });

  ngOnInit() {
    this.loadAgents();
    this.loadServices();
  }

  loadAgents() {
    this.isLoadingAgents.set(true);
    
    this.dataService.loadAgentsFromApi().subscribe({
      next: (agents) => {
        this.agents.set(agents);
        this.isLoadingAgents.set(false);
        
        // Ping all agents to update their status
        this.pingAllAgents();
      },
      error: (error) => {
        console.error('Failed to load agents:', error);
        this.notificationService.showError('Failed to load agents', error.message);
        this.isLoadingAgents.set(false);
      },
    });
  }

  pingAllAgents() {
    this.dataService.pingAllAgents().subscribe({
      next: (results) => {
        const onlineCount = results.filter(r => r.status === 'online').length;
        console.log(`Agent ping complete: ${onlineCount}/${results.length} agents online`);
        
        // Update local agents signal with the updated agents from dataService
        this.agents.set(this.dataService.getAgents());
      },
      error: (error) => {
        console.error('Error pinging agents:', error);
      }
    });
  }

  loadServices() {
    this.isLoading.set(true);
    
    this.dataService.getServices().subscribe({
      next: (services) => {
        this.services.set(services);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load services:', error);
        this.notificationService.showError('Failed to load services', error.message);
        this.isLoading.set(false);
      },
    });
  }

  selectAgent(agent: Agent | null) {
    this.selectedAgent.set(agent);
    this.currentPage.set(1); // Reset to first page when filtering
  }

  clearAgentFilter() {
    this.selectedAgent.set(null);
    this.currentPage.set(1);
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

  getStatusIcon(status: string): { icon: string; color: string } {
    switch (status?.toLowerCase()) {
      case 'healthy':
        return { icon: '✓', color: '#10b981' };
      case 'degraded':
        return { icon: '⚠', color: '#f59e0b' };
      case 'down':
        return { icon: '✗', color: '#ef4444' };
      case 'maintenance':
        return { icon: '🔧', color: '#8b5cf6' };
      default:
        return { icon: '?', color: '#6b7280' };
    }
  }

  getAgentName(agentId: string): string {
    const agent = this.agents().find(a => a.id === agentId);
    return agent?.name || 'Unknown Agent';
  }
}
