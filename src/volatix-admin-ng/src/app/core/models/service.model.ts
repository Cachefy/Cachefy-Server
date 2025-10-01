export interface Service {
  id?: string;
  serviceId?: string;
  name: string;
  status?: string;
  instances?: number;
  lastSeen?: string;
  lastSeenText?: string;
}
