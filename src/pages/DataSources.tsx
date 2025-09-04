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
            filePattern: '*.{json,jpg,jpeg,png}'
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
            connectionString: source.connectionString,
            description: source.description
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

    const handleToggleStatus = async (source: DataSourceConfig) => {
        try {
            const updatedSource = { ...source, isEnabled: !source.isEnabled };
            await apiService.updateDataSource(source.id, updatedSource);
            showNotification(
                'success',
                'Status Updated',
                `Data source has been ${updatedSource.isEnabled ? 'enabled' : 'disabled'}`
            );
            loadDataSources();
        } catch (error) {
            const apiError = handleApiError(error);
            showNotification('error', 'Update Error', apiError.message);
        }
    };

    const handleSubmit = async (values: any) => {
        try {
            if (editingSource) {
                await apiService.updateDataSource(editingSource.id, values);
                showNotification('success', 'Data Source Updated', 'Data source has been updated successfully');
            } else {
                await apiService.createDataSource(values);
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
                    <Button
                        type="link"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                    >
                        Edit
                    </Button>
                    <Popconfirm
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
                    </Popconfirm>
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

                    <Form.Item
                        name="filePattern"
                        label="File Pattern"
                        rules={[{ required: true, message: 'Please enter file pattern' }]}
                    >
                        <Input placeholder="e.g., *.{json,jpg,jpeg,png}" />
                    </Form.Item>

                    <Form.Item
                        name="connectionString"
                        label="Connection String"
                    >
                        <TextArea rows={3} placeholder="Enter connection string or path" />
                    </Form.Item>

                    <Form.Item
                        name="description"
                        label="Description"
                    >
                        <TextArea rows={2} placeholder="Enter description" />
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