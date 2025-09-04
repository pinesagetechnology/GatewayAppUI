import React from 'react';
import { JsonView, defaultStyles, darkStyles, allExpanded } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';

interface JsonViewerProps {
    data: any;
    theme?: 'light' | 'dark';
    expandAll?: boolean;
    className?: string;
    style?: React.CSSProperties;
}

const JsonViewer: React.FC<JsonViewerProps> = ({
    data,
    theme = 'light',
    expandAll = false,
    className,
    style,
}) => {
    const stylesTheme = theme === 'dark' ? darkStyles : defaultStyles;
    const shouldExpand = expandAll ? allExpanded : undefined;

    return (
        <div className={className} style={style}>
            <JsonView data={data} style={stylesTheme} shouldExpandNode={shouldExpand} />
        </div>
    );
};

export default JsonViewer;
