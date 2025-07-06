import React from 'react';

const TablePreview = ({ tableContent }) => {
    return (
        <div className="terminal-card">
            <h3>Table Content Preview</h3>
            <div className="tbl-preview">
                <pre>{tableContent}</pre>
            </div>
        </div>
    );
};

export default TablePreview;