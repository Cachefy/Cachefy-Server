import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../core/services/data';
import { Agent } from '../../core/models/agent.model';
import { Pagination } from '../../shared/components/pagination/pagination';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmationService } from '../../core/services/confirmation.service';
import { ApiKeyService } from '../../core/services/api-key.service';
import {
  ApiKeyModal,
  ApiKeyDisplayData,
} from '../../shared/components/api-key-modal/api-key-modal';

@Component({
  selector: 'app-settings',
  imports: [CommonModule, FormsModule, Pagination, ApiKeyModal],
  templateUrl: './agent-settings.html',
  styleUrl: './settings.css',
})
export class Settings implements OnInit {
  public dataService = inject(DataService);
  private notificationService = inject(NotificationService);
  private confirmationService = inject(ConfirmationService);
  private apiKeyService = inject(ApiKeyService);

  agents = signal<Agent[]>([]);
  currentPage = signal(1);
  itemsPerPage = 10;
  editingAgent = signal<Agent | null>(null);
  apiKeyModalData = signal<ApiKeyDisplayData | null>(null);
  isLoading = signal(false);
  isSaving = signal(false);

  agentForm = {
    name: '',
    url: '',
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
    this.isLoading.set(true);

    // First get cached agents for immediate display
    const cachedAgents = this.dataService.getAgents();
    this.agents.set(cachedAgents);

    // Then load from API to get latest data
    this.dataService.loadAgentsFromApi().subscribe({
      next: (agents) => {
        this.agents.set(agents);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load agents from API:', error);
        this.isLoading.set(false);
      },
    });
  }

  async saveAgent() {
    if (!this.validateForm()) {
      return;
    }

    this.isSaving.set(true);

    const agentData = {
      ...this.agentForm,
      id: this.editingAgent()?.id,
    };

    try {
      // The saveAgent method now returns an Observable
      const result = await new Promise<{ agent: Agent; isNewKey: boolean }>((resolve, reject) => {
        this.dataService.saveAgent(agentData).subscribe({
          next: (result) => resolve(result),
          error: (error) => reject(error),
        });
      });

      this.loadAgents();
      this.clearForm();
      this.isSaving.set(false);

      // Show API key modal if a new key was generated
      if (result.isNewKey) {
        this.apiKeyModalData.set({
          agentName: result.agent.name,
          apiKey: result.agent.apiKey!,
          keyId: result.agent.id,
          generatedAt: new Date().toISOString(),
          isNewKey: true,
        });
      }
    } catch (error) {
      console.error('Failed to save agent:', error);
      this.isSaving.set(false);
    }
  }

  editAgent(agent: Agent) {
    this.agentForm = {
      name: agent.name,
      url: agent.url || '',
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
    };
    this.editingAgent.set(null);
  }

  onPageChange(page: number) {
    this.currentPage.set(page);
  }

  async revokeApiKey(agent: Agent) {
    try {
      const result = await this.dataService.revokeApiKey(agent.id);

      if (result) {
        this.loadAgents();

        // Show the new API key in modal
        this.apiKeyModalData.set({
          agentName: result.agent.name,
          apiKey: result.newApiKey,
          keyId: result.agent.id,
          generatedAt: new Date().toISOString(),
          isNewKey: false,
        });
      }
    } catch (error) {
      console.error('Failed to revoke API key:', error);
    }
  }

  closeApiKeyModal() {
    this.apiKeyModalData.set(null);
  }

  exportAgents() {
    this.dataService.exportAgentsToJson();
  }

  importAgents(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    if (!file.type.includes('json')) {
      this.notificationService.showError('Invalid File Type', 'Please select a JSON file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target?.result as string);
        this.dataService.importAgentsFromJson(jsonData);
        this.loadAgents(); // Refresh the view

        // Clear the input so the same file can be selected again
        input.value = '';
      } catch (error) {
        this.notificationService.showError('Import Failed', 'Invalid JSON file format');
      }
    };
    reader.readAsText(file);
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
