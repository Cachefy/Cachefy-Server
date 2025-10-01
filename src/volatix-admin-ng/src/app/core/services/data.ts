import { Injectable, signal, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';

import { Service } from '../models/service.model';
import { Cache } from '../models/cache.model';
import { Agent } from '../models/agent.model';

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

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) private platformId: Object) {
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

  // Agent management
  getAgents(): Agent[] {
    return this.agents();
  }

  saveAgent(agent: Omit<Agent, 'id'> & { id?: string }): void {
    const agents = [...this.agents()];
    const now = new Date().toISOString();

    if (agent.id) {
      const index = agents.findIndex((a) => a.id === agent.id);
      if (index >= 0) {
        agents[index] = { ...agents[index], ...agent, updatedAt: now };
        this.addLog(`Updated agent: ${agent.name}`);
      }
    } else {
      const id = this.uniqueAgentId(agent.name);
      agents.push({
        ...agent,
        id,
        createdAt: now,
        updatedAt: now,
      });
      this.addLog(`Added agent: ${agent.name}`);
    }

    this.agents.set(agents);
    this.saveAgentsToStorage();
  }

  deleteAgent(id: string): void {
    const agents = this.agents().filter((a) => a.id !== id);
    const deletedAgent = this.agents().find((a) => a.id === id);
    this.agents.set(agents);
    this.saveAgentsToStorage();
    if (deletedAgent) {
      this.addLog(`Deleted agent: ${deletedAgent.name}`);
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
}
