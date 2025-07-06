import React from 'react';

const SearchAndExport = ({ 
    searchTerm, 
    onSearch, 
    searchResults,
    onImportJSON, 
    onExportJSON, 
    onBuildModifiedRom, 
    isProcessing,
    jsonImportRef
}) => {
    return (
        <div className="terminal-card">
            <div className="search-container">
                <input
                    className="input"
                    type="text"
                    placeholder="Search texts..."
                    value={searchTerm}
                    onChange={(e) => onSearch(e.target.value)}
                />
                {searchResults.length > 0 && (
                    <div className="search-count">
                        Found {searchResults.length} matches
                    </div>
                )}
            </div>
            <div className="flex">
                <input
                    type="file"
                    ref={jsonImportRef}
                    style={{ display: 'none' }}
                />
                <button 
                    className="btn" 
                    onClick={onImportJSON}
                >
                    Import JSON
                </button>
                <button 
                    className="btn" 
                    onClick={onExportJSON}
                >
                    Export JSON
                </button>
                <button 
                    className="btn" 
                    onClick={onBuildModifiedRom} 
                    disabled={isProcessing}
                >
                    {isProcessing ? 'Building...' : 'Build Patched ROM'}
                </button>
            </div>
        </div>
    );
};

export default SearchAndExport;