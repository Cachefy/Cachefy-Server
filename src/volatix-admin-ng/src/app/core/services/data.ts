import { Injectable, signal, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, BehaviorSubject, firstValueFrom } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';

import { Service } from '../models/service.model';
import { Cache } from '../models/cache.model';
import { Agent } from '../models/agent.model';
import { NotificationService } from './notification.service';
import { ConfirmationService } from './confirmation.service';
import { ApiKeyService } from './api-key.service';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

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
    private apiKeyService: ApiKeyService,
    private authService: AuthService
  ) {
    this.loadAgents();
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.authState().token;
    if (token) {
      return new HttpHeaders({
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      });
    }
    return new HttpHeaders({
      'Content-Type': 'application/json',
    });
  }

  getServices(): Observable<Service[]> {
    return this.http
      .get<Service[]>(`${environment.apiUrl}/services`, { headers: this.getAuthHeaders() })
      .pipe(
        map((servicesList) => {
          const processedServices = servicesList.map((s: any) => ({
            ...s,
            id: s.id || s.serviceId || this.toSlug(s.name),
            lastSeen: s.lastSeen
              ? new Date(s.lastSeen).toLocaleString()
              : s.lastSeenText || 'Unknown',
          }));
          this.services.set(processedServices);
          this.addLog(`Loaded ${processedServices.length} services from API`);
          return processedServices;
        }),
        catchError((err) => {
          this.addLog('Error loading services from API: ' + err.message);
          this.notificationService.showError('Failed to load services', err.message);
          return of([]);
        })
      );
  }

  getCaches(): Observable<Cache[]> {
    return this.http
      .get<Cache[]>(`${environment.apiUrl}/caches`, { headers: this.getAuthHeaders() })
      .pipe(
        map((cachesList) => {
          this.caches.set(cachesList);
          this.addLog(`Loaded ${cachesList.length} caches from API`);
          return cachesList;
        }),
        catchError((err) => {
          this.addLog('Error loading caches from API: ' + err.message);
          this.notificationService.showError('Failed to load caches', err.message);
          return of([]);
        })
      );
  }

  getCachesForService(serviceId: string): Observable<string[]> {
    return this.http
      .get<Array<{ cacheKeys: string[] }>>(
        `${environment.apiUrl}/caches/keys?serviceId=${serviceId}`,
        {
          headers: this.getAuthHeaders(),
        }
      )
      .pipe(
        map((response) => {
          // API returns an array with one object containing cacheKeys
          const cacheKeys = response?.[0]?.cacheKeys || [];
          this.addLog(`Loaded ${cacheKeys.length} caches for service ${serviceId}`);
          return cacheKeys;
        }),
        catchError((err) => {
          this.addLog(`Error loading caches for service ${serviceId}: ${err.message}`);
          this.notificationService.showError('Failed to load service caches', err.message);
          return of([]);
        })
      );
  }

  getCacheByKey(serviceId: string, key: string): Observable<any> {
    return this.http
      .get<any>(`${environment.apiUrl}/caches?serviceId=${serviceId}&key=${key}`, {
        headers: this.getAuthHeaders(),
      })
      .pipe(
        map((response) => {
          this.addLog(`Loaded cache ${key} for service ${serviceId}`);
          return response;
        }),
        catchError((err) => {
          this.addLog(`Error loading cache ${key} for service ${serviceId}: ${err.message}`);
          this.notificationService.showError('Failed to load cache', err.message);
          throw err;
        })
      );
  }

  clearCache(serviceId: string, key: string): Observable<void> {
    return this.http
      .delete<void>(`${environment.apiUrl}/caches/clear?serviceId=${serviceId}&key=${key}`, {
        headers: this.getAuthHeaders(),
      })
      .pipe(
        tap(() => {
          this.addLog(`Cleared cache: ${key}`);
          this.notificationService.showSuccess('Cache Cleared', `Cache "${key}" has been cleared`);
        }),
        catchError((err) => {
          this.addLog(`Error clearing cache ${key}: ${err.message}`);
          this.notificationService.showError('Failed to clear cache', err.message);
          throw err;
        })
      );
  }

  flushServiceCaches(serviceId: string): Observable<void> {
    return this.http
      .delete<void>(`${environment.apiUrl}/caches/flushall?serviceId=${serviceId}`, {
        headers: this.getAuthHeaders(),
      })
      .pipe(
        tap(() => {
          this.addLog(`Flushed all caches for service: ${serviceId}`);
          this.notificationService.showSuccess(
            'Caches Flushed',
            `All caches for service have been flushed`
          );
        }),
        catchError((err) => {
          this.addLog(`Error flushing caches for service ${serviceId}: ${err.message}`);
          this.notificationService.showError('Failed to flush caches', err.message);
          throw err;
        })
      );
  }

  getServiceById(id: string): Service | undefined {
    return this.services().find(
      (s) => s.id === id || s.serviceId === id || this.toSlug(s.name) === id
    );
  }

  // Service management
  saveService(service: Omit<Service, 'id'> & { id?: string }): Observable<Service> {
    const isUpdate = !!service.id;
    const url = isUpdate
      ? `${environment.apiUrl}/services/${service.id}`
      : `${environment.apiUrl}/services`;

    const method = isUpdate
      ? this.http.put<Service>(url, service, { headers: this.getAuthHeaders() })
      : this.http.post<Service>(url, service, { headers: this.getAuthHeaders() });

    return method.pipe(
      map((savedService) => {
        // Update local services signal
        const services = [...this.services()];
        const index = services.findIndex((s) => s.id === savedService.id);

        if (index >= 0) {
          services[index] = {
            ...savedService,
            lastSeen: savedService.lastSeen
              ? new Date(savedService.lastSeen).toLocaleString()
              : 'Unknown',
          };
        } else {
          services.push({
            ...savedService,
            lastSeen: savedService.lastSeen
              ? new Date(savedService.lastSeen).toLocaleString()
              : 'Unknown',
          });
        }

        this.services.set(services);
        this.addLog(`${isUpdate ? 'Updated' : 'Added'} service: ${savedService.name}`);

        // Show success notification
        if (isUpdate) {
          this.notificationService.showUpdateSuccess(`Service "${savedService.name}"`);
        } else {
          this.notificationService.showCreateSuccess(`Service "${savedService.name}"`);
        }

        return savedService;
      }),
      catchError((error) => {
        const errorMessage = error.message || 'Unknown error occurred';
        if (isUpdate) {
          this.notificationService.showUpdateError(`Service "${service.name}"`, errorMessage);
        } else {
          this.notificationService.showCreateError(`Service "${service.name}"`, errorMessage);
        }
        this.addLog(`Error saving service: ${errorMessage}`);
        throw error;
      })
    );
  }

  async deleteService(id: string): Promise<void> {
    const service = this.services().find((s) => s.id === id);
    const serviceName = service?.name || 'Service';

    const confirmed = await this.confirmationService.confirmDelete(serviceName);

    if (!confirmed) {
      return;
    }

    try {
      // Call API to delete service
      await firstValueFrom(
        this.http.delete(`${environment.apiUrl}/services/${id}`, { headers: this.getAuthHeaders() })
      );

      // Update local services signal
      const services = this.services().filter((s) => s.id !== id);
      this.services.set(services);

      if (service) {
        this.addLog(`Deleted service: ${service.name}`);
        this.notificationService.showDeleteSuccess(`Service "${service.name}"`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.notificationService.showDeleteError(`Service "${serviceName}"`, errorMessage);
      this.addLog(`Error deleting service: ${errorMessage}`);
    }
  }

  // Cache management
  saveCache(cache: Cache & { isUpdate?: boolean }): Observable<Cache> {
    const isUpdate = !!cache.isUpdate;
    const url = isUpdate
      ? `${environment.apiUrl}/caches/${cache.serviceId}/${cache.name}`
      : `${environment.apiUrl}/caches`;

    const method = isUpdate
      ? this.http.put<Cache>(url, cache, { headers: this.getAuthHeaders() })
      : this.http.post<Cache>(url, cache, { headers: this.getAuthHeaders() });

    return method.pipe(
      map((savedCache) => {
        // Update local caches signal
        const caches = [...this.caches()];
        const existingIndex = caches.findIndex(
          (c) => c.name === savedCache.name && c.serviceId === savedCache.serviceId
        );

        if (existingIndex >= 0) {
          caches[existingIndex] = savedCache;
          this.addLog(`Updated cache: ${savedCache.name}`);
          this.notificationService.showUpdateSuccess(`Cache "${savedCache.name}"`);
        } else {
          caches.push(savedCache);
          this.addLog(`Added cache: ${savedCache.name}`);
          this.notificationService.showCreateSuccess(`Cache "${savedCache.name}"`);
        }

        this.caches.set(caches);
        return savedCache;
      }),
      catchError((error) => {
        const errorMessage = error.message || 'Unknown error occurred';
        if (isUpdate) {
          this.notificationService.showUpdateError(`Cache "${cache.name}"`, errorMessage);
        } else {
          this.notificationService.showCreateError(`Cache "${cache.name}"`, errorMessage);
        }
        this.addLog(`Error saving cache: ${errorMessage}`);
        throw error;
      })
    );
  }

  async deleteCache(key: string, serviceId: string): Promise<void> {
    const confirmed = await this.confirmationService.confirmDelete(`Cache "${key}"`);

    if (!confirmed) {
      return;
    }

    try {
      // Call API to delete cache
      await firstValueFrom(
        this.http.delete(`${environment.apiUrl}/caches?serviceId=${serviceId}&key=${key}`, {
          headers: this.getAuthHeaders(),
        })
      );

      // Update local caches signal
      const deletedCache = this.caches().find((c) => c.name === key && c.serviceId === serviceId);
      const caches = this.caches().filter((c) => !(c.name === key && c.serviceId === serviceId));

      this.caches.set(caches);

      if (deletedCache) {
        this.addLog(`Deleted cache: ${deletedCache.name}`);
        this.notificationService.showDeleteSuccess(`Cache "${deletedCache.name}"`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.notificationService.showDeleteError(`Cache "${key}"`, errorMessage);
      this.addLog(`Error deleting cache: ${errorMessage}`);
    }
  }

  // Agent management
  getAgents(): Agent[] {
    return this.agents();
  }

  loadAgentsFromApi(): Observable<Agent[]> {
    return this.http
      .get<Agent[]>(`${environment.apiUrl}/agents`, { headers: this.getAuthHeaders() })
      .pipe(
        map((agents) => {
          // Transform API response to match our Agent model
          const transformedAgents = agents.map((agent) => ({
            ...agent,
            apiKeyGenerated: agent.createdAt,
          }));
          this.agents.set(transformedAgents);
          this.addLog(`Loaded ${transformedAgents.length} agents from API`);
          return transformedAgents;
        }),
        catchError((error) => {
          this.addLog(`Error loading agents from API: ${error.message}`);
          this.notificationService.showError('Failed to load agents', error.message);
          return of([]);
        })
      );
  }

  saveAgent(agent: Omit<Agent, 'id' | 'apiKey'> & { id?: string }): Observable<{
    agent: Agent;
    isNewKey: boolean;
  }> {
    const isUpdate = !!agent.id;
    const url = isUpdate
      ? `${environment.apiUrl}/agents/${agent.id}`
      : `${environment.apiUrl}/agents`;

    const method = isUpdate
      ? this.http.put<Agent>(
          url,
          { name: agent.name, url: agent.url },
          { headers: this.getAuthHeaders() }
        )
      : this.http.post<Agent>(
          url,
          { name: agent.name, url: agent.url },
          { headers: this.getAuthHeaders() }
        );

    return method.pipe(
      map((savedAgent) => {
        // Update local agents signal
        const agents = [...this.agents()];
        const index = agents.findIndex((a) => a.id === savedAgent.id);

        if (index >= 0) {
          agents[index] = savedAgent;
        } else {
          agents.push(savedAgent);
        }

        this.agents.set(agents);
        this.addLog(`${isUpdate ? 'Updated' : 'Added'} agent: ${savedAgent.name}`);

        // Show success notification
        if (isUpdate) {
          this.notificationService.showUpdateSuccess(`Agent "${savedAgent.name}"`);
        } else {
          this.notificationService.showCreateSuccess(`Agent "${savedAgent.name}"`);
        }

        return { agent: savedAgent, isNewKey: !isUpdate };
      }),
      catchError((error) => {
        const errorMessage = error.message || 'Unknown error occurred';
        if (isUpdate) {
          this.notificationService.showUpdateError(`Agent "${agent.name}"`, errorMessage);
        } else {
          this.notificationService.showCreateError(`Agent "${agent.name}"`, errorMessage);
        }
        this.addLog(`Error saving agent: ${errorMessage}`);
        throw error;
      })
    );
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
      // Call API to regenerate API key
      const response = await firstValueFrom(
        this.http.post<Agent>(
          `${environment.apiUrl}/agents/${agentId}/regenerate-api-key`,
          {},
          { headers: this.getAuthHeaders() }
        )
      );

      // Update local agents signal
      const agents = [...this.agents()];
      const agentIndex = agents.findIndex((a) => a.id === agentId);

      if (agentIndex >= 0) {
        agents[agentIndex] = response;
        this.agents.set(agents);
      }

      this.addLog(`Revoked API key for agent: ${response.name}`);
      this.notificationService.showInfo(
        'API Key Revoked',
        `New API key generated for "${response.name}"`
      );

      return { agent: response, newApiKey: response.apiKey };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.notificationService.showError('API Key Revocation Failed', errorMessage);
      this.addLog(`Error revoking API key: ${errorMessage}`);
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
      // Call API to delete agent
      await firstValueFrom(
        this.http.delete(`${environment.apiUrl}/agents/${id}`, { headers: this.getAuthHeaders() })
      );

      // Update local agents signal
      const agents = this.agents().filter((a) => a.id !== id);
      this.agents.set(agents);

      if (agent) {
        this.addLog(`Deleted agent: ${agent.name}`);
        this.notificationService.showDeleteSuccess(`Agent "${agent.name}"`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.notificationService.showDeleteError(`Agent "${agentName}"`, errorMessage);
      this.addLog(`Error deleting agent: ${errorMessage}`);
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
    // Agents will be loaded via loadAgentsFromApi() after login
    // No longer using localStorage or JSON files for agents
  }

  // No longer needed - agents are managed by API
  // private saveAgentsToStorage(): void {
  //   if (!isPlatformBrowser(this.platformId)) {
  //     return;
  //   }
  //   try {
  //     localStorage.setItem(this.AGENTS_KEY, JSON.stringify(this.agents()));
  //   } catch (e) {
  //     console.error('Failed to save agents to localStorage:', e);
  //   }
  // }

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
      // Note: Import functionality should ideally call API to persist agents

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
