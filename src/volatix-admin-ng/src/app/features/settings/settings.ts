import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../core/services/data';
import { Agent } from '../../core/models/agent.model';
import { Pagination } from '../../shared/components/pagination/pagination';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmationService } from '../../core/services/confirmation.service';

@Component({
  selector: 'app-settings',
  imports: [CommonModule, FormsModule, Pagination],
  templateUrl: './agent-settings.html',
  styleUrl: './settings.css',
})
export class Settings implements OnInit {
  public dataService = inject(DataService);
  private notificationService = inject(NotificationService);
  private confirmationService = inject(ConfirmationService);

  agents = signal<Agent[]>([]);
  currentPage = signal(1);
  itemsPerPage = 10;
  editingAgent = signal<Agent | null>(null);

  agentForm = {
    name: '',
    url: '',
    apiKey: '',
  };

  // Computed properties
  totalPages = computed(() => Math.ceil(this.agents().length / this.itemsPerPage));
  paginatedAgents = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.agents().slice(start, end);
  });

  ngOnInit() {
    this.loadAgents();
  }

  loadAgents() {
    const agents = this.dataService.getAgents();
    this.agents.set(agents);
  }

  saveAgent() {
    if (!this.validateForm()) {
      return;
    }

    const agentData = {
      ...this.agentForm,
      id: this.editingAgent()?.id,
    };

    // The notification will be handled by the DataService
    this.dataService.saveAgent(agentData);
    this.loadAgents();
    this.clearForm();
  }

  editAgent(agent: Agent) {
    this.agentForm = {
      name: agent.name,
      url: agent.url || '',
      apiKey: agent.apiKey || '',
    };
    this.editingAgent.set(agent);
  }

  async deleteAgent(id: string) {
    const agent = this.agents().find((a) => a.id === id);
    const agentName = agent?.name || 'this agent';

    const confirmed = await this.confirmationService.confirmDelete(agentName);

    if (confirmed) {
      // The notification will be handled by the DataService
      await this.dataService.deleteAgent(id);
      this.loadAgents();
    }
  }

  clearForm() {
    this.agentForm = {
      name: '',
      url: '',
      apiKey: '',
    };
    this.editingAgent.set(null);
  }

  onPageChange(page: number) {
    this.currentPage.set(page);
  }

  formatDate(dateString?: string): string {
    if (!dateString) return '—';

    try {
      const date = new Date(dateString);
      return (
        date.toLocaleDateString() +
        ' ' +
        date.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    } catch {
      return '—';
    }
  }

  private validateForm(): boolean {
    if (!this.agentForm.name.trim()) {
      this.notificationService.showError('Validation Error', 'Agent name is required');
      return false;
    }

    if (!this.agentForm.url.trim()) {
      this.notificationService.showError('Validation Error', 'Agent URL is required');
      return false;
    }

    if (!this.agentForm.apiKey.trim()) {
      this.notificationService.showError('Validation Error', 'Agent API key is required');
      return false;
    }

    // Basic URL validation
    try {
      new URL(this.agentForm.url);
    } catch {
      this.notificationService.showError('Validation Error', 'Please enter a valid URL');
      return false;
    }

    return true;
  }
}
