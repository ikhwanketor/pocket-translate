import React from 'react';

const ZoomControls = ({ onZoomIn, onZoomOut, onZoomReset }) => {
    return (
        <div className="zoom-controls">
            <button className="zoom-btn" onClick={onZoomOut} title="Zoom Out">-</button>
            <button className="zoom-btn" onClick={onZoomReset} title="Reset Zoom">•</button>
            <button className="zoom-btn" onClick={onZoomIn} title="Zoom In">+</button>
        </div>
    );
};

export default ZoomControls;