import React from 'react';
import {
    FileTextOutlined, FileImageOutlined, FileOutlined,
    FilePdfOutlined, FileExcelOutlined, FileZipOutlined
} from '@ant-design/icons';

interface FileIconProps {
    fileName: string;
    size?: number;
}

const FileIcon: React.FC<FileIconProps> = ({ fileName, size = 16 }) => {
    const getFileIcon = (fileName: string): React.ReactElement => {
        const extension = fileName.split('.').pop()?.toLowerCase();

        switch (extension) {
            case 'json':
            case 'txt':
            case 'csv':
                return <FileTextOutlined style={{ fontSize: size, color: '#1890ff' }} />;
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif':
            case 'bmp':
                return <FileImageOutlined style={{ fontSize: size, color: '#52c41a' }} />;
            case 'pdf':
                return <FilePdfOutlined style={{ fontSize: size, color: '#ff4d4f' }} />;
            case 'xlsx':
            case 'xls':
                return <FileExcelOutlined style={{ fontSize: size, color: '#52c41a' }} />;
            case 'zip':
            case 'rar':
                return <FileZipOutlined style={{ fontSize: size, color: '#faad14' }} />;
            default:
                return <FileOutlined style={{ fontSize: size, color: '#8c8c8c' }} />;
        }
    };

    return getFileIcon(fileName);
};

export default FileIcon;
