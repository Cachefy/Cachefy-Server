export interface Agent {
  id: string;
  name: string;
  url: string;
  apiKey: string;
  apiKeyGenerated?: string; // When the API key was generated
  createdAt?: string;
  updatedAt?: string;
  status?: 'online' | 'offline';
  isLoading?: boolean; // Loading state while pinging agent
  statusMessage?: string; // Message explaining the status (e.g., error message when offline)
}
