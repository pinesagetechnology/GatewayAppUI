import React from 'react';
import { Tag, TagProps } from 'antd';
import { getStatusColor } from '../../services/apiService';

interface StatusTagProps extends Omit<TagProps, 'color'> {
    status: string;
    icon?: React.ReactNode;
}

const StatusTag: React.FC<StatusTagProps> = ({ status, icon = null, ...props }) => {
    const color = getStatusColor(status);

    return (
        <Tag color={color} icon={icon} {...props}>
            {status}
        </Tag>
    );
};

export default StatusTag;
