import React, { useState, useEffect } from 'react';
import {
  Card, Form, Input, InputNumber, Switch, Button, Space, Typography, 
  Divider, Alert, Tabs, Row, Col, Popconfirm
} from 'antd';
import {
  SaveOutlined, ReloadOutlined, UndoOutlined,
  ImportOutlined, ExportOutlined
} from '@ant-design/icons';
import { useNotification } from '../contexts/NotificationContext';
import { apiService, handleApiError } from '../services/apiService';
import { DatabaseConfig } from '../models/DatabaseConfig';
import LoadingSpinner from '../components/common/LoadingSpinner';

const { Title, Text } = Typography;
const { TextArea } = Input;

const Settings: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [configurations, setConfigurations] = useState<DatabaseConfig[]>([]);
  const [form] = Form.useForm();
  const { showNotification } = useNotification();

  const loadConfigurations = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await apiService.getConfiguration();
      const configs = response.data || [] as DatabaseConfig[];
      
      setConfigurations(configs);
      
      // Set form values
      const formValues: any = {};
      configs.forEach((config: DatabaseConfig) => {
        // Convert string values to appropriate types
        let value: any = config.value;
        if (value === 'true') value = true;
        else if (value === 'false') value = false;
        else if (!isNaN(Number(value)) && value !== '') value = Number(value);
        
        formValues[config.key] = value;
      });
      form.setFieldsValue(formValues);
    } catch (error) {
      const apiError = handleApiError(error);
      showNotification('error', 'Load Error', apiError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (values: any): Promise<void> => {
    try {
      setSaving(true);
      
      // Save each configuration using the new SetConfigRequest API
      const savePromises = Object.entries(values).map(async ([key, value]: [string, any]): Promise<void> => {
        const config = configurations.find(c => c.key === key);
        if (config) {
          await apiService.setConfigRequest({
            key: key,
            value: String(value),
            description: config.description,
            category: config.category
          });
        }
      });
      
      await Promise.all(savePromises);
      showNotification('success', 'Settings Saved', 'All configuration settings have been saved successfully');
    } catch (error) {
      const apiError = handleApiError(error);
      showNotification('error', 'Save Error', apiError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
  };

  const handleExportConfig = () => {
    const config: any = {};
    configurations.forEach(item => {
      config[item.key] = {
        value: item.value,
        description: item.description,
        category: item.category
      };
    });
    
    const dataStr = JSON.stringify(config, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `azure-gateway-config-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  useEffect(() => {
    loadConfigurations();
  }, []);

  if (loading) {
    return <LoadingSpinner tip="Loading settings..." />;
  }

  // Group configurations by category
  const configsByCategory = configurations.reduce((acc: any, config: DatabaseConfig) => {
    const category = config.category || 'General';
    if (!acc[category]) acc[category] = [];
    acc[category].push(config);
    return acc;
  }, {});

  const renderConfigField = ({ config }: { config: DatabaseConfig }) => {
    const { key: Key, value: Value, description: Description } = config;
    
    // Determine field type based on key and value
    if (Key.toLowerCase().includes('password') || Key.toLowerCase().includes('key') || Key.toLowerCase().includes('secret')) {
      return (
        <Form.Item
          key={Key}
          name={Key}
          label={Key.split('.').pop()}
          tooltip={Description}
        >
          <Input.Password placeholder="Enter secure value" />
        </Form.Item>
      );
    }
    
    if (Value === 'true' || Value === 'false') {
      return (
        <Form.Item
          key={Key}
          name={Key}
          label={Key.split('.').pop()}
          valuePropName="checked"
          tooltip={Description}
        >
          <Switch />
        </Form.Item>
      );
    }
    
    if (!isNaN(Number(Value)) && Value !== '') {
      return (
        <Form.Item
          key={Key}
          name={Key}
          label={Key.split('.').pop()}
          tooltip={Description}
        >
          <InputNumber style={{ width: '100%' }} />
        </Form.Item>
      );
    }
    
    if (Key.toLowerCase().includes('path') || Key.toLowerCase().includes('directory')) {
      return (
        <Form.Item
          key={Key}
          name={Key}
          label={Key.split('.').pop()}
          tooltip={Description}
        >
          <Input placeholder="Enter file path" />
        </Form.Item>
      );
    }
    
    if (Key.toLowerCase().includes('connectionstring') || Value.length > 100) {
      return (
        <Form.Item
          key={Key}
          name={Key}
          label={Key.split('.').pop()}
          tooltip={Description}
        >
          <TextArea rows={3} placeholder="Enter value" />
        </Form.Item>
      );
    }
    
    return (
      <Form.Item
        key={Key}
        name={Key}
        label={Key.split('.').pop()}
        tooltip={Description}
      >
        <Input placeholder="Enter value" />
      </Form.Item>
    );
  };

  const tabItems = Object.entries(configsByCategory).map(([category, configs]: any) => ({
    key: category,
    label: category,
    children: (
      <div>
        <Row gutter={[16, 16]}>
          {configs.map((config: DatabaseConfig) => (
            <Col xs={24} md={12} key={config.key}>
              {renderConfigField({ config })}
            </Col>
          ))}
        </Row>
      </div>
    )
  }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>Settings</Title>
        <Space>
          <Button icon={<ImportOutlined />}>
            Import Config
          </Button>
          <Button icon={<ExportOutlined />} onClick={handleExportConfig}>
            Export Config
          </Button>
          <Button icon={<ReloadOutlined />} onClick={loadConfigurations}>
            Refresh
          </Button>
        </Space>
      </div>

      <Alert
        message="Configuration Settings"
        description="These settings control various aspects of the Azure Gateway system. Changes take effect after saving and may require service restart."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
        >
          <Tabs
            items={tabItems}
            tabPosition="top"
            size="large"
          />

          <Divider />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Text type="secondary">
                {configurations.length} configuration settings loaded
              </Text>
            </Space>
            
            <Space>
              <Popconfirm
                title="Reset all settings to current saved values?"
                description="This will discard any unsaved changes."
                onConfirm={handleReset}
                okText="Yes"
                cancelText="No"
              >
                <Button icon={<UndoOutlined />}>
                  Reset
                </Button>
              </Popconfirm>
              
              <Button 
                type="primary" 
                icon={<SaveOutlined />}
                htmlType="submit"
                loading={saving}
              >
                Save All Settings
              </Button>
            </Space>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default Settings;
