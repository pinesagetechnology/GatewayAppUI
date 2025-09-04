import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import UploadQueue from './pages/UploadQueue';
import DataSources from './pages/DataSources';
import FileMonitoring from './pages/FileMonitoring';
import AzureStorage from './pages/AzureStorage';
import SystemHealth from './pages/SystemHealth';
import Settings from './pages/Settings';
import { SignalRProvider } from './contexts/SignalRContext';
import { NotificationProvider } from './contexts/NotificationContext';
import 'antd/dist/reset.css';
import './App.css';

const App: React.FC = () => {
    return (
        <ConfigProvider
            theme={{
                algorithm: theme.defaultAlgorithm,
                token: {
                    colorPrimary: '#1890ff',
                    borderRadius: 6,
                },
            }}
        >
            <NotificationProvider>
                <SignalRProvider>
                    <Router>
                        <AppLayout>
                            <Routes>
                                <Route path="/" element={<Dashboard />} />
                                <Route path="/dashboard" element={<Dashboard />} />
                                <Route path="/upload-queue" element={<UploadQueue />} />
                                <Route path="/data-sources" element={<DataSources />} />
                                <Route path="/file-monitoring" element={<FileMonitoring />} />
                                <Route path="/azure-storage" element={<AzureStorage />} />
                                <Route path="/system-health" element={<SystemHealth />} />
                                <Route path="/settings" element={<Settings />} />
                            </Routes>
                        </AppLayout>
                    </Router>
                </SignalRProvider>
            </NotificationProvider>
        </ConfigProvider>
    );
};

export default App;
