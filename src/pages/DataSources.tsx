import React, { useState, useEffect } from 'react';
import {
    Card, Button, Table, Space, Typography, Row, Col, Modal, Form,
    Input, Select, Switch, InputNumber, Tooltip, Badge, Divider,
    Popconfirm, Statistic
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined, PlayCircleOutlined,
    PauseCircleOutlined, FolderOutlined, ApiOutlined, ReloadOutlined
} from '@ant-design/icons';
import { useNotification } from '../contexts/NotificationContext';
import { apiService, handleApiError } from '../services/apiService';
import { DataSourceConfig } from '../models/DataSource';
import { DataSourceType } from '@/AppEnums';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const DataSources: React.FC = () => {
    const [loading, setLoading] = useState<boolean>(true);
    const [dataSources, setDataSources] = useState<DataSourceConfig[]>([]);
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const [editingSource, setEditingSource] = useState<DataSourceConfig | null>(null);

    const [form] = Form.useForm();
    const { showNotification } = useNotification();

    const loadDataSources = async (): Promise<void> => {
        try {
            setLoading(true);
            const response = await apiService.getDataSources();
            setDataSources(response.data || []);
        } catch (error) {
            const apiError = handleApiError(error);
            showNotification('error', 'Load Error', apiError.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateNew = () => {
        setEditingSource(null);
        form.resetFields();
        form.setFieldsValue({
            sourceType: 0, // Default to Folder
            isEnabled: true,
            pollingIntervalMinutes: 5,
            filePattern: '*.{json,jpg,jpeg,png,txt,csv}'
        });
        setModalVisible(true);
    };

    const handleEdit = (source: DataSourceConfig) => {
        setEditingSource(source);
        form.setFieldsValue({
            name: source.name,
            sourceType: source.sourceType,
            isEnabled: source.isEnabled,
            pollingIntervalMinutes: source.pollingIntervalMinutes,
            filePattern: source.filePattern,
            folderPath: source.folderPath,
            apiEndpoint: source.apiEndpoint,
            apiKey: source.apiKey,
            additionalSettings: source.additionalSettings || ''
        });
        setModalVisible(true);
    };

    const handleDelete = async (id: number) => {
        try {
            await apiService.deleteDataSource(id);
            showNotification('success', 'Data Source Deleted', 'Data source has been deleted successfully');
            loadDataSources();
        } catch (error) {
            const apiError = handleApiError(error);
            showNotification('error', 'Delete Error', apiError.message);
        }
    };

    // Separate function to enable/disable File Monitor data sources
    const handleToggleFileMonitor = async (source: DataSourceConfig) => {
        try {
            if (source.sourceType !== 0) {
                showNotification('error', 'Invalid Operation', 'This function is only for File Monitor data sources');
                return;
            }

            const updatedSource = { ...source, isEnabled: !source.isEnabled };
            await apiService.updateDataSource(source.id, updatedSource);
            
            showNotification(
                'success',
                'File Monitor Status Updated',
                `File Monitor "${source.name}" has been ${updatedSource.isEnabled ? 'enabled' : 'disabled'}`
            );
            
            loadDataSources();
        } catch (error) {
            const apiError = handleApiError(error);
            showNotification('error', 'File Monitor Update Error', apiError.message);
        }
    };

    // Separate function to enable/disable API data sources
    const handleToggleApiDataSource = async (source: DataSourceConfig) => {
        try {
            if (source.sourceType !== 1) {
                showNotification('error', 'Invalid Operation', 'This function is only for API data sources');
                return;
            }

            const updatedSource = { ...source, isEnabled: !source.isEnabled };
            await apiService.updateDataSource(source.id, updatedSource);
            
            showNotification(
                'success',
                'API Data Source Status Updated',
                `API data source "${source.name}" has been ${updatedSource.isEnabled ? 'enabled' : 'disabled'}`
            );
            
            loadDataSources();
        } catch (error) {
            const apiError = handleApiError(error);
            showNotification('error', 'API Data Source Update Error', apiError.message);
        }
    };

    // Bulk function to enable/disable all File Monitor data sources
    const handleToggleAllFileMonitors = async (enable: boolean) => {
        try {
            const fileMonitorSources = dataSources.filter(source => source.sourceType === DataSourceType.LocalFolder);
            
            if (fileMonitorSources.length === 0) {
                showNotification('info', 'No File Monitors', 'No File Monitor data sources found');
                return;
            }

            const updatePromises = fileMonitorSources.map(source => 
                apiService.updateDataSource(source.id, { ...source, isEnabled: enable })
            );

            await Promise.all(updatePromises);
            
            showNotification(
                'success',
                'Bulk File Monitor Update',
                `All File Monitor data sources have been ${enable ? 'enabled' : 'disabled'}`
            );
            
            loadDataSources();
        } catch (error) {
            const apiError = handleApiError(error);
            showNotification('error', 'Bulk File Monitor Update Error', apiError.message);
        }
    };

    // Bulk function to enable/disable all API data sources
    const handleToggleAllApiDataSources = async (enable: boolean) => {
        try {
            const apiSources = dataSources.filter(source => source.sourceType === DataSourceType.Api);
            
            if (apiSources.length === 0) {
                showNotification('info', 'No API Data Sources', 'No API data sources found');
                return;
            }

            const updatePromises = apiSources.map(source => 
                apiService.updateDataSource(source.id, { ...source, isEnabled: enable })
            );

            await Promise.all(updatePromises);
            
            showNotification(
                'success',
                'Bulk API Data Source Update',
                `All API data sources have been ${enable ? 'enabled' : 'disabled'}`
            );
            
            loadDataSources();
        } catch (error) {
            const apiError = handleApiError(error);
            showNotification('error', 'Bulk API Data Source Update Error', apiError.message);
        }
    };

    // Legacy function for backward compatibility - now routes to specific functions
    const handleToggleStatus = async (source: DataSourceConfig) => {
        if (source.sourceType === 0) {
            await handleToggleFileMonitor(source);
        } else if (source.sourceType === 1) {
            await handleToggleApiDataSource(source);
        }
    };

    const handleSubmit = async (values: any) => {
        try {
            const sourceType: number = values.sourceType;
            // Build payloads according to source type
            const basePayload: any = {
                name: values.name,
                isEnabled: values.isEnabled,
                pollingIntervalMinutes: values.pollingIntervalMinutes,
            };

            let payload: any;
            if (sourceType === DataSourceType.LocalFolder || sourceType === 0) {
                payload = {
                    ...basePayload,
                    filePattern: values.filePattern,
                    folderPath: values.folderPath,
                };
            } else {
                payload = {
                    ...basePayload,
                    apiEndpoint: values.apiEndpoint,
                    apiKey: values.apiKey,
                    additionalSettings: values.additionalSettings,
                };
            }

            if (editingSource) {
                await apiService.updateDataSource(editingSource.id, payload);
                showNotification('success', 'Data Source Updated', 'Data source has been updated successfully');
            } else {
                await apiService.createDataSource({
                    sourceType,
                    ...payload,
                });
                showNotification('success', 'Data Source Created', 'Data source has been created successfully');
            }
            setModalVisible(false);
            loadDataSources();
        } catch (error) {
            const apiError = handleApiError(error);
            showNotification('error', 'Save Error', apiError.message);
        }
    };

    useEffect(() => {
        loadDataSources();
    }, []);

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (text: string, record: DataSourceConfig) => (
                <Space>
                    {record.sourceType === 0 ? <FolderOutlined /> : <ApiOutlined />}
                    <Text strong>{text}</Text>
                </Space>
            ),
        },
        {
            title: 'Type',
            dataIndex: 'sourceType',
            key: 'sourceType',
            render: (type: number) => (
                <Badge
                    status={type === 0 ? 'processing' : 'success'}
                    text={type === 0 ? 'Folder' : 'API'}
                />
            ),
        },
        {
            title: 'Status',
            dataIndex: 'isEnabled',
            key: 'isEnabled',
            render: (isEnabled: boolean, record: DataSourceConfig) => (
                <Switch
                    checked={isEnabled}
                    onChange={() => handleToggleStatus(record)}
                    checkedChildren="Enabled"
                    unCheckedChildren="Disabled"
                />
            ),
        },
        {
            title: 'Polling Interval',
            dataIndex: 'pollingIntervalMinutes',
            key: 'pollingIntervalMinutes',
            render: (minutes: number) => `${minutes} min`,
        },
        {
            title: 'File Pattern',
            dataIndex: 'filePattern',
            key: 'filePattern',
            ellipsis: true,
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (text: any, record: DataSourceConfig) => (
                <Space>
                    <Tooltip 
                        title={record.isEnabled ? "Disable the data source before editing configuration" : "Edit data source configuration"}
                        placement="top"
                    >
                        <Button
                            type="link"
                            icon={<EditOutlined />}
                            onClick={() => handleEdit(record)}
                            disabled={record.isEnabled}
                            style={{ 
                                color: record.isEnabled ? '#d9d9d9' : undefined,
                                cursor: record.isEnabled ? 'not-allowed' : 'pointer'
                            }}
                        >
                            Edit
                        </Button>
                    </Tooltip>
                    
                    {/* File Monitor specific actions */}
                    {record.sourceType === 0 && (
                        <Button
                            type="link"
                            icon={record.isEnabled ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                            onClick={() => handleToggleFileMonitor(record)}
                            style={{ color: record.isEnabled ? '#ff4d4f' : '#52c41a' }}
                        >
                            {record.isEnabled ? 'Disable Monitor' : 'Enable Monitor'}
                        </Button>
                    )}
                    
                    {/* API Data Source specific actions */}
                    {record.sourceType === 1 && (
                        <Button
                            type="link"
                            icon={record.isEnabled ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                            onClick={() => handleToggleApiDataSource(record)}
                            style={{ color: record.isEnabled ? '#ff4d4f' : '#52c41a' }}
                        >
                            {record.isEnabled ? 'Disable API' : 'Enable API'}
                        </Button>
                    )}
                    {/* <Popconfirm
                        title="Are you sure you want to delete this data source?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button
                            type="link"
                            danger
                            icon={<DeleteOutlined />}
                        >
                            Delete
                        </Button>
                    </Popconfirm> */}
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>Data Sources</Title>
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={loadDataSources}>
                        Refresh
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateNew}>
                        Add Data Source
                    </Button>
                </Space>
            </div>

            {/* Bulk Actions */}
            <Card style={{ marginBottom: 24 }}>
                <Title level={4} style={{ marginBottom: 16 }}>Bulk Actions</Title>
                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} md={6}>
                        <Space direction="vertical" style={{ width: '100%' }}>
                            <Text strong>File Monitors</Text>
                            <Space>
                                <Button 
                                    type="primary" 
                                    size="small"
                                    icon={<PlayCircleOutlined />}
                                    onClick={() => handleToggleAllFileMonitors(true)}
                                    disabled={dataSources.filter(s => s.sourceType === 0).length === 0}
                                >
                                    Enable All
                                </Button>
                                <Button 
                                    size="small"
                                    icon={<PauseCircleOutlined />}
                                    onClick={() => handleToggleAllFileMonitors(false)}
                                    disabled={dataSources.filter(s => s.sourceType === 0).length === 0}
                                >
                                    Disable All
                                </Button>
                            </Space>
                        </Space>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Space direction="vertical" style={{ width: '100%' }}>
                            <Text strong>API Data Sources</Text>
                            <Space>
                                <Button 
                                    type="primary" 
                                    size="small"
                                    icon={<PlayCircleOutlined />}
                                    onClick={() => handleToggleAllApiDataSources(true)}
                                    disabled={dataSources.filter(s => s.sourceType === 1).length === 0}
                                >
                                    Enable All
                                </Button>
                                <Button 
                                    size="small"
                                    icon={<PauseCircleOutlined />}
                                    onClick={() => handleToggleAllApiDataSources(false)}
                                    disabled={dataSources.filter(s => s.sourceType === 1).length === 0}
                                >
                                    Disable All
                                </Button>
                            </Space>
                        </Space>
                    </Col>
                </Row>
            </Card>

            {/* Summary Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={8}>
                    <Card>
                        <Statistic
                            title="Total Data Sources"
                            value={dataSources.length}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card>
                        <Statistic
                            title="Enabled Sources"
                            value={dataSources.filter(s => s.isEnabled).length}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card>
                        <Statistic
                            title="Folder Sources"
                            value={dataSources.filter(s => s.sourceType === 0).length}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Data Sources Table */}
            <Card>
                <Table
                    columns={columns}
                    dataSource={dataSources}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
                    }}
                />
            </Card>

            {/* Add/Edit Modal */}
            <Modal
                title={editingSource ? 'Edit Data Source' : 'Add Data Source'}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                footer={null}
                width={600}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                >
                    <Form.Item shouldUpdate noStyle>
                        {() => null}
                    </Form.Item>
                    <Form.Item
                        name="name"
                        label="Name"
                        rules={[{ required: true, message: 'Please enter a name' }]}
                    >
                        <Input placeholder="Enter data source name" />
                    </Form.Item>

                    <Form.Item
                        name="sourceType"
                        label="Source Type"
                        rules={[{ required: true, message: 'Please select a source type' }]}
                    >
                        <Select placeholder="Select source type">
                            <Option value={0}>Folder</Option>
                            <Option value={1}>API</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="isEnabled"
                        label="Enabled"
                        valuePropName="checked"
                    >
                        <Switch />
                    </Form.Item>

                    <Form.Item
                        name="pollingIntervalMinutes"
                        label="Polling Interval (minutes)"
                        rules={[{ required: true, message: 'Please enter polling interval' }]}
                    >
                        <InputNumber min={1} max={1440} style={{ width: '100%' }} />
                    </Form.Item>

                    {/* Folder-specific fields */}
                    <Form.Item shouldUpdate={(prev, curr) => prev.sourceType !== curr.sourceType} noStyle>
                        {() => {
                            const currentType = form.getFieldValue('sourceType');
                            if (currentType === 0) {
                                return (
                                    <>
                                        <Form.Item
                                            name="folderPath"
                                            label="Folder Path"
                                            rules={[{ required: true, message: 'Please enter folder path' }]}
                                        >
                                            <Input placeholder="C:\\path\\to\\incoming" />
                                        </Form.Item>
                                        <Form.Item
                                            name="filePattern"
                                            label={
                                                <Tooltip title="example *.{json,jpg,jpeg,png,txt,csv}">
                                                    File Pattern
                                                </Tooltip>
                                            }
                                            rules={[{ required: true, message: 'Please enter file pattern' }]}
                                        >
                                            <Input placeholder="e.g., *.{json,jpg,jpeg,png,txt,csv}" />
                                        </Form.Item>
                                    </>
                                );
                            }
                            return null;
                        }}
                    </Form.Item>

                    {/* API-specific fields */}
                    <Form.Item shouldUpdate={(prev, curr) => prev.sourceType !== curr.sourceType} noStyle>
                        {() => {
                            const currentType = form.getFieldValue('sourceType');
                            if (currentType === 1) {
                                return (
                                    <>
                                        <Form.Item
                                            name="apiEndpoint"
                                            label="API Endpoint"
                                            rules={[{ required: true, message: 'Please enter API endpoint' }]}
                                        >
                                            <Input placeholder="https://api.example.com/data" />
                                        </Form.Item>
                                        <Form.Item
                                            name="apiKey"
                                            label="API Key"
                                        >
                                            <Input placeholder="Optional API key" />
                                        </Form.Item>
                                        <Form.Item
                                            name="additionalSettings"
                                            label="Additional Settings (JSON)"
                                        >
                                            <TextArea rows={3} placeholder='{"headers": {"Accept": "application/json"}}' />
                                        </Form.Item>
                                    </>
                                );
                            }
                            return null;
                        }}
                    </Form.Item>

                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit">
                                {editingSource ? 'Update' : 'Create'}
                            </Button>
                            <Button onClick={() => setModalVisible(false)}>
                                Cancel
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default DataSources;