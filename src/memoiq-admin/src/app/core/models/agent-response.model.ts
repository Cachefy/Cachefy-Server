export interface ParametersDetails {
  name: string;
  parameters: { [key: string]: string };
}

export interface AgentResponse {
  id: string;
  parametersDetails: ParametersDetails[];
  cacheKeys: string[];
  cacheResult: any;
}
