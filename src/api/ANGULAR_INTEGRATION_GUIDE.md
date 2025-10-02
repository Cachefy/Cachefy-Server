# Angular Integration Guide for Volatix Server API

## Overview

This guide shows how to integrate the Volatix Server API with your Angular application.

## Project Structure

Your Angular application should have the following service structure:

```
src/
  app/
    core/
      services/
        auth.service.ts
        agent.service.ts
        service.service.ts
        cache.service.ts
      interceptors/
        auth.interceptor.ts
      guards/
        auth.guard.ts
    models/
      agent.model.ts
      service.model.ts
      cache.model.ts
      user.model.ts
```

## 1. Create Models

### `models/agent.model.ts`

```typescript
export interface Agent {
  id: string;
  name: string;
  url: string;
  apiKey: string;
  isApiKeyActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAgentDto {
  name: string;
  url: string;
}

export interface UpdateAgentDto {
  name: string;
  url: string;
}
```

### `models/service.model.ts`

```typescript
export interface Service {
  id: string;
  name: string;
  description: string;
  port: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateServiceDto {
  name: string;
  description: string;
  port: number;
  status?: string;
}

export interface UpdateServiceDto {
  name?: string;
  description?: string;
  port?: number;
  status?: string;
}
```

### `models/cache.model.ts`

```typescript
export interface Cache {
  id: string;
  name: string;
  size: string;
  type: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCacheDto {
  name: string;
  size: string;
  type?: string;
  status?: string;
}

export interface UpdateCacheDto {
  name?: string;
  size?: string;
  type?: string;
  status?: string;
}
```

### `models/user.model.ts`

```typescript
export interface LoginDto {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  email: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}
```

## 2. Create Auth Service

### `core/services/auth.service.ts`

```typescript
import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, BehaviorSubject, tap } from "rxjs";
import { LoginDto, LoginResponse } from "../../models/user.model";
import { environment } from "../../../environments/environment";

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private baseUrl = `${environment.apiUrl}/auth`;
  private tokenKey = "volatix_token";
  private currentUserSubject = new BehaviorSubject<LoginResponse | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    // Load token from storage on initialization
    const token = this.getToken();
    if (token) {
      // You might want to decode the JWT to get user info
      // For now, just set a basic user object
    }
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.baseUrl}/login`, { email, password })
      .pipe(
        tap((response) => {
          this.setToken(response.token);
          this.currentUserSubject.next(response);
        })
      );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.currentUserSubject.next(null);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}
```

## 3. Create HTTP Interceptor

### `core/interceptors/auth.interceptor.ts`

```typescript
import { Injectable } from "@angular/core";
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
} from "@angular/common/http";
import { Observable, throwError } from "rxjs";
import { catchError } from "rxjs/operators";
import { AuthService } from "../services/auth.service";
import { Router } from "@angular/router";

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService, private router: Router) {}

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    const token = this.authService.getToken();

    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          this.authService.logout();
          this.router.navigate(["/login"]);
        }
        return throwError(() => error);
      })
    );
  }
}
```

### Register Interceptor in `app.config.ts`

```typescript
import { ApplicationConfig } from "@angular/core";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { AuthInterceptor } from "./core/interceptors/auth.interceptor";

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([AuthInterceptor])),
    // ... other providers
  ],
};
```

## 4. Create Resource Services

### `core/services/agent.service.ts`

```typescript
import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import {
  Agent,
  CreateAgentDto,
  UpdateAgentDto,
} from "../../models/agent.model";
import { environment } from "../../../environments/environment";

@Injectable({
  providedIn: "root",
})
export class AgentService {
  private baseUrl = `${environment.apiUrl}/agents`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Agent[]> {
    return this.http.get<Agent[]>(this.baseUrl);
  }

  getById(id: string): Observable<Agent> {
    return this.http.get<Agent>(`${this.baseUrl}/${id}`);
  }

  create(agent: CreateAgentDto): Observable<Agent> {
    return this.http.post<Agent>(this.baseUrl, agent);
  }

  update(id: string, agent: UpdateAgentDto): Observable<Agent> {
    return this.http.put<Agent>(`${this.baseUrl}/${id}`, agent);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  regenerateApiKey(id: string): Observable<{ apiKey: string }> {
    return this.http.post<{ apiKey: string }>(
      `${this.baseUrl}/${id}/regenerate-api-key`,
      {}
    );
  }
}
```

### `core/services/service.service.ts`

```typescript
import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import {
  Service,
  CreateServiceDto,
  UpdateServiceDto,
} from "../../models/service.model";
import { environment } from "../../../environments/environment";

@Injectable({
  providedIn: "root",
})
export class ServiceService {
  private baseUrl = `${environment.apiUrl}/services`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Service[]> {
    return this.http.get<Service[]>(this.baseUrl);
  }

  getById(id: string): Observable<Service> {
    return this.http.get<Service>(`${this.baseUrl}/${id}`);
  }

  create(service: CreateServiceDto): Observable<Service> {
    return this.http.post<Service>(this.baseUrl, service);
  }

  update(id: string, service: UpdateServiceDto): Observable<Service> {
    return this.http.put<Service>(`${this.baseUrl}/${id}`, service);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
```

### `core/services/cache.service.ts`

```typescript
import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import {
  Cache,
  CreateCacheDto,
  UpdateCacheDto,
} from "../../models/cache.model";
import { environment } from "../../../environments/environment";

@Injectable({
  providedIn: "root",
})
export class CacheService {
  private baseUrl = `${environment.apiUrl}/caches`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Cache[]> {
    return this.http.get<Cache[]>(this.baseUrl);
  }

  getById(id: string): Observable<Cache> {
    return this.http.get<Cache>(`${this.baseUrl}/${id}`);
  }

  create(cache: CreateCacheDto): Observable<Cache> {
    return this.http.post<Cache>(this.baseUrl, cache);
  }

  update(id: string, cache: UpdateCacheDto): Observable<Cache> {
    return this.http.put<Cache>(`${this.baseUrl}/${id}`, cache);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
```

## 5. Create Auth Guard

### `core/guards/auth.guard.ts`

```typescript
import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { AuthService } from "../services/auth.service";

export const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  router.navigate(["/login"]);
  return false;
};
```

## 6. Environment Configuration

### `environments/environment.ts`

```typescript
export const environment = {
  production: false,
  apiUrl: "http://localhost:5046/api",
};
```

### `environments/environment.prod.ts`

```typescript
export const environment = {
  production: true,
  apiUrl: "https://your-production-api.com/api",
};
```

## 7. Component Example

### `components/agent-list/agent-list.component.ts`

```typescript
import { Component, OnInit } from "@angular/core";
import { AgentService } from "../../core/services/agent.service";
import { Agent, CreateAgentDto } from "../../models/agent.model";

@Component({
  selector: "app-agent-list",
  templateUrl: "./agent-list.component.html",
  styleUrls: ["./agent-list.component.css"],
})
export class AgentListComponent implements OnInit {
  agents: Agent[] = [];
  loading = false;
  error: string | null = null;

  constructor(private agentService: AgentService) {}

  ngOnInit(): void {
    this.loadAgents();
  }

  loadAgents(): void {
    this.loading = true;
    this.agentService.getAll().subscribe({
      next: (agents) => {
        this.agents = agents;
        this.loading = false;
      },
      error: (error) => {
        this.error = "Failed to load agents";
        this.loading = false;
        console.error(error);
      },
    });
  }

  createAgent(agentData: CreateAgentDto): void {
    this.agentService.create(agentData).subscribe({
      next: (agent) => {
        this.agents.push(agent);
      },
      error: (error) => {
        console.error("Failed to create agent", error);
      },
    });
  }

  deleteAgent(id: string): void {
    if (confirm("Are you sure you want to delete this agent?")) {
      this.agentService.delete(id).subscribe({
        next: () => {
          this.agents = this.agents.filter((a) => a.id !== id);
        },
        error: (error) => {
          console.error("Failed to delete agent", error);
        },
      });
    }
  }

  regenerateApiKey(id: string): void {
    this.agentService.regenerateApiKey(id).subscribe({
      next: (response) => {
        const agent = this.agents.find((a) => a.id === id);
        if (agent) {
          agent.apiKey = response.apiKey;
        }
        alert("API Key regenerated successfully");
      },
      error: (error) => {
        console.error("Failed to regenerate API key", error);
      },
    });
  }
}
```

## 8. Routing with Auth Guard

### `app.routes.ts`

```typescript
import { Routes } from "@angular/router";
import { authGuard } from "./core/guards/auth.guard";

export const routes: Routes = [
  {
    path: "login",
    loadComponent: () =>
      import("./features/auth/login/login.component").then(
        (m) => m.LoginComponent
      ),
  },
  {
    path: "dashboard",
    loadComponent: () =>
      import("./features/dashboard/dashboard.component").then(
        (m) => m.DashboardComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: "agents",
    loadComponent: () =>
      import("./features/agents/agent-list/agent-list.component").then(
        (m) => m.AgentListComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: "services",
    loadComponent: () =>
      import("./features/services/service-list/service-list.component").then(
        (m) => m.ServiceListComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: "caches",
    loadComponent: () =>
      import("./features/caches/cache-list/cache-list.component").then(
        (m) => m.CacheListComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: "",
    redirectTo: "dashboard",
    pathMatch: "full",
  },
];
```

## Testing

1. **Start the API:**

   ```bash
   cd c:\Dev\Volatix-Server\src\api\VolatixServer.Api
   dotnet run
   ```

2. **Start Angular App:**

   ```bash
   cd your-angular-app
   ng serve
   ```

3. **Login:**

   - Use credentials: `admin@volatix.com` / `admin123`

4. **Test CRUD Operations:**
   - The interceptor automatically adds the JWT token to all requests
   - All API calls will work seamlessly with proper authentication

## Important Notes

- ✅ CORS is already configured for `http://localhost:4200`
- ✅ JWT tokens are automatically included in headers via interceptor
- ✅ 401 errors automatically redirect to login page
- ✅ All endpoints require authentication except login
- ✅ Token is stored in localStorage
- ✅ API supports full CRUD for Agents, Services, and Caches

## Next Steps

1. Implement form validation in Angular components
2. Add loading states and error handling
3. Create reusable components for CRUD operations
4. Add toast notifications for success/error messages
5. Implement real-time updates if needed
