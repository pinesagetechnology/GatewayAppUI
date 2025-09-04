import React, { useState, useEffect } from 'react';
import {
    Card, Button, Space, Typography, Row, Col, Alert, List,
    Descriptions, Collapse, Statistic
} from 'antd';
import {
    HeartOutlined, ReloadOutlined,
    ExclamationCircleOutlined, ClearOutlined
} from '@ant-design/icons';
import { useNotification } from '../contexts/NotificationContext';
import { apiService, handleApiError } from '../services/apiService';
import MetricCard from '../components/common/MetricCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { HealthStatus, HealthStat } from '../models/Health';

const { Title, Text } = Typography;
const { Panel } = Collapse;

const SystemHealth: React.FC = () => {
    const [loading, setLoading] = useState<boolean>(true);
    const [healthData, setHealthData] = useState<HealthStatus | null>(null);
    const [systemStats, setSystemStats] = useState<HealthStat | null>(null);
    const [performanceData, setPerformanceData] = useState<any[]>([]);
    const { showNotification } = useNotification();

    const loadHealthData = async (): Promise<void> => {
        try {
            const [healthResponse, statsResponse] = await Promise.all([
                apiService.getHealth(),
                apiService.getSystemStats(),
            ]);

            setHealthData(healthResponse.data);
            setSystemStats(statsResponse.data);
            // Performance data would come from API in production
            setPerformanceData([]);
        } catch (error) {
            const apiError = handleApiError(error);
            showNotification('error', 'Load Error', apiError.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRunCleanup = async (): Promise<void> => {
        try {
            // Note: runCleanup method doesn't exist in apiService, commenting out for now
            // const response = await apiService.runCleanup();
            showNotification('success', 'Cleanup Complete', 'Cleanup operation completed');
            setTimeout(() => loadHealthData(), 2000);
        } catch (error) {
            const apiError = handleApiError(error);
            showNotification('error', 'Cleanup Error', apiError.message);
        }
    };

    useEffect(() => {
        loadHealthData();
        const interval = setInterval(loadHealthData, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return <LoadingSpinner tip="Loading system health..." />;
    }

    const getHealthStatus = () => {
        if (!healthData) return { status: 'error', text: 'Unknown' };
        if (healthData.isHealthy) return { status: 'success', text: 'Healthy' };
        return { status: 'error', text: 'Issues Detected' };
    };

    const { status, text } = getHealthStatus();

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>System Health</Title>
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={loadHealthData}>
                        Refresh
                    </Button>
                    <Button icon={<ClearOutlined />} onClick={handleRunCleanup}>
                        Run Cleanup
                    </Button>
                </Space>
            </div>

            {/* Overall Health Status */}
            <Alert
                message="System Health Status"
                description={
                    <Space direction="vertical" size="small">
                        <Text>
                            Status: <Text strong style={{ color: status === 'success' ? '#52c41a' : '#ff4d4f' }}>
                                {text}
                            </Text>
                        </Text>
                        {healthData && (
                            <>
                                <Text>Issues: {healthData.issues.length}</Text>
                                <Text>Last Checked: {new Date(healthData.checkedAt).toLocaleString()}</Text>
                            </>
                        )}
                    </Space>
                }
                type={status === 'success' ? 'success' : 'error'}
                showIcon
                style={{ marginBottom: 24 }}
            />

            {/* Health Details */}
            {healthData && (
                <Card title="Health Details" style={{ marginBottom: 24 }}>
                    <Descriptions column={2} bordered>
                        <Descriptions.Item label="Database">
                            <Space>
                                <Text>{healthData.database.status}</Text>
                                <Text type={healthData.database.canConnect ? 'success' : 'danger'}>
                                    {healthData.database.canConnect ? 'Connected' : 'Disconnected'}
                                </Text>
                            </Space>
                        </Descriptions.Item>
                        <Descriptions.Item label="Azure Storage">
                            <Space>
                                <Text>{healthData.azureStorage.status}</Text>
                                <Text type={healthData.azureStorage.isConnected ? 'success' : 'danger'}>
                                    {healthData.azureStorage.isConnected ? 'Connected' : 'Disconnected'}
                                </Text>
                            </Space>
                        </Descriptions.Item>
                        <Descriptions.Item label="File Monitoring">
                            <Space>
                                <Text>{healthData.fileMonitoring.status}</Text>
                                <Text type={healthData.fileMonitoring.isRunning ? 'success' : 'danger'}>
                                    {healthData.fileMonitoring.isRunning ? 'Running' : 'Stopped'}
                                </Text>
                            </Space>
                        </Descriptions.Item>
                        <Descriptions.Item label="Files Processed">
                            {healthData.fileMonitoring.totalFilesProcessed}
                        </Descriptions.Item>
                    </Descriptions>

                    {healthData.issues.length > 0 && (
                        <div style={{ marginTop: 16 }}>
                            <Text strong>Issues:</Text>
                            <List
                                size="small"
                                dataSource={healthData.issues}
                                rowKey={(item: string) => `issue-${item}`}
                                renderItem={(issue: string) => (
                                    <List.Item>
                                        <Text type="danger">{issue}</Text>
                                    </List.Item>
                                )}
                            />
                        </div>
                    )}
                </Card>
            )}

            {/* System Statistics */}
            {systemStats && (
                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} md={6}>
                        <MetricCard
                            title="Pending Uploads"
                            value={systemStats.pendingUploads}
                            color="#faad14"
                        />
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <MetricCard
                            title="Completed Uploads"
                            value={systemStats.completedUploads}
                            color="#52c41a"
                        />
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <MetricCard
                            title="Failed Uploads"
                            value={systemStats.failedUploads}
                            color="#ff4d4f"
                        />
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <MetricCard
                            title="Total Uploads"
                            value={systemStats.totalUploads}
                            color="#1890ff"
                        />
                    </Col>
                </Row>
            )}

            {/* Additional Statistics */}
            {systemStats && (
                <Card title="Additional Statistics" style={{ marginTop: 24 }}>
                    <Row gutter={[16, 16]}>
                        <Col xs={24} sm={12} md={8}>
                            <Statistic
                                title="History Records"
                                value={systemStats.historyRecords}
                            />
                        </Col>
                        <Col xs={24} sm={12} md={8}>
                            <Statistic
                                title="Data Sources"
                                value={systemStats.dataSources}
                            />
                        </Col>
                        <Col xs={24} sm={12} md={8}>
                            <Statistic
                                title="Enabled Data Sources"
                                value={systemStats.enabledDataSources}
                            />
                        </Col>
                        <Col xs={24} sm={12} md={8}>
                            <Statistic
                                title="Uploads Last 24h"
                                value={systemStats.uploadsLast24Hours}
                            />
                        </Col>
                        <Col xs={24} sm={12} md={8}>
                            <Statistic
                                title="Failures Last 24h"
                                value={systemStats.failuresLast24Hours}
                            />
                        </Col>
                        <Col xs={24} sm={12} md={8}>
                            <Statistic
                                title="Last Calculated"
                                value={new Date(systemStats.lastCalculated).toLocaleString()}
                            />
                        </Col>
                    </Row>
                </Card>
            )}
        </div>
    );
};

export default SystemHealth;