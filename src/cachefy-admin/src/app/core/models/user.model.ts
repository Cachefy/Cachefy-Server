export interface User {
  id: string;
  email: string;
  role: string; // 'Admin', 'Manager', or 'User'
  linkedServiceNames: string[]; // Names of services this user has access to
  createdAt: string;
  updatedAt: string;
}

export enum UserRole {
  ADMIN = 'Admin',
  MANAGER = 'Manager',
  USER = 'User',
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}
