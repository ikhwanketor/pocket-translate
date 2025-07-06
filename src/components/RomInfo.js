import React from 'react';

const RomInfo = ({ romData, systemInfo, tableData, freeSpaceInfo }) => {
    return (
        <div className="rom-info">
            <div className="rom-info-row">
                <span>File:</span>
                <span>{romData.name}</span>
            </div>
            <div className="rom-info-row">
                <span>System:</span>
                <span>{systemInfo?.name || 'Detecting...'}</span>
            </div>
            <div className="rom-info-row">
                <span>Size:</span>
                <span>{Math.round(romData.size / 1024)}KB</span>
            </div>
            {tableData && (
                <div className="rom-info-row">
                    <span>Table:</span>
                    <span>{tableData.name} ({tableData.entryCount} entries)</span>
                </div>
            )}
            {freeSpaceInfo && (
                <div className="rom-info-row">
                    <span>Free Space:</span>
                    <span>0x{freeSpaceInfo.start.toString(16).toUpperCase()} ({freeSpaceInfo.size} bytes)</span>
                </div>
            )}
        </div>
    );
};

export default RomInfo;