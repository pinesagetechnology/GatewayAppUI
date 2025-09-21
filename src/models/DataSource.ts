import { DataSourceType } from "@/AppEnums";

export interface DataSourceConfig {
    id: number;
    name: string;
    sourceType: DataSourceType;
    isEnabled: boolean;
    folderPath: string | null;
    apiEndpoint: string | null;
    apiKey: string | null;
    pollingIntervalMinutes: number;
    filePattern: string | null;
    createdAt: string;            // ISO datetime string
    updatedAt: string;            // ISO datetime string
    lastProcessedAt: string | null;
    additionalSettings: string | null; // JSON string
}
