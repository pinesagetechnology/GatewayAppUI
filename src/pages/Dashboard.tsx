import React, { useState, useEffect } from 'react';
import {
    Row, Col, Card, Statistic, Progress, List, Tag, Typography,
    Button, Space, Alert, Spin, Empty
} from 'antd';
import {
    CloudUploadOutlined, DatabaseOutlined, SyncOutlined,
    PlayCircleOutlined, PauseCircleOutlined, FolderOutlined, ApiOutlined
} from '@ant-design/icons';
import { useSignalR } from '../contexts/SignalRContext';
import { useNotification } from '../contexts/NotificationContext';
import { apiService, formatFileSize, getStatusColor, handleApiError } from '../services/apiService';
import { UploadProcessStatus } from '../models/Upload';
import { FileMonitoringStatus } from '../models/FileMonitorStatus';
import { UploadQueueSummary } from '../models/QueueSummary';
import { HealthStatus } from '../models/Health';
import { AzureStorageInfo } from '../models/AzureStorageInfo';
import { ApiPollingStatus } from '@/models/ApiPollingStatus';

const { Title, Text } = Typography;

interface DashboardData {
    processorStatus: UploadProcessStatus | null;
    monitoringStatus: FileMonitoringStatus | null;
    apiPollingStatus: ApiPollingStatus | null;
    queueSummary: UploadQueueSummary | null;
    systemHealth: HealthStatus | null;
    azureInfo: AzureStorageInfo | null;
    recentUploads: UploadItem[];
    dataSources: any[];
}

interface UploadItem {
    FileName: string;
    FileSizeBytes: number;
    CreatedAt: string;
    Status: string;
    ErrorMessage?: string;
    ProgressPercent?: number;
}

const Dashboard: React.FC = () => {
    const [loading, setLoading] = useState<boolean>(true);
    const [dashboardData, setDashboardData] = useState<DashboardData>({
        processorStatus: null,
        monitoringStatus: null,
        apiPollingStatus: null,
        queueSummary: null,
        systemHealth: null,
        azureInfo: null,
        recentUploads: [],
        dataSources: [],
    });
    const [refreshing, setRefreshing] = useState<boolean>(false);

    const { connectionStatus, uploadUpdates } = useSignalR();
    const { showNotification } = useNotification();

    const loadDashboardData = async (): Promise<void> => {
        try {
            setLoading(true);

            const [
                processorResponse,
                monitoringResponse,
                apiPollingResponse,
                queueResponse,
                healthResponse,
                azureResponse,
                dataSourcesResponse,
            ] = await Promise.allSettled([
                apiService.getUploadProcessorStatus(),
                apiService.getFileMonitoringStatus(),
                apiService.getApiPollingStatus(),
                apiService.getQueueSummary(),
                apiService.getHealth(),
                apiService.getAzureStorageInfo(),
                apiService.getDataSources(),
            ]);

            const newData = { ...dashboardData };

            // Process responses
            if (processorResponse.status === 'fulfilled') {
                newData.processorStatus = processorResponse.value.data as UploadProcessStatus;
            }

            if (monitoringResponse.status === 'fulfilled') {
                newData.monitoringStatus = monitoringResponse.value.data as FileMonitoringStatus;
            }

            if (apiPollingResponse.status === 'fulfilled') {
                newData.apiPollingStatus = apiPollingResponse.value.data as ApiPollingStatus;
            }

            if (queueResponse.status === 'fulfilled') {
                const queueData = queueResponse.value.data as UploadQueueSummary;
                newData.queueSummary = queueData;
                // Normalize recentUploads to UploadItem[] with expected casing
                newData.recentUploads = (queueData.recentUploads || []).map((u) => ({
                    FileName: (u as any).FileName ?? (u as any).fileName ?? '',
                    FileSizeBytes: (u as any).FileSizeBytes ?? (u as any).fileSize ?? 0,
                    CreatedAt: (u as any).CreatedAt ?? (u as any).createdAt ?? new Date().toISOString(),
                    Status: (u as any).Status ?? (u as any).status ?? 'Pending',
                    ErrorMessage: (u as any).ErrorMessage,
                    ProgressPercent: (u as any).ProgressPercent,
                }));

            }

            if (healthResponse.status === 'fulfilled') {
                newData.systemHealth = healthResponse.value.data as HealthStatus;
            }

            if (azureResponse.status === 'fulfilled') {
                newData.azureInfo = azureResponse.value.data as AzureStorageInfo;
            }

            if (dataSourcesResponse.status === 'fulfilled') {
                newData.dataSources = dataSourcesResponse.value.data || [];
            }

            setDashboardData(newData);
        } catch (error) {
            const apiError = handleApiError(error);
            showNotification('error', 'Dashboard Error', apiError.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = async (): Promise<void> => {
        setRefreshing(true);
        await loadDashboardData();
    };

    const handleProcessorToggle = async (): Promise<void> => {
        try {
            const { processorStatus } = dashboardData;
            if (processorStatus?.isRunning) {
                await apiService.stopUploadProcessor();
                showNotification('success', 'Processor Stopped', 'Upload processor has been stopped');
            } else {
                await apiService.startUploadProcessor();
                showNotification('success', 'Processor Started', 'Upload processor has been started');
            }

            // Refresh data after a short delay
            setTimeout(() => loadDashboardData(), 1000);
        } catch (error) {
            const apiError = handleApiError(error);
            showNotification('error', 'Control Error', apiError.message);
        }
    };

    const handleMonitoringToggle = async (): Promise<void> => {
        try {
            const { monitoringStatus } = dashboardData;
            if (monitoringStatus?.isRunning) {
                await apiService.stopFileMonitoring();
                showNotification('success', 'Monitoring Stopped', 'File monitoring has been stopped');
            } else {
                await apiService.startFileMonitoring();
                showNotification('success', 'Monitoring Started', 'File monitoring has been started');
            }

            // Refresh data after a short delay
            setTimeout(() => loadDashboardData(), 1000);
        } catch (error) {
            const apiError = handleApiError(error);
            showNotification('error', 'Control Error', apiError.message);
        }
    };

    const handleApiPollingToggle = async (): Promise<void> => {
        try {
            const { apiPollingStatus } = dashboardData;
            if (apiPollingStatus?.isRunning) {
                await apiService.stopApiPolling();
                showNotification('success', 'API Polling Stopped', 'API polling has been stopped');
            } else {
                await apiService.startApiPolling();
                showNotification('success', 'API Polling Started', 'API polling has been started');
            }

            // Refresh data after a short delay
            setTimeout(() => loadDashboardData(), 1000);
        } catch (error) {
            const apiError = handleApiError(error);
            showNotification('error', 'Control Error', apiError.message);
        }
    };

    useEffect(() => {
        loadDashboardData();

        // Set up auto-refresh every 30 seconds
        const interval = setInterval(loadDashboardData, 30000);

        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <Spin size="large" />
            </div>
        );
    }

    const { processorStatus, monitoringStatus, apiPollingStatus, queueSummary, systemHealth, azureInfo, recentUploads, dataSources } = dashboardData;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>Dashboard</Title>
                <Space>
                    <div className="status-indicator">
                        <div className={`real-time-indicator ${connectionStatus === 'Connected' ? 'online' : 'offline'}`} />
                        <Text type="secondary">Real-time: {connectionStatus}</Text>
                    </div>
                    <Button
                        icon={<SyncOutlined spin={refreshing} />}
                        onClick={handleRefresh}
                        loading={refreshing}
                    >
                        Refresh
                    </Button>
                </Space>
            </div>

            {/* System Status Alert */}
            {!systemHealth?.isHealthy && (
                <Alert
                    message="System Issues Detected"
                    description={
                        <div>
                            <div style={{ marginBottom: 8 }}>
                                {(systemHealth?.issues?.length || 0)} issues found:
                            </div>
                            {(systemHealth?.issues || []).map((issue, index) => (
                                <div key={index}>• {issue}</div>
                            ))}
                        </div>
                    }
                    type="warning"
                    showIcon
                    closable
                    style={{ marginBottom: 24 }}
                />
            )}

            {/* Key Metrics */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={6}>
                    <Card>
                        <Statistic
                            title="Data Sources"
                            value={dataSources.length}
                            prefix={<DatabaseOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={6}>
                    <Card>
                        <Statistic
                            title="File Monitoring"
                            value={monitoringStatus?.isRunning ? 'Active' : 'Inactive'}
                            valueStyle={{ color: monitoringStatus?.isRunning ? '#52c41a' : '#ff4d4f' }}
                            prefix={<FolderOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={6}>
                    <Card>
                        <Statistic
                            title="API Polling"
                            value={apiPollingStatus?.isRunning ? 'Active' : 'Inactive'}
                            valueStyle={{ color: apiPollingStatus?.isRunning ? '#52c41a' : '#ff4d4f' }}
                            prefix={<ApiOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={6}>
                    <Card>
                        <Statistic
                            title="Upload Processor"
                            value={processorStatus?.isRunning ? 'Running' : 'Stopped'}
                            valueStyle={{ color: processorStatus?.isRunning ? '#52c41a' : '#ff4d4f' }}
                            prefix={<CloudUploadOutlined />}
                        />
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]}>
                {/* Service Controls */}
                <Col xs={24} lg={12}>
                    <Card title="Service Controls Actions" size="small">
                        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <Text strong>Upload Processor</Text>
                                    <br />
                                    <Text type="secondary">
                                        Status: {processorStatus?.isRunning ? 'Running' : 'Stopped'}
                                        {processorStatus?.isPaused && ' (Paused)'}
                                    </Text>
                                </div>
                                <Button
                                    type={processorStatus?.isRunning ? 'default' : 'primary'}
                                    icon={processorStatus?.isRunning ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                                    onClick={handleProcessorToggle}
                                >
                                    {processorStatus?.isRunning ? 'Stop' : 'Start'}
                                </Button>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <Text strong>File Monitoring</Text>
                                    <br />
                                    <Text type="secondary">
                                        Status: {monitoringStatus?.isRunning ? 'Running' : 'Stopped'}
                                    </Text>
                                </div>
                                <Button
                                    type={monitoringStatus?.isRunning ? 'default' : 'primary'}
                                    icon={monitoringStatus?.isRunning ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                                    onClick={handleMonitoringToggle}
                                >
                                    {monitoringStatus?.isRunning ? 'Stop' : 'Start'}
                                </Button>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <Text strong>API Polling</Text>
                                    <br />
                                    <Text type="secondary">
                                        Status: {apiPollingStatus?.isRunning ? 'Running' : 'Stopped'}
                                    </Text>
                                </div>
                                <Button
                                    type={apiPollingStatus?.isRunning ? 'default' : 'primary'}
                                    icon={apiPollingStatus?.isRunning ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                                    onClick={handleApiPollingToggle}
                                >
                                    {apiPollingStatus?.isRunning ? 'Stop' : 'Start'}
                                </Button>
                            </div>
                        </Space>
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card title="Service Controls Stats" size="small">
                        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                            {processorStatus && (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <Text strong>Active Uploads:</Text>
                                        <Tag color="blue">{processorStatus.activeUploads || 0}</Tag>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <Text strong>Pending:</Text>
                                        <Tag color="orange">{processorStatus.pendingCount || 0}</Tag>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <Text strong>Completed:</Text>
                                        <Tag color="green">{processorStatus.completedCount || 0}</Tag>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <Text strong>Failed:</Text>
                                        <Tag color="red">{processorStatus.failedCount || 0}</Tag>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <Text strong>Total Uploaded:</Text>
                                        <Text>{formatFileSize(processorStatus.totalBytesUploaded || 0)}</Text>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Text strong>Avg Speed:</Text>
                                        <Text>{processorStatus.averageUploadSpeedMbps || 0} MB/s</Text>
                                    </div>
                                    {processorStatus.startedAt && (
                                        <div style={{ marginTop: 8 }}>
                                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                                Started: {new Date(processorStatus.startedAt).toLocaleString()}
                                            </Text>
                                        </div>
                                    )}
                                    {processorStatus.lastUploadCompleted && (
                                        <div>
                                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                                Last Upload: {new Date(processorStatus.lastUploadCompleted).toLocaleString()}
                                            </Text>
                                        </div>
                                    )}
                                </div>
                            )}
                        </Space>
                    </Card>
                </Col>

            </Row>

            {/* Recent Activity */}
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col xs={24} lg={12}>
                    <Card title="Recent Uploads" size="small">
                        {recentUploads.length > 0 ? (
                            <List
                                size="small"
                                dataSource={recentUploads.slice(0, 5)}
                                rowKey={(item: UploadItem) => `upload-${item.FileName}-${item.CreatedAt}`}
                                renderItem={(item: UploadItem) => (
                                    <List.Item
                                        actions={[
                                            <Tag color={getStatusColor(item.Status)}>{item.Status}</Tag>
                                        ]}
                                    >
                                        <List.Item.Meta
                                            title={item.FileName}
                                            description={
                                                <Space direction="vertical" size="small">
                                                    <Text type="secondary">
                                                        Size: {formatFileSize(item.FileSizeBytes)} •
                                                        Created: {new Date(item.CreatedAt).toLocaleString()}
                                                    </Text>
                                                    {item.Status === 'Failed' && item.ErrorMessage && (
                                                        <Text type="danger" style={{ fontSize: '12px' }}>
                                                            {item.ErrorMessage}
                                                        </Text>
                                                    )}
                                                    {item.ProgressPercent && item.ProgressPercent > 0 && item.ProgressPercent < 100 && (
                                                        <Progress
                                                            percent={Math.round(item.ProgressPercent)}
                                                            size="small"
                                                            status="active"
                                                        />
                                                    )}
                                                </Space>
                                            }
                                        />
                                    </List.Item>
                                )}
                            />
                        ) : (
                            <Empty description="No recent uploads" />
                        )}
                    </Card>
                </Col>
                {/* Azure Storage Status */}
                <Col xs={24} lg={12}>
                    <Card title="Azure Storage" size="small">
                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text strong>Connection Status</Text>
                                <Tag color={azureInfo?.isConnected ? 'green' : 'red'}>
                                    {azureInfo?.isConnected ? 'Connected' : 'Disconnected'}
                                </Tag>
                            </div>

                            {azureInfo?.isConnected ? (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Text type="secondary">Account:</Text>
                                        <Text>{azureInfo.accountName}</Text>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Text type="secondary">Containers:</Text>
                                        <Text>{azureInfo.containers?.length || 0}</Text>
                                    </div>
                                </>
                            ) : (
                                <Text type="danger">
                                    {azureInfo?.errorMessage || 'Azure Storage not configured'}
                                </Text>
                            )}

                            {(queueSummary?.totalSizeBytes ?? 0) > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Text type="secondary">Queue Size:</Text>
                                    <Text>{formatFileSize(queueSummary?.totalSizeBytes ?? 0)}</Text>
                                </div>
                            )}
                        </Space>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default Dashboard;
