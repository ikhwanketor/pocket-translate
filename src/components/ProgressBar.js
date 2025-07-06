import React from 'react';

const ProgressBar = ({ progress }) => {
    return (
        <div className="progress-bar" style={{width: `${progress}%`}}></div>
    );
};

export default ProgressBar;