import React from 'react';

const ExtractionOptions = ({ options, setOptions }) => {
    return (
        <div className="extraction-options">
            <h3>Extraction Settings</h3>
            <div className="option-row">
                <span className="option-label">Min Length:</span>
                <input
                    className="input"
                    type="number"
                    value={options.minLength}
                    onChange={(e) => setOptions(prev => ({...prev, minLength: parseInt(e.target.value)}))}
                    style={{width: '80px'}}
                />
            </div>
            <div className="option-row">
                <span className="option-label">Max Length:</span>
                <input
                    className="input"
                    type="number"
                    value={options.maxLength}
                    onChange={(e) => setOptions(prev => ({...prev, maxLength: parseInt(e.target.value)}))}
                    style={{width: '80px'}}
                />
            </div>
            <div className="option-row">
                <span className="option-label">ASCII Fallback:</span>
                <input
                    type="checkbox"
                    checked={options.asciiFallback}
                    onChange={(e) => setOptions(prev => ({...prev, asciiFallback: e.target.checked}))}
                />
            </div>
        </div>
    );
};

export default ExtractionOptions;