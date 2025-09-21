import React, { useState, useEffect } from 'react';
import {
    Row, Col, Card, Statistic, Typography,
    Button, Space, Alert, Spin, Empty
} from 'antd';
import {
    DatabaseOutlined, SyncOutlined, CloudOutlined
} from '@ant-design/icons';
import { useNotification } from '../contexts/NotificationContext';
import { apiService, formatFileSize, getStatusColor, handleApiError } from '../services/apiService';
import { AzureStorageInfo } from '../models/AzureStorageInfo';

const { Title, Text } = Typography;

interface DashboardData {
    systemHealth: any | null;
    azureInfo: AzureStorageInfo | null;
    dataSources: any[];
}

const Dashboard: React.FC = () => {
    const [loading, setLoading] = useState<boolean>(true);
    const [dashboardData, setDashboardData] = useState<DashboardData>({
        systemHealth: null,
        azureInfo: null,
        dataSources: [],
    });
    const [refreshing, setRefreshing] = useState<boolean>(false);

    const { showNotification } = useNotification();

    const loadDashboardData = async (): Promise<void> => {
        try {
            setLoading(true);

            const [
                healthResponse,
                azureResponse,
                dataSourcesResponse,
            ] = await Promise.allSettled([
                apiService.getHealth(),
                apiService.getAzureStorageInfo(),
                apiService.getDataSources(),
            ]);

            const newData = { ...dashboardData };

            // Process responses
            if (healthResponse.status === 'fulfilled') {
                newData.systemHealth = healthResponse.value.data;
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

    useEffect(() => {
        loadDashboardData();
    }, []);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <Spin size="large" />
            </div>
        );
    }

    const { systemHealth, azureInfo, dataSources } = dashboardData;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>Dashboard</Title>
                <Space>
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
            {systemHealth && !systemHealth.isHealthy && (
                <Alert
                    message="System Issues Detected"
                    description="Please check the system configuration and status."
                    type="warning"
                    showIcon
                    closable
                    style={{ marginBottom: 24 }}
                />
            )}

            {/* Key Metrics */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={8}>
                    <Card>
                        <Statistic
                            title="Data Sources"
                            value={dataSources.length}
                            prefix={<DatabaseOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card>
                        <Statistic
                            title="System Health"
                            value={systemHealth?.isHealthy ? 'Healthy' : 'Issues'}
                            valueStyle={{ color: systemHealth?.isHealthy ? '#52c41a' : '#ff4d4f' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card>
                        <Statistic
                            title="Azure Storage"
                            value={azureInfo?.isConnected ? 'Connected' : 'Disconnected'}
                            valueStyle={{ color: azureInfo?.isConnected ? '#52c41a' : '#ff4d4f' }}
                            prefix={<CloudOutlined />}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Azure Storage Status */}
            <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                    <Card title="Azure Storage Status" size="small">
                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text strong>Connection Status</Text>
                                <Text style={{ color: azureInfo?.isConnected ? '#52c41a' : '#ff4d4f' }}>
                                    {azureInfo?.isConnected ? 'Connected' : 'Disconnected'}
                                </Text>
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
                        </Space>
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card title="Data Sources Summary" size="small">
                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Text strong>Total Sources:</Text>
                                <Text>{dataSources.length}</Text>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Text strong>Enabled:</Text>
                                <Text>{dataSources.filter(s => s.isEnabled).length}</Text>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Text strong>Folder Sources:</Text>
                                <Text>{dataSources.filter(s => s.sourceType === 0).length}</Text>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Text strong>API Sources:</Text>
                                <Text>{dataSources.filter(s => s.sourceType === 1).length}</Text>
                            </div>
                        </Space>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default Dashboard;
