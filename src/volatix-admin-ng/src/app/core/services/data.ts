import { Injectable, signal, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';

import { Service } from '../models/service.model';
import { Cache } from '../models/cache.model';
import { Agent } from '../models/agent.model';
import { NotificationService } from './notification.service';
import { ConfirmationService } from './confirmation.service';
import { ApiKeyService } from './api-key.service';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  private readonly AGENTS_KEY = 'volatix-agents';
  private readonly LOGS_KEY = 'volatix-logs';

  private services = signal<Service[]>([]);
  private caches = signal<Cache[]>([]);
  private agents = signal<Agent[]>([]);
  private logs = signal<string[]>([]);

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object,
    private notificationService: NotificationService,
    private confirmationService: ConfirmationService,
    private apiKeyService: ApiKeyService
  ) {
    this.loadAgents();
  }

  getServices(): Observable<Service[]> {
    return this.http.get<Service[] | { services: Service[] }>('/services.json').pipe(
      map((data) => {
        const servicesList = Array.isArray(data) ? data : (data as any).services || [];
        const processedServices = servicesList.map((s: any) => ({
          ...s,
          id: s.id || s.serviceId || this.toSlug(s.name),
          lastSeen: s.lastSeen
            ? new Date(s.lastSeen).toLocaleString()
            : s.lastSeenText || 'Unknown',
        }));
        this.services.set(processedServices);
        this.addLog('Services loaded from services.json');
        return processedServices;
      }),
      catchError((err) => {
        this.addLog('Error loading services JSON: ' + err.message);
        return of([]);
      })
    );
  }

  getCaches(): Observable<Cache[]> {
    return this.http.get<Cache[] | { caches: Cache[] }>('/caches.json').pipe(
      map((data) => {
        const cachesList = Array.isArray(data) ? data : (data as any).caches || [];
        this.caches.set(cachesList);
        return cachesList;
      }),
      catchError((err) => {
        this.addLog('Error loading caches JSON: ' + err.message);
        return of([]);
      })
    );
  }

  getCachesForService(serviceId: string): Observable<Cache[]> {
    return this.getCaches().pipe(
      map((caches) => {
        const filteredCaches = caches.filter((c) => {
          const cSid = String(c.serviceId || '').toLowerCase();
          const target = String(serviceId || '').toLowerCase();
          return cSid === target || (c.serviceName && this.toSlug(c.serviceName) === target);
        });
        this.addLog(`Loaded ${filteredCaches.length} caches for ${serviceId}`);
        return filteredCaches;
      })
    );
  }

  getServiceById(id: string): Service | undefined {
    return this.services().find(
      (s) => s.id === id || s.serviceId === id || this.toSlug(s.name) === id
    );
  }

  // Service management
  saveService(service: Omit<Service, 'id'> & { id?: string }): void {
    try {
      const services = [...this.services()];
      const now = new Date().toISOString();
      let isUpdate = false;

      if (service.id) {
        const index = services.findIndex((s) => s.id === service.id);
        if (index >= 0) {
          services[index] = { ...services[index], ...service };
          this.addLog(`Updated service: ${service.name}`);
          isUpdate = true;
        }
      } else {
        const id = this.toSlug(service.name);
        services.push({
          ...service,
          id,
          lastSeen: now,
        });
        this.addLog(`Added service: ${service.name}`);
      }

      this.services.set(services);

      // Show success notification
      if (isUpdate) {
        this.notificationService.showUpdateSuccess(`Service "${service.name}"`);
      } else {
        this.notificationService.showCreateSuccess(`Service "${service.name}"`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      if (service.id) {
        this.notificationService.showUpdateError(`Service "${service.name}"`, errorMessage);
      } else {
        this.notificationService.showCreateError(`Service "${service.name}"`, errorMessage);
      }
    }
  }

  async deleteService(id: string): Promise<void> {
    const service = this.services().find((s) => s.id === id);
    const serviceName = service?.name || 'Service';

    const confirmed = await this.confirmationService.confirmDelete(serviceName);

    if (!confirmed) {
      return;
    }

    try {
      const services = this.services().filter((s) => s.id !== id);
      this.services.set(services);

      if (service) {
        this.addLog(`Deleted service: ${service.name}`);
        this.notificationService.showDeleteSuccess(`Service "${service.name}"`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.notificationService.showDeleteError(`Service "${serviceName}"`, errorMessage);
    }
  }

  // Cache management
  saveCache(cache: Cache & { isUpdate?: boolean }): void {
    try {
      const caches = [...this.caches()];
      const existingIndex = caches.findIndex(
        (c) => c.name === cache.name && c.serviceId === cache.serviceId
      );

      if (existingIndex >= 0 || cache.isUpdate) {
        if (existingIndex >= 0) {
          caches[existingIndex] = { ...caches[existingIndex], ...cache };
        }
        this.addLog(`Updated cache: ${cache.name}`);
        this.notificationService.showUpdateSuccess(`Cache "${cache.name}"`);
      } else {
        caches.push(cache);
        this.addLog(`Added cache: ${cache.name}`);
        this.notificationService.showCreateSuccess(`Cache "${cache.name}"`);
      }

      this.caches.set(caches);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      if (cache.isUpdate) {
        this.notificationService.showUpdateError(`Cache "${cache.name}"`, errorMessage);
      } else {
        this.notificationService.showCreateError(`Cache "${cache.name}"`, errorMessage);
      }
    }
  }

  async deleteCache(name: string, serviceId: string): Promise<void> {
    const confirmed = await this.confirmationService.confirmDelete(`Cache "${name}"`);

    if (!confirmed) {
      return;
    }

    try {
      const deletedCache = this.caches().find((c) => c.name === name && c.serviceId === serviceId);
      const caches = this.caches().filter((c) => !(c.name === name && c.serviceId === serviceId));

      this.caches.set(caches);

      if (deletedCache) {
        this.addLog(`Deleted cache: ${deletedCache.name}`);
        this.notificationService.showDeleteSuccess(`Cache "${deletedCache.name}"`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.notificationService.showDeleteError(`Cache "${name}"`, errorMessage);
    }
  }

  // Agent management
  getAgents(): Agent[] {
    return this.agents();
  }

  saveAgent(agent: Omit<Agent, 'id' | 'apiKey'> & { id?: string }): {
    agent: Agent;
    isNewKey: boolean;
  } {
    try {
      const agents = [...this.agents()];
      const now = new Date().toISOString();
      let isUpdate = false;
      let generatedApiKey = '';
      let isNewKey = false;

      if (agent.id) {
        const index = agents.findIndex((a) => a.id === agent.id);
        if (index >= 0) {
          // For updates, keep existing API key
          agents[index] = {
            ...agents[index],
            ...agent,
            updatedAt: now,
          };
          this.addLog(`Updated agent: ${agent.name}`);
          isUpdate = true;
          generatedApiKey = agents[index].apiKey;
        }
      } else {
        // For new agents, generate API key
        const id = this.uniqueAgentId(agent.name);
        generatedApiKey = this.apiKeyService.generateApiKey();
        isNewKey = true;

        const newAgent: Agent = {
          ...agent,
          id,
          apiKey: generatedApiKey,
          apiKeyGenerated: now,
          createdAt: now,
          updatedAt: now,
        };

        agents.push(newAgent);
        this.addLog(`Added agent: ${agent.name} with new API key`);
      }

      this.agents.set(agents);
      this.saveAgentsToStorage();

      // Show success notification
      if (isUpdate) {
        this.notificationService.showUpdateSuccess(`Agent "${agent.name}"`);
      } else {
        this.notificationService.showCreateSuccess(`Agent "${agent.name}"`);
      }

      // Return the saved agent and key generation info
      const savedAgent = agents.find(
        (a) => a.id === (agent.id || this.uniqueAgentId(agent.name)) || a.name === agent.name
      )!;

      return { agent: savedAgent, isNewKey };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      if (agent.id) {
        this.notificationService.showUpdateError(`Agent "${agent.name}"`, errorMessage);
      } else {
        this.notificationService.showCreateError(`Agent "${agent.name}"`, errorMessage);
      }

      // Return error state
      throw error;
    }
  }

  async revokeApiKey(agentId: string): Promise<{ agent: Agent; newApiKey: string } | null> {
    const confirmed = await this.confirmationService.confirm({
      title: 'Revoke API Key',
      message:
        'Are you sure you want to revoke this API key? This will generate a new key and the old one will no longer work.',
      confirmText: 'Revoke & Generate New',
      cancelText: 'Cancel',
      type: 'warning',
    });

    if (!confirmed) {
      return null;
    }

    try {
      const agents = [...this.agents()];
      const agentIndex = agents.findIndex((a) => a.id === agentId);

      if (agentIndex === -1) {
        throw new Error('Agent not found');
      }

      const agent = agents[agentIndex];
      const newApiKey = this.apiKeyService.generateApiKey();
      const now = new Date().toISOString();

      // Update agent with new API key
      agents[agentIndex] = {
        ...agent,
        apiKey: newApiKey,
        apiKeyGenerated: now,
        updatedAt: now,
      };

      this.agents.set(agents);
      this.saveAgentsToStorage();
      this.addLog(`Revoked API key for agent: ${agent.name}`);

      this.notificationService.showInfo(
        'API Key Revoked',
        `New API key generated for "${agent.name}"`
      );

      return { agent: agents[agentIndex], newApiKey };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.notificationService.showError('API Key Revocation Failed', errorMessage);
      return null;
    }
  }

  async deleteAgent(id: string): Promise<void> {
    const agent = this.agents().find((a) => a.id === id);
    const agentName = agent?.name || 'Agent';

    const confirmed = await this.confirmationService.confirmDelete(agentName);

    if (!confirmed) {
      return;
    }

    try {
      const agents = this.agents().filter((a) => a.id !== id);
      this.agents.set(agents);
      this.saveAgentsToStorage();

      if (agent) {
        this.addLog(`Deleted agent: ${agent.name}`);
        this.notificationService.showDeleteSuccess(`Agent "${agent.name}"`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.notificationService.showDeleteError(`Agent "${agentName}"`, errorMessage);
    }
  }

  // Utility functions
  toSlug(str: string): string {
    return String(str || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  humanTTL(ttl: number | string): string {
    const n = Number(ttl);
    if (!isFinite(n) || n <= 0) return String(ttl ?? '—');
    if (n < 60) return `${n}s`;
    const mins = Math.floor(n / 60);
    const secs = n % 60;
    if (mins < 60) return `${mins}m${secs ? ' ' + secs + 's' : ''}`;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hours}h${remMins ? ' ' + remMins + 'm' : ''}`;
  }

  maskKey(key: string): string {
    if (!key) return '—';
    const s = String(key);
    if (s.length <= 4) return '****';
    return '****' + s.slice(-4);
  }

  // Logging
  addLog(message: string): void {
    const timestamp = new Date().toLocaleString();
    const logEntry = `${timestamp} - ${message}`;
    const currentLogs = [...this.logs()];
    currentLogs.unshift(logEntry);
    this.logs.set(currentLogs.slice(0, 100)); // Keep last 100 logs
  }

  getLogs(): string[] {
    return this.logs();
  }

  // Dashboard metrics
  getDashboardMetrics() {
    const cacheList = this.caches();
    const activeCaches = cacheList.length;
    const totalItems = cacheList.reduce((a, c) => a + (c.items || 0), 0);
    const totalHits = cacheList.reduce((a, c) => a + (c.hits || 0), 0);
    const hitRatio = cacheList.length
      ? Math.min(99, Math.floor((totalHits / (totalItems || 1)) * 100))
      : 0;

    return {
      activeCaches,
      totalItems,
      hitRatio: `${hitRatio}%`,
    };
  }

  private loadAgents(): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        const stored = localStorage.getItem(this.AGENTS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            this.agents.set(parsed);
            return;
          }
        }
      } catch (e) {
        // Fallback to empty array
      }
    }

    // Try loading from agents.json (optional)
    this.http
      .get<Agent[] | { agents: Agent[] }>('/agents.json')
      .pipe(
        map((data) => (Array.isArray(data) ? data : (data as any).agents || [])),
        catchError(() => of([]))
      )
      .subscribe((agents) => {
        if (agents.length > 0) {
          this.agents.set(agents);
          this.saveAgentsToStorage();
          this.addLog('Agents loaded from agents.json');
        }
      });
  }

  private saveAgentsToStorage(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      localStorage.setItem(this.AGENTS_KEY, JSON.stringify(this.agents()));
    } catch (e) {
      console.error('Failed to save agents to localStorage:', e);
    }
  }

  private uniqueAgentId(name: string): string {
    let base = this.toSlug(name || 'agent');
    let id = base;
    let i = 2;
    const agents = this.agents();

    while (agents.some((a) => a.id === id)) {
      id = `${base}-${i++}`;
    }
    return id;
  }

  // Export agents to JSON file
  exportAgentsToJson(): void {
    try {
      const agentsData = this.agents();
      const jsonString = JSON.stringify(agentsData, null, 2);

      if (isPlatformBrowser(this.platformId)) {
        // Create downloadable file
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `agents-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        this.addLog(`Exported ${agentsData.length} agents to JSON file`);
        this.notificationService.showSuccess(
          'Export Complete',
          `Downloaded agents JSON file with ${agentsData.length} agents`
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.notificationService.showError('Export Failed', errorMessage);
    }
  }

  // Import agents from JSON data
  importAgentsFromJson(jsonData: Agent[]): void {
    try {
      if (!Array.isArray(jsonData)) {
        throw new Error('Invalid JSON format - expected an array of agents');
      }

      // Validate agent structure
      const validAgents = jsonData.filter(
        (agent) =>
          agent.name && agent.url && typeof agent.name === 'string' && typeof agent.url === 'string'
      );

      if (validAgents.length !== jsonData.length) {
        this.notificationService.showWarning(
          'Import Warning',
          `${jsonData.length - validAgents.length} invalid agents were skipped`
        );
      }

      // Merge with existing agents, avoiding duplicates
      const existingAgents = this.agents();
      const mergedAgents = [...existingAgents];
      let importedCount = 0;
      let updatedCount = 0;

      validAgents.forEach((importAgent) => {
        const existingIndex = existingAgents.findIndex(
          (a) => a.id === importAgent.id || a.name === importAgent.name
        );

        if (existingIndex >= 0) {
          // Update existing agent
          mergedAgents[existingIndex] = {
            ...mergedAgents[existingIndex],
            ...importAgent,
            updatedAt: new Date().toISOString(),
          };
          updatedCount++;
        } else {
          // Add new agent with unique ID
          const newAgent = {
            ...importAgent,
            id: importAgent.id || this.uniqueAgentId(importAgent.name),
            apiKey: importAgent.apiKey || this.apiKeyService.generateApiKey(),
            createdAt: importAgent.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            apiKeyGenerated: importAgent.apiKeyGenerated || new Date().toISOString(),
          };
          mergedAgents.push(newAgent);
          importedCount++;
        }
      });

      this.agents.set(mergedAgents);
      this.saveAgentsToStorage();

      this.addLog(`Imported ${importedCount} new agents, updated ${updatedCount} existing agents`);
      this.notificationService.showSuccess(
        'Import Complete',
        `Imported ${importedCount} new agents, updated ${updatedCount} existing agents`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.notificationService.showError('Import Failed', errorMessage);
    }
  }
}
