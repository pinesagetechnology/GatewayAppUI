import { DataSourceType } from "@/AppEnums";

export interface ApiPollerDataSource {
  id: number;
  name: string;
  type: DataSourceType;
  isEnabled: boolean;
  isActive: boolean;
  lastActivity: string | null;   // ISO datetime string or null
  // itemsProcessed: number;
  filesProcessed: number;
  lastError: string | null;
  lastErrorAt: string | null;
}

export interface ApiPollingStatus {
  isRunning: boolean;
  startedAt: string;             // ISO datetime string
  activeApiPollers: number;
  totalItemsProcessed: number;
  lastActivity: string | null;   // ISO datetime string or null
  dataSources: ApiPollerDataSource[];
}

export interface ApiPollingResponse {
  message: string;
}
