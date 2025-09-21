// src/components/common/SystemStatusIndicator.tsx - System status indicator
import React, { useState, useEffect } from 'react';
import { Space, Badge, Tooltip, Typography } from 'antd';
import { apiService } from '../../services/apiService';

const { Text } = Typography;

interface SystemStatus {
    azure: {
        isConnected: boolean;
    };
    database: {
        isHealthy: boolean;
    };
}

interface OverallStatus {
    status: 'success' | 'error' | 'warning' | 'processing' | 'default';
    text: string;
}

const SystemStatusIndicator: React.FC = () => {
    const [systemStatus, setSystemStatus] = useState<SystemStatus>({
        azure: { isConnected: false },
        database: { isHealthy: true },
    });

    const loadSystemStatus = async (): Promise<void> => {
        try {
            const [azureRes, healthRes] = await Promise.allSettled([
                apiService.getAzureStorageInfo(),
                apiService.getHealth(),
            ]);

            setSystemStatus({
                azure: {
                    isConnected: azureRes.status === 'fulfilled' ? azureRes.value.data.isConnected : false,
                },
                database: {
                    isHealthy: healthRes.status === 'fulfilled' ? healthRes.value.data.isHealthy : false,
                },
            });
        } catch (error) {
            console.error('Error loading system status:', error);
        }
    };

    useEffect(() => {
        loadSystemStatus();
    }, []);

    const getOverallStatus = (): OverallStatus => {
        const { azure, database } = systemStatus;

        if (!database.isHealthy) return { status: 'error', text: 'System Error' };
        if (!azure.isConnected) return { status: 'warning', text: 'Azure Disconnected' };
        return { status: 'success', text: 'System Running' };
    };

    const { status, text } = getOverallStatus();

    const tooltipContent = (
        <div>
            <div><strong>System Status</strong></div>
            <div>Azure: {systemStatus.azure.isConnected ? 'Connected' : 'Disconnected'}</div>
            <div>Database: {systemStatus.database.isHealthy ? 'Healthy' : 'Error'}</div>
        </div>
    );

    return (
        <Tooltip title={tooltipContent}>
            <Space>
                <Badge status={status} />
                <Text style={{ fontSize: '14px' }}>{text}</Text>
            </Space>
        </Tooltip>
    );
};

export default SystemStatusIndicator;
