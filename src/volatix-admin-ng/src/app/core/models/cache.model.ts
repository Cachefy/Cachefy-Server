export interface Cache {
  serviceId: string;
  serviceName?: string;
  name: string;
  status?: string;
  items?: number;
  ttl?: number | string;
  policy?: string;
  evictionPolicy?: string;
  hits?: number;
}
