import React, { useState, useEffect } from 'react';
import {
  Table, Card, Button, Space, Tag, Progress, Typography, Row, Col,
  Statistic, Select, Input, Modal, Alert, Dropdown,
  Popconfirm, Empty, Badge, Descriptions
} from 'antd';
import {
  ReloadOutlined, PlayCircleOutlined, PauseCircleOutlined,
  DeleteOutlined, SearchOutlined, FilterOutlined,
  EyeOutlined, MoreOutlined, CloudUploadOutlined,
  CheckCircleOutlined, ExclamationCircleOutlined, ClockCircleOutlined
} from '@ant-design/icons';
import { useSignalR } from '../contexts/SignalRContext';
import { useNotification } from '../contexts/NotificationContext';
import { apiService, formatFileSize, formatDuration, getStatusColor, handleApiError } from '../services/apiService';
import { UploadProcessStatus } from '../models/Upload';
import { QueueSummary, RecentUpload } from '../models/QueueSummary';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

const UploadQueue: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [processorStatus, setProcessorStatus] = useState<UploadProcessStatus | null>(null);
  const [queueData, setQueueData] = useState<RecentUpload[]>([]);
  const [filteredData, setFilteredData] = useState<RecentUpload[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [filters, setFilters] = useState<{
    status: string;
    fileType: string;
    source: string;
    search: string;
  }>({
    status: 'all',
    fileType: 'all',
    source: 'all',
    search: '',
  });
  const [detailModalVisible, setDetailModalVisible] = useState<boolean>(false);
  const [selectedUpload, setSelectedUpload] = useState<RecentUpload | null>(null);

  const { uploadUpdates } = useSignalR();
  const { showNotification } = useNotification();

  const loadData = async (): Promise<void> => {
    try {
      setLoading(true);

      const [processorResponse, queueResponse] = await Promise.all([
        apiService.getUploadProcessorStatus(),
        apiService.getQueueSummary(),
      ]);

      setProcessorStatus(processorResponse.data);
      setQueueData(queueResponse.data.recentUploads || []);

    } catch (error) {
      const apiError = handleApiError(error);
      showNotification('error', 'Load Error', apiError.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...queueData];

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(item => 
        item.status.toLowerCase() === filters.status.toLowerCase()
      );
    }

    // File type filter
    if (filters.fileType !== 'all') {
      filtered = filtered.filter(item => {
        const extension = item.fileName.split('.').pop()?.toLowerCase();
        if (filters.fileType === 'json') return extension === 'json';
        if (filters.fileType === 'image') return ['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(extension || '');
        if (filters.fileType === 'other') return !['json', 'jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(extension || '');
        return true;
      });
    }

    // Search filter
    if (filters.search) {
      filtered = filtered.filter(item =>
        item.fileName.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    setFilteredData(filtered);
  };

  const handleProcessorToggle = async (): Promise<void> => {
    try {
      if (processorStatus?.isRunning) {
        await apiService.pauseUploadProcessor();
        showNotification('success', 'Processor Paused', 'Upload processor has been paused');
      } else {
        await apiService.startUploadProcessor();
        showNotification('success', 'Processor Started', 'Upload processor has been started');
      }
      setTimeout(() => loadData(), 1000);
    } catch (error) {
      const apiError = handleApiError(error);
      showNotification('error', 'Toggle Error', apiError.message);
    }
  };

  const handleRetryFailed = async (): Promise<void> => {
    try {
      await apiService.retryFailedUploads();
      showNotification('success', 'Retry Initiated', 'Failed uploads have been reset for retry');
      setTimeout(() => loadData(), 1000);
    } catch (error) {
      const apiError = handleApiError(error);
      showNotification('error', 'Retry Error', apiError.message);
    }
  };

  const showUploadDetail = (upload: RecentUpload) => {
    setSelectedUpload(upload);
    setDetailModalVisible(true);
  };

  const getProgressFromUpdates = (uploadId: number) => {
    const update = uploadUpdates.find(u => u.uploadId === uploadId.toString());
    return update?.percentComplete || 0;
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    applyFilters();
  }, [queueData, filters]);

  // Merge live upload progress with queue data
  const enrichedData = filteredData.map(item => ({
    ...item,
    liveProgress: getProgressFromUpdates(item.id),
    isActive: uploadUpdates.some(u => u.uploadId === item.id.toString()),
  }));

  const columns = [
    {
      title: 'File Name',
      dataIndex: 'fileName',
      key: 'fileName',
      ellipsis: true,
      render: (text: string, record: RecentUpload) => (
        <Space direction="vertical" size="small">
          <Button 
            type="link" 
            style={{ padding: 0, height: 'auto' }}
            onClick={() => showUploadDetail(record)}
          >
            {text}
          </Button>
          {(record as any).isActive && (
            <Badge status="processing" text="Uploading..." />
          )}
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'File Size',
      dataIndex: 'fileSize',
      key: 'fileSize',
      width: 100,
      render: (size: number) => formatFileSize(size),
    },
    {
      title: 'Started At',
      dataIndex: 'startedAt',
      key: 'startedAt',
      width: 150,
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: 'Completed At',
      dataIndex: 'completedAt',
      key: 'completedAt',
      width: 150,
      render: (date: string | null) => date ? new Date(date).toLocaleString() : '-',
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
    selections: [
      Table.SELECTION_ALL,
      Table.SELECTION_INVERT,
      Table.SELECTION_NONE,
    ],
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>Upload Queue</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadData}>
            Refresh
          </Button>
          <Button 
            icon={processorStatus?.isRunning ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={handleProcessorToggle}
            type={processorStatus?.isRunning ? 'default' : 'primary'}
          >
            {processorStatus?.isRunning ? 'Pause' : 'Start'} Processor
          </Button>
          <Popconfirm
            title="Are you sure you want to retry all failed uploads?"
            onConfirm={handleRetryFailed}
            okText="Yes"
            cancelText="No"
          >
            <Button icon={<ReloadOutlined />} danger>
              Retry Failed
            </Button>
          </Popconfirm>
        </Space>
      </div>

      {/* Processor Status */}
      {processorStatus && (
        <Card title="Processor Status" style={{ marginBottom: 24 }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title="Status"
                value={processorStatus.isRunning ? 'Running' : 'Stopped'}
                valueStyle={{ color: processorStatus.isRunning ? '#52c41a' : '#ff4d4f' }}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title="Active Uploads"
                value={processorStatus.activeUploads}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title="Pending Count"
                value={processorStatus.pendingCount}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title="Failed Count"
                value={processorStatus.failedCount}
              />
            </Col>
          </Row>
        </Card>
      )}

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="Filter by Status"
              value={filters.status}
              onChange={(value) => setFilters({ ...filters, status: value })}
              style={{ width: '100%' }}
            >
              <Option value="all">All Statuses</Option>
              <Option value="pending">Pending</Option>
              <Option value="processing">Processing</Option>
              <Option value="completed">Completed</Option>
              <Option value="failed">Failed</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="Filter by File Type"
              value={filters.fileType}
              onChange={(value) => setFilters({ ...filters, fileType: value })}
              style={{ width: '100%' }}
            >
              <Option value="all">All Types</Option>
              <Option value="json">JSON</Option>
              <Option value="image">Images</Option>
              <Option value="other">Other</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Search
              placeholder="Search files..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              onSearch={() => applyFilters()}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Button onClick={() => setFilters({ status: 'all', fileType: 'all', source: 'all', search: '' })}>
              Clear Filters
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Upload Queue Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={enrichedData}
          rowKey="id"
          loading={loading}
          rowSelection={rowSelection}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
          }}
          locale={{
            emptyText: <Empty description="No uploads found" />,
          }}
        />
      </Card>

      {/* Upload Detail Modal */}
      <Modal
        title="Upload Details"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            Close
          </Button>,
        ]}
        width={600}
      >
        {selectedUpload && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="File Name">
              {selectedUpload.fileName}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={getStatusColor(selectedUpload.status)}>
                {selectedUpload.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="File Size">
              {formatFileSize(selectedUpload.fileSize)}
            </Descriptions.Item>
            <Descriptions.Item label="Started At">
              {new Date(selectedUpload.startedAt).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="Completed At">
              {selectedUpload.completedAt ? new Date(selectedUpload.completedAt).toLocaleString() : 'Not completed'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default UploadQueue;