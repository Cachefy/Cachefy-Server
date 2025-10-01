import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../core/services/data';
import { Agent } from '../../core/models/agent.model';
import { Pagination } from '../../shared/components/pagination/pagination';

@Component({
  selector: 'app-settings',
  imports: [CommonModule, FormsModule, Pagination],
  templateUrl: './agent-settings.html',
  styleUrl: './settings.css',
})
export class Settings implements OnInit {
  public dataService = inject(DataService);

  agents = signal<Agent[]>([]);
  currentPage = signal(1);
  itemsPerPage = 10;
  formMessage = signal('');
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

    try {
      this.dataService.saveAgent(agentData);
      this.loadAgents();
      this.clearForm();

      const action = this.editingAgent() ? 'updated' : 'added';
      this.formMessage.set(`Agent ${action} successfully!`);

      // Clear message after 3 seconds
      setTimeout(() => this.formMessage.set(''), 3000);
    } catch (error) {
      this.formMessage.set('Error saving agent. Please try again.');
    }
  }

  editAgent(agent: Agent) {
    this.agentForm = {
      name: agent.name,
      url: agent.url || '',
      apiKey: agent.apiKey || '',
    };
    this.editingAgent.set(agent);
    this.formMessage.set('');
  }

  deleteAgent(id: string) {
    if (confirm('Are you sure you want to delete this agent?')) {
      this.dataService.deleteAgent(id);
      this.loadAgents();
      this.formMessage.set('Agent deleted successfully!');

      // Clear message after 3 seconds
      setTimeout(() => this.formMessage.set(''), 3000);
    }
  }

  clearForm() {
    this.agentForm = {
      name: '',
      url: '',
      apiKey: '',
    };
    this.editingAgent.set(null);
    this.formMessage.set('');
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
      this.formMessage.set('Agent name is required');
      return false;
    }

    if (!this.agentForm.url.trim()) {
      this.formMessage.set('Agent URL is required');
      return false;
    }

    if (!this.agentForm.apiKey.trim()) {
      this.formMessage.set('Agent API key is required');
      return false;
    }

    // Basic URL validation
    try {
      new URL(this.agentForm.url);
    } catch {
      this.formMessage.set('Please enter a valid URL');
      return false;
    }

    this.formMessage.set('');
    return true;
  }
}
