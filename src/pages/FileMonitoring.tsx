import React, { useState, useEffect } from 'react';
import { Card, Button, Space, Typography, Row, Col, List, Tag, Empty } from 'antd';
import {
    PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined,
    FolderOutlined, ApiOutlined, CheckCircleOutlined, SyncOutlined,
    ExclamationCircleOutlined
} from '@ant-design/icons';
import { useNotification } from '../contexts/NotificationContext';
import { apiService, formatDateTime, handleApiError } from '../services/apiService';
import { FileMonitoringStatus } from '../models/FileMonitorStatus';
import MetricCard from '../components/common/MetricCard';
import LoadingSpinner from '../components/common/LoadingSpinner';

const { Title, Text } = Typography;

const FileMonitoring: React.FC = () => {
    const [loading, setLoading] = useState<boolean>(true);
    const [monitoringStatus, setMonitoringStatus] = useState<FileMonitoringStatus | null>(null);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const { showNotification } = useNotification();

    const loadMonitoringStatus = async (): Promise<void> => {
        try {
            const response = await apiService.getFileMonitoringStatus();
            setMonitoringStatus(response.data);
        } catch (error) {
            const apiError = handleApiError(error);
            showNotification('error', 'Load Error', apiError.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleToggleMonitoring = async (): Promise<void> => {
        try {
            if (monitoringStatus?.isRunning) {
                await apiService.stopFileMonitoring();
                showNotification('success', 'Stopped', 'File monitoring has been stopped');
            } else {
                await apiService.startFileMonitoring();
                showNotification('success', 'Started', 'File monitoring has been started');
            }
            setTimeout(() => loadMonitoringStatus(), 1000);
        } catch (error) {
            const apiError = handleApiError(error);
            showNotification('error', 'Control Error', apiError.message);
        }
    };

    const handleRefreshDataSources = async (): Promise<void> => {
        try {
            await apiService.refreshDataSources();
            showNotification('success', 'Refreshed', 'Data sources have been refreshed');
            setTimeout(() => loadMonitoringStatus(), 1000);
        } catch (error) {
            const apiError = handleApiError(error);
            showNotification('error', 'Refresh Error', apiError.message);
        }
    };

    const handleRefresh = async (): Promise<void> => {
        setRefreshing(true);
        await loadMonitoringStatus();
    };

    useEffect(() => {
        loadMonitoringStatus();
        const interval = setInterval(loadMonitoringStatus, 15000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return <LoadingSpinner tip="Loading monitoring status..." />;
    }

    const getDataSourceIcon = ({ type }: { type: string }) => {
        return type === 'Folder' ? <FolderOutlined /> : <ApiOutlined />;
    };

    const getDataSourceColor = ({ isActive, hasError }: { isActive: boolean; hasError: boolean }) => {
        if (hasError) return '#ff4d4f';
        return isActive ? '#52c41a' : '#d9d9d9';
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>File Monitoring</Title>
                <Space>
                    <Button
                        icon={<ReloadOutlined spin={refreshing} />}
                        onClick={handleRefresh}
                        loading={refreshing}
                    >
                        Refresh
                    </Button>
                </Space>
            </div>

            {/* Service Status */}
            <Card style={{ marginBottom: 24 }}>
                <Row gutter={[16, 16]} align="middle">
                    <Col flex="auto">
                        <Space size="large">
                            <div>
                                <Text strong>Service Status: </Text>
                                <Tag color={monitoringStatus?.isRunning ? 'green' : 'red'}>
                                    {monitoringStatus?.isRunning ? 'Running' : 'Stopped'}
                                </Tag>
                            </div>

                            {monitoringStatus?.isRunning && (
                                <>
                                    <div>
                                        <Text strong>Started: </Text>
                                        <Text>{formatDateTime(monitoringStatus.startedAt)}</Text>
                                    </div>
                                    <div>
                                        <Text strong>Files Processed: </Text>
                                        <Text>{monitoringStatus.totalFilesProcessed || 0}</Text>
                                    </div>
                                </>
                            )}
                        </Space>
                    </Col>

                    <Col>
                        <Space>
                            <Button
                                type={monitoringStatus?.isRunning ? 'default' : 'primary'}
                                size="large"
                                icon={monitoringStatus?.isRunning ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                                onClick={handleToggleMonitoring}
                            >
                                {monitoringStatus?.isRunning ? 'Stop Monitoring' : 'Start Monitoring'}
                            </Button>

                            <Button
                                icon={<SyncOutlined />}
                                onClick={handleRefreshDataSources}
                                disabled={!monitoringStatus?.isRunning}
                            >
                                Refresh Sources
                            </Button>
                        </Space>
                    </Col>
                </Row>
            </Card>

            {/* Metrics */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={12} md={6}>
                    <MetricCard
                        title="Active Watchers"
                        value={monitoringStatus?.activeFolderWatchers || 0}
                        prefix={<FolderOutlined />}
                        color="#1890ff"
                        size="small"
                    />
                </Col>
                <Col xs={12} md={6}>
                    <MetricCard
                        title="Active Pollers"
                        value={monitoringStatus?.activeApiPollers || 0}
                        prefix={<ApiOutlined />}
                        color="#722ed1"
                        size="small"
                    />
                </Col>
                <Col xs={12} md={6}>
                    <MetricCard
                        title="Files Processed"
                        value={monitoringStatus?.totalFilesProcessed || 0}
                        prefix={<CheckCircleOutlined />}
                        color="#52c41a"
                        size="small"
                    />
                </Col>
                <Col xs={12} md={6}>
                    <MetricCard
                        title="Last Activity"
                        value={monitoringStatus?.lastFileProcessed ? 'Recent' : 'None'}
                        color="#faad14"
                        size="small"
                    />
                </Col>
            </Row>

            {/* Data Sources Status */}
            <Card title="Data Sources Status" size="small">
                {monitoringStatus?.dataSources && monitoringStatus.dataSources.length > 0 ? (<List
                        dataSource={monitoringStatus.dataSources}
                        rowKey={(item) => item.id || item.name}
                        renderItem={(source: any) => (
                            <List.Item
                                actions={[
                                    <Tag color={getDataSourceColor({ isActive: source.isActive, hasError: !!source.lastError })}>
                                        {source.isActive ? 'Active' : 'Inactive'}
                                    </Tag>
                                ]}
                            >
                                <List.Item.Meta
                                    avatar={getDataSourceIcon({ type: source.type })}
                                    title={
                                        <Space>
                                            <Text strong>{source.name}</Text>
                                            {!source.isEnabled && <Tag>Disabled</Tag>}
                                            {source.lastError && <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
                                        </Space>
                                    }
                                    description={
                                        <Space direction="vertical" size="small">
                                            <Text type="secondary">
                                                Type: {source.type} • Files: {source.filesProcessed || 0}
                                            </Text>
                                            {source.lastActivity && (
                                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                                    Last Activity: {formatDateTime(source.lastActivity)}
                                                </Text>
                                            )}
                                            {source.lastError && (
                                                <Text type="danger" style={{ fontSize: '12px' }}>
                                                    Error: {source.lastError}
                                                    {source.lastErrorAt && ` (${formatDateTime(source.lastErrorAt)})`}
                                                </Text>
                                            )}
                                        </Space>
                                    }
                                />
                            </List.Item>
                        )}
                    />
                ) : (
                    <Empty description="No data sources configured" />
                )}
            </Card>
        </div>
    );
};

export default FileMonitoring;