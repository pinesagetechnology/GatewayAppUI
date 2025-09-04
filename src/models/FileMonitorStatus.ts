import { DataSourceType } from "@/AppEnums";

export interface DataSourceStatus {
    id: number;
    name: string;
    type: DataSourceType;
    isEnabled: boolean;
    isActive: boolean;
    lastActivity: string | null;   // ISO 8601 datetime string
    filesProcessed: number;
    lastError: string | null;
    lastErrorAt: string | null;    // ISO 8601 datetime string
}

export interface FileMonitoringStatus {
    isRunning: boolean;
    startedAt: string;             // ISO 8601 datetime string
    activeFolderWatchers: number;
    activeApiPollers: number;
    totalFilesProcessed: number;
    lastFileProcessed: string | null;
    dataSources: DataSourceStatus[];
}
