import React from 'react';

const Stats = ({ stats }) => {
    return (
        <div className="stats">
            <div className="stat-item">
                <div className="stat-number">{stats.total}</div>
                <div className="stat-label">Total</div>
            </div>
            <div className="stat-item">
                <div className="stat-number">{stats.translated}</div>
                <div className="stat-label">Translated</div>
            </div>
            <div className="stat-item">
                <div className="stat-number">{stats.untranslated}</div>
                <div className="stat-label">Untranslated</div>
            </div>
        </div>
    );
};

export default Stats;