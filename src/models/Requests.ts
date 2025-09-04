import { DataSourceType } from "@/AppEnums";

export interface AzureStorageConfigRequest {
    connectionString?: string | null;
    defaultContainer?: string | null;
    maxConcurrentUploads?: number | null; // int32
}

// Matches: AzureTestUploadRequest
export interface AzureTestUploadRequest {
    fileName?: string | null;
    containerName?: string | null;
    content?: string | null; // e.g., base64 or plain text per your API
}

// Matches: CreateDataSourceRequest
export interface CreateDataSourceRequest {
    name?: string | null;
    sourceType?: DataSourceType;      // enum int32
    isEnabled?: boolean;
    folderPath?: string | null;
    apiEndpoint?: string | null;
    apiKey?: string | null;
    pollingIntervalMinutes?: number;  // int32
    filePattern?: string | null;
    additionalSettings?: string | null; // JSON string
}

// Matches: UpdateDataSourceRequest (no sourceType in swagger)
export interface UpdateDataSourceRequest {
    name?: string | null;
    isEnabled?: boolean;
    folderPath?: string | null;
    apiEndpoint?: string | null;
    apiKey?: string | null;
    pollingIntervalMinutes?: number;  // int32
    filePattern?: string | null;
    additionalSettings?: string | null;
}

// Matches: SetConfigRequest
export interface SetConfigRequest {
    key?: string | null;
    value?: string | null;
    description?: string | null;
    category?: string | null;
}