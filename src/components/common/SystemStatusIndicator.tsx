// src/components/common/SystemStatusIndicator.tsx - Real-time system status indicator
import React, { useState, useEffect } from 'react';
import { Space, Badge, Tooltip, Typography } from 'antd';
import { useSignalR } from '../../contexts/SignalRContext';
import { apiService } from '../../services/apiService';

const { Text } = Typography;

interface SystemStatus {
    processor: {
        isRunning: boolean;
        isPaused: boolean;
    };
    monitoring: {
        isRunning: boolean;
    };
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
        processor: { isRunning: false, isPaused: false },
        monitoring: { isRunning: false },
        azure: { isConnected: false },
        database: { isHealthy: true },
    });
    const { connectionStatus } = useSignalR();

    const loadSystemStatus = async (): Promise<void> => {
        try {
            const [processorRes, monitoringRes, azureRes, healthRes] = await Promise.allSettled([
                apiService.getUploadProcessorStatus(),
                apiService.getFileMonitoringStatus(),
                apiService.getAzureStorageInfo(),
                apiService.getHealth(),
            ]);

            setSystemStatus({
                processor: {
                    isRunning: processorRes.status === 'fulfilled' ? processorRes.value.data.isRunning : false,
                    isPaused: processorRes.status === 'fulfilled' ? processorRes.value.data.isPaused : false,
                },
                monitoring: {
                    isRunning: monitoringRes.status === 'fulfilled' ? monitoringRes.value.data.isRunning : false,
                },
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
        const interval = setInterval(loadSystemStatus, 30000); // Update every 30 seconds
        return () => clearInterval(interval);
    }, []);

    const getOverallStatus = (): OverallStatus => {
        const { processor, monitoring, azure, database } = systemStatus;

        if (!database.isHealthy) return { status: 'error', text: 'System Error' };
        if (!processor.isRunning && !monitoring.isRunning) return { status: 'default', text: 'Services Stopped' };
        if (processor.isPaused) return { status: 'warning', text: 'Services Paused' };
        if (!azure.isConnected) return { status: 'warning', text: 'Azure Disconnected' };
        if (processor.isRunning || monitoring.isRunning) return { status: 'success', text: 'System Running' };

        return { status: 'processing', text: 'System Starting' };
    };

    const { status, text } = getOverallStatus();

    const tooltipContent = (
        <div>
            <div><strong>System Status</strong></div>
            <div>Processor: {systemStatus.processor.isRunning ? (systemStatus.processor.isPaused ? 'Paused' : 'Running') : 'Stopped'}</div>
            <div>Monitoring: {systemStatus.monitoring.isRunning ? 'Running' : 'Stopped'}</div>
            <div>Azure: {systemStatus.azure.isConnected ? 'Connected' : 'Disconnected'}</div>
            <div>Database: {systemStatus.database.isHealthy ? 'Healthy' : 'Error'}</div>
            <div>Real-time: {connectionStatus}</div>
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
