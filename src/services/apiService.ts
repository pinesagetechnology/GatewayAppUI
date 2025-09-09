import { DataSourceConfig } from '@/models/DataSource';
import { FileMonitoringStatus } from '@/models/FileMonitorStatus';
import { HealthStat, HealthStatus } from '@/models/Health';
import { UploadQueueSummary } from '@/models/QueueSummary';
import { AzureStorageInfo, BlobInfoResponse, ContainerList } from '@/models/AzureStorageInfo';
import { UploadProcessStatus } from '@/models/Upload';
import axios, { AxiosResponse, AxiosRequestConfig } from 'axios';
import { DatabaseConfig } from '@/models/DatabaseConfig';
import { AzureStorageConfigRequest, CreateDataSourceRequest, UpdateDataSourceRequest } from '@/models/Requests';
import { ApiError } from '@/models/ApiError';
import { ApiPollingStatus } from '@/models/ApiPollingStatus';

const API_BASE_URL = process.env.NODE_ENV === 'development' ? 'https://localhost:7057' : 'https://127.0.0.1:5000';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor
apiClient.interceptors.request.use(
    (config) => {
        // Add auth token if available
        const token = localStorage.getItem('authToken');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor
apiClient.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Handle unauthorized access
            localStorage.removeItem('authToken');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// API service methods
export const apiService = {
    // Health and system
    getHealth: (): Promise<AxiosResponse<HealthStatus>> =>
        apiClient.get('/api/health'),
    getSystemStats: (): Promise<AxiosResponse<HealthStat>> =>
        apiClient.get('/api/health/stats'),

    // Upload processor
    getUploadProcessorStatus: (): Promise<AxiosResponse<UploadProcessStatus>> =>
        apiClient.get('/api/uploadprocessor/status'),
    startUploadProcessor: (): Promise<AxiosResponse<void>> =>
        apiClient.post('/api/uploadprocessor/start'),
    stopUploadProcessor: (): Promise<AxiosResponse<void>> =>
        apiClient.post('/api/uploadprocessor/stop'),
    pauseUploadProcessor: (): Promise<AxiosResponse<void>> =>
        apiClient.post('/api/uploadprocessor/pause'),
    resumeUploadProcessor: (): Promise<AxiosResponse<void>> =>
        apiClient.post('/api/uploadprocessor/resume'),
    processUploadsNow: (maxConcurrent: number = 3): Promise<AxiosResponse<void>> =>
        apiClient.post(`/api/uploadprocessor/process-now?maxConcurrent=${maxConcurrent}`),
    retryFailedUploads: (): Promise<AxiosResponse<void>> =>
        apiClient.post('/api/uploadprocessor/retry-failed'),
    getQueueSummary: (): Promise<AxiosResponse<UploadQueueSummary>> =>
        apiClient.get('/api/uploadprocessor/queue-summary'),

    // File monitoring
    getFileMonitoringStatus: (): Promise<AxiosResponse<FileMonitoringStatus>> =>
        apiClient.get('/api/filemonitoring/status'),
    startFileMonitoring: (): Promise<AxiosResponse<void>> =>
        apiClient.post('/api/filemonitoring/start'),
    stopFileMonitoring: (): Promise<AxiosResponse<void>> =>
        apiClient.post('/api/filemonitoring/stop'),
    refreshDataSources: (): Promise<AxiosResponse<void>> =>
        apiClient.post('/api/filemonitoring/refresh'),

    // ApiPolling (External API Datasource control)
    getApiPollingStatus: (): Promise<AxiosResponse<ApiPollingStatus>> =>
        apiClient.get('/api/ApiPolling/status'),
    startApiPolling: (): Promise<AxiosResponse<void>> =>
        apiClient.post('/api/ApiPolling/start'),
    stopApiPolling: (): Promise<AxiosResponse<void>> =>
        apiClient.post('/api/ApiPolling/stop'),
    refreshApiPolling: (): Promise<AxiosResponse<void>> =>
        apiClient.post('/api/ApiPolling/refresh'),

    // Data sources
    getDataSources: (): Promise<AxiosResponse<DataSourceConfig[]>> =>
        apiClient.get('/api/datasource'),
    getDataSource: (id: string | number): Promise<AxiosResponse<DataSourceConfig>> =>
        apiClient.get(`/api/datasource/${id}`),
    createDataSource: (data: Partial<CreateDataSourceRequest>): Promise<AxiosResponse<CreateDataSourceRequest>> =>
        apiClient.post('/api/datasource', data),
    updateDataSource: (id: string | number, data: Partial<UpdateDataSourceRequest>): Promise<AxiosResponse<UpdateDataSourceRequest>> =>
        apiClient.put(`/api/datasource/${id}`, data),
    deleteDataSource: (id: string | number): Promise<AxiosResponse<void>> =>
        apiClient.delete(`/api/datasource/${id}`),
    toggleDataSource: (id: string | number): Promise<AxiosResponse<void>> =>
        apiClient.post(`/api/datasource/${id}/toggle`),

    // Azure Storage
    getAzureStorageInfo: (): Promise<AxiosResponse<AzureStorageInfo>> =>
        apiClient.get('/api/azurestorage/info'),
    listContainers: (): Promise<AxiosResponse<ContainerList[]>> =>
        apiClient.get('/api/azurestorage/containers'),
    listBlobs: (containerName: string, prefix?: string): Promise<AxiosResponse<BlobInfoResponse>> =>
        apiClient.get(`/api/azurestorage/containers/${containerName}/blobs`, {
            params: { prefix }
        }),
    createContainer: (containerName: string): Promise<AxiosResponse<void>> =>
        apiClient.post(`/api/azurestorage/containers/${containerName}`),
    deleteBlob: (containerName: string, blobName: string): Promise<AxiosResponse<void>> =>
        apiClient.delete(`/api/azurestorage/containers/${containerName}/blobs/${blobName}`),
    configureAzureStorage: (config: AzureStorageConfigRequest): Promise<AxiosResponse<void>> =>
        apiClient.post('/api/azurestorage/configure', config),

    // Database and configuration
    getConfigurations: (): Promise<AxiosResponse<DatabaseConfig[]>> =>
        apiClient.get('/api/database/config'),
    setConfiguration: (config: DatabaseConfig): Promise<AxiosResponse<void>> =>
        apiClient.post('/api/database/config', config),
};

// Utility functions for API responses
export const handleApiError = (error: any, defaultMessage: string = 'An error occurred'): ApiError => {
    const message = error.response?.data?.message ||
        error.response?.data?.Error ||
        error.message ||
        defaultMessage;

    const details = error.response?.data?.Details ||
        error.response?.data?.details ||
        '';

    return {
        message,
        details,
        status: error.response?.status,
        data: error.response?.data,
    };
};

export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDuration = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
};

export const getStatusColor = (status?: string | any): string => {
    const statusStr = typeof status === 'string' ? status : String(status || '');
    switch (statusStr.toLowerCase()) {
        case 'completed':
        case 'success':
        case 'active':
        case 'connected':
            return '#52c41a';
        case 'failed':
        case 'error':
        case 'disconnected':
            return '#ff4d4f';
        case 'pending':
        case 'processing':
        case 'uploading':
        case 'warning':
            return '#faad14';
        case 'paused':
        case 'inactive':
        case 'disabled':
            return '#d9d9d9';
        default:
            return '#1890ff';
    }
};

export const formatDateTime = (dateTime: string | Date | null): string => {
    if (!dateTime) return 'N/A';
    try {
        const date = new Date(dateTime);
        if (isNaN(date.getTime())) return 'Invalid Date';
        return date.toLocaleString();
    } catch (error) {
        return 'Invalid Date';
    }
};

export default apiService;
