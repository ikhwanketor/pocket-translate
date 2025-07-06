import React from 'react';

const Tabs = ({ activeTab, setActiveTab }) => {
    return (
        <div className="tabs">
            <div 
                className={`tab ${activeTab === 'extraction' ? 'active' : ''}`}
                onClick={() => setActiveTab('extraction')}
            >
                Text Extraction
            </div>
            <div 
                className={`tab ${activeTab === 'patching' ? 'active' : ''}`}
                onClick={() => setActiveTab('patching')}
            >
                ROM Patching
            </div>
        </div>
    );
};

export default Tabs;