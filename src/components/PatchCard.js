import React from 'react';

const PatchCard = ({ title, description, children }) => {
    return (
        <div className="patch-card">
            <div className="patch-title">{title}</div>
            <div className="patch-desc">{description}</div>
            <div className="patch-controls">
                {children}
            </div>
        </div>
    );
};

export default PatchCard;