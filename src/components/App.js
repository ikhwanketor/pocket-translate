import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import Header from './Header';
import Footer from './Footer';
import TextItem from './TextItem';
import ProgressBar from './ProgressBar';
import ZoomControls from './ZoomControls';
import RomInfo from './RomInfo';
import TablePreview from './TablePreview';
import ExtractionOptions from './ExtractionOptions';
import Stats from './Stats';
import SearchAndExport from './SearchAndExport';
import Tabs from './Tabs';
import PatchCard from './PatchCard';

import { detectSystem, findFreeSpace } from '../utils/romUtils';
import { extractText } from '../utils/textExtraction';
import { generateHeuristicTable } from '../utils/tableUtils';
import { rebuildRom, generateIpsPatch, generateXDeltaPatch, generateBpsPatch, applyIpsPatch } from '../utils/patchUtils';

import '../styles/main.css';

const PocketTranslate = () => {
    // State
    const [zoom, setZoom] = useState(1);
    const [romData, setRomData] = useState(null);
    const [originalRomData, setOriginalRomData] = useState(null);
    const [tableData, setTableData] = useState(null);
    const [allTexts, setAllTexts] = useState([]);
    const [filteredTexts, setFilteredTexts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [options, setOptions] = useState({
        minLength: 2,
        maxLength: 1024,
        minQuality: 5,
        asciiFallback: true,
        searchStart: 0,
        searchEnd: 0
    });
    const [systemInfo, setSystemInfo] = useState(null);
    const [modifiedRom, setModifiedRom] = useState(null);
    const [freeSpaceInfo, setFreeSpaceInfo] = useState(null);
    const [activeTab, setActiveTab] = useState('extraction');
    const [patchStatus, setPatchStatus] = useState('');
    const [tableContent, setTableContent] = useState('');
    const [searchIndex, setSearchIndex] = useState(-1);
    const [searchResults, setSearchResults] = useState([]);
    const [isInitialized, setIsInitialized] = useState(false);
    
    const fileInputRef = useRef(null);
    const tableInputRef = useRef(null);
    const patchInputRef = useRef(null);
    const jsonImportRef = useRef(null);
    const textsPerPage = 10;

    // Initialize app
    useEffect(() => {
        setIsInitialized(true);
    }, []);

    // Zoom controls
    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
    const handleZoomReset = () => setZoom(1);

    useEffect(() => {
        document.documentElement.style.setProperty('--app-zoom', zoom);
    }, [zoom]);

    // File upload handler
    const handleFileUpload = useCallback(async (file) => {
        if (!file) return;
        
        setIsProcessing(true);
        setProgress(0);
        setError('');
        setSuccess('');
        
        try {
            const arrayBuffer = await file.arrayBuffer();
            const data = new Uint8Array(arrayBuffer);
            
            const system = detectSystem(file.name, data);
            setSystemInfo(system);
            
            setRomData({
                name: file.name,
                size: file.size,
                data: data,
                system: system
            });
            
            // Save original ROM for backup
            setOriginalRomData({
                name: file.name,
                size: file.size,
                data: new Uint8Array(data),
                system: system
            });
            
            setAllTexts([]);
            setFilteredTexts([]);
            setModifiedRom(null);
            
            // Calculate free space
            const freeSpace = findFreeSpace(data);
            setFreeSpaceInfo({
                start: freeSpace,
                size: data.length - freeSpace
            });
            
            setSuccess('ROM loaded successfully!');
        } catch (err) {
            setError(`ROM Load Error: ${err.message}`);
        } finally {
            setIsProcessing(false);
            setProgress(0);
        }
    }, []);

    const handleTableLoad = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            setError(null);
            const reader = new FileReader();
            
            const content = await new Promise((resolve, reject) => {
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = () => reject(new Error("Failed to read table file"));
                reader.readAsText(file);
            });
            
            const lines = content.split('\n');
            const table = {};
            
            lines.forEach(line => {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('//') && trimmed.includes('=')) {
                    const [hex, char] = trimmed.split('=', 2);
                    const hexValue = parseInt(hex.trim(), 16);
                    const charValue = char.trim();
                    
                    if (!isNaN(hexValue)) {
                        table[hexValue] = charValue;
                    }
                }
            });
            
            setTableData({
                name: file.name,
                hexToChar: table,
                entryCount: Object.keys(table).length
            });
            
            // Format table content for display
            let displayContent = '';
            for (const [byte, char] of Object.entries(table)) {
                displayContent += `0x${parseInt(byte).toString(16).toUpperCase().padStart(2, '0')} = ${char}\n`;
            }
            setTableContent(displayContent);
            
            setSuccess(`Table loaded: ${Object.keys(table).length} entries`);
        } catch (err) {
            setError(`Table Load Error: ${err.message}`);
        }
    };

    // Extract texts
    const handleExtractTexts = useCallback(async () => {
        if (!romData || !tableData) {
            setError("Please load ROM and table files first");
            return;
        }
        
        setIsProcessing(true);
        setProgress(0);
        setError('');
        
        try {
            const start = 0;
            const end = romData.data.length;
            
            // Process in chunks to keep UI responsive
            const chunkSize = 131072; // 128KB chunks
            const totalChunks = Math.ceil((end - start) / chunkSize);
            let texts = [];
            
            for (let i = 0; i < totalChunks; i++) {
                const chunkStart = start + (i * chunkSize);
                const chunkEnd = Math.min(chunkStart + chunkSize, end);
                
                if (chunkStart >= romData.data.length) break;
                
                const chunkTexts = extractText(
                    romData.data,
                    chunkStart,
                    chunkEnd,
                    tableData.hexToChar,
                    {
                        minLength: options.minLength,
                        maxLength: options.maxLength,
                        includeRepeats: false,
                        textType: 'all',
                        asciiFallback: options.asciiFallback,
                        system: romData.system
                    }
                );
                
                texts.push(...chunkTexts);
                const calculatedProgress = Math.floor(((i + 1) / totalChunks) * 100);
                setProgress(calculatedProgress);
                
                // Yield to UI thread
                await new Promise(resolve => setTimeout(resolve, 0));
            }
            
            // Add IDs and additional metadata
            const processedTexts = texts.map((text, index) => ({
                id: index + 1,
                ...text,
                translatedText: '',
                selected: false
            }));
            
            setAllTexts(processedTexts);
            setFilteredTexts(processedTexts);
            setCurrentPage(1);
            setSuccess(`Extracted ${processedTexts.length} text strings`);
        } catch (err) {
            setError(`Extraction Error: ${err.message}`);
        } finally {
            setIsProcessing(false);
            setProgress(0);
        }
    }, [romData, tableData, options]);

    // Generate heuristic table
    const generateTableFromRom = () => {
        if (!romData) {
            setError("Please load a ROM file first");
            return;
        }
        
        try {
            const table = generateHeuristicTable(romData.data);
            
            // Format table content for display
            let displayContent = '';
            for (const [byte, char] of Object.entries(table)) {
                displayContent += `0x${parseInt(byte).toString(16).toUpperCase().padStart(2, '0')} = ${char}\n`;
            }
            setTableContent(displayContent);
            
            // Simulate loading the table
            setTableData({
                name: `${romData.name.replace(/\.[^/.]+$/, "")}_generated.tbl`,
                hexToChar: table,
                entryCount: Object.keys(table).length
            });
            
            setSuccess("Heuristic table generated successfully!");
        } catch (err) {
            setError(`Table Generation Error: ${err.message}`);
        }
    };

    // Search handler
    const handleSearch = useCallback((term) => {
        setSearchTerm(term);
        
        if (!term.trim()) {
            setFilteredTexts(allTexts);
            setSearchResults([]);
            setSearchIndex(-1);
        } else {
            const filtered = allTexts.filter(text => 
                text.originalText.toLowerCase().includes(term.toLowerCase()) ||
                (text.translatedText && text.translatedText.toLowerCase().includes(term.toLowerCase())) ||
                text.offset.toLowerCase().includes(term.toLowerCase())
            );
            setFilteredTexts(filtered);
            setSearchResults(filtered);
            setSearchIndex(0);
            
            if (filtered.length > 0) {
                setCurrentPage(Math.ceil(filtered[0].id / textsPerPage));
            }
        }
        setCurrentPage(1);
    }, [allTexts]);

    // Update translation
    const updateTranslation = useCallback((textId, newTranslation) => {
        setAllTexts(prev => prev.map(text => 
            text.id === textId ? { ...text, translatedText: newTranslation } : text
        ));
        setFilteredTexts(prev => prev.map(text => 
            text.id === textId ? { ...text, translatedText: newTranslation } : text
        ));
    }, []);

    // Handle JSON import
    const handleImportJSON = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonData = JSON.parse(e.target.result);
                
                // Validate JSON structure
                if (!jsonData.texts || !Array.isArray(jsonData.texts)) {
                    throw new Error("Invalid JSON format: Missing texts array");
                }
                
                // Update texts state
                const updatedTexts = allTexts.map(text => {
                    const matched = jsonData.texts.find(t => t.offset === text.offset);
                    return matched ? { ...text, translatedText: matched.translation || '' } : text;
                });
                
                setAllTexts(updatedTexts);
                setFilteredTexts(updatedTexts);
                setSuccess(`JSON imported: ${jsonData.texts.length} translations loaded`);
            } catch (err) {
                setError(`JSON Import Error: ${err.message}`);
            }
        };
        reader.onerror = () => setError("Failed to read JSON file");
        reader.readAsText(file);
    };

    // Build modified ROM
    const buildModifiedRom = async () => {
        if (!romData || allTexts.length === 0) {
            setError("Please load ROM and translate texts first");
            return;
        }
        
        setIsProcessing(true);
        setProgress(0);
        setError(null);
        
        try {
            const translationsToApply = allTexts
                .filter(t => t.translatedText && t.translatedText.trim() !== '');
            
            // Check for translations that are too long
            const longTranslations = translationsToApply.filter(t => 
                t.translatedText.length > (t.endByte - t.startByte)
            );
            
            if (longTranslations.length > 0) {
                setError(`Warning: ${longTranslations.length} translations exceed original length. They may cause issues.`);
            }
            
            const total = translationsToApply.length;
            let processed = 0;
            
            // Process translations in chunks to prevent UI freeze
            const chunkSize = 50;
            const chunks = Math.ceil(total / chunkSize);
            let currentRom = romData.data;
            
            for (let i = 0; i < chunks; i++) {
                const startIdx = i * chunkSize;
                const endIdx = Math.min(startIdx + chunkSize, total);
                const chunkTranslations = translationsToApply.slice(startIdx, endIdx);
                
                const { modifiedRom } = rebuildRom(
                    currentRom,
                    chunkTranslations,
                    romData.system
                );
                
                currentRom = modifiedRom;
                processed = endIdx;
                setProgress(Math.floor((processed / total) * 100));
                
                // Yield to UI thread
                await new Promise(resolve => setTimeout(resolve, 0));
            }
            
            setModifiedRom(currentRom);
            setSuccess("ROM rebuilt successfully!");
        } catch (err) {
            setError(`ROM Build Error: ${err.message}`);
        } finally {
            setIsProcessing(false);
        }
    };
    
    // Export modified ROM
    const exportModifiedRom = () => {
        if (!modifiedRom) {
            setError("Please build the ROM first");
            return;
        }
        
        try {
            const blob = new Blob([modifiedRom], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${romData.name.replace(/\.[^/.]+$/, "")}_translated.${romData.name.split('.').pop()}`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            setError(`ROM Export Error: ${err.message}`);
        }
    };
    
    // Export IPS patch
    const exportIpsPatch = async () => {
        if (!modifiedRom || !romData) {
            setError("Please build the ROM first");
            return;
        }
        
        setIsProcessing(true);
        setProgress(0);
        setError(null);
        
        try {
            const patch = await generateIpsPatch(romData.data, modifiedRom, romData.name);
            
            const blob = new Blob([patch.data], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = patch.name;
            a.click();
            URL.revokeObjectURL(url);
            setSuccess("IPS patch generated successfully!");
        } catch (err) {
            setError(`Patch Generation Error: ${err.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    // Export XDelta patch
    const exportXDeltaPatch = async () => {
        if (!modifiedRom || !romData) {
            setError("Please build the ROM first");
            return;
        }
        
        setIsProcessing(true);
        setError(null);
        
        try {
            const patch = await generateXDeltaPatch(romData.data, modifiedRom);
            
            const blob = new Blob([patch.data], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = patch.name;
            a.click();
            URL.revokeObjectURL(url);
            setSuccess("XDelta patch generated successfully!");
        } catch (err) {
            setError(`XDelta Patch Error: ${err.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    // Export BPS patch
    const exportBpsPatch = () => {
        if (!modifiedRom || !romData) {
            setError("Please build the ROM first");
            return;
        }
        
        try {
            const patch = generateBpsPatch(romData.data, modifiedRom);
            
            const blob = new Blob([patch.data], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = patch.name;
            a.click();
            URL.revokeObjectURL(url);
            setSuccess("BPS patch generated successfully!");
        } catch (err) {
            setError(`BPS Patch Error: ${err.message}`);
        }
    };

    const handlePatchLoad = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            setError(null);
            setPatchStatus('Applying patch...');
            
            const reader = new FileReader();
            const patchData = await new Promise((resolve, reject) => {
                reader.onload = (e) => resolve(new Uint8Array(e.target.result));
                reader.onerror = () => reject(new Error("Failed to read patch file"));
                reader.readAsArrayBuffer(file);
            });
            
            const ext = file.name.split('.').pop().toLowerCase();
            const patchedRom = await applyPatch(romData.data, patchData, ext);
            
            setRomData({
                ...romData,
                data: patchedRom
            });
            
            setPatchStatus(`Patch applied successfully! ROM modified.`);
            setSuccess('Patch applied successfully!');
        } catch (err) {
            setError(`Patch Application Error: ${err.message}`);
            setPatchStatus('Patch application failed');
        }
    };

    // Restore original ROM
    const restoreOriginalRom = () => {
        if (!originalRomData) {
            setError("No backup ROM available");
            return;
        }
        
        setRomData(originalRomData);
        setModifiedRom(null);
        setPatchStatus("Original ROM restored from backup");
        setSuccess('Original ROM restored');
    };

    // Export JSON
    const exportJSON = useCallback(() => {
        if (allTexts.length === 0) {
            setError('No texts to export!');
            return;
        }

        const exportData = {
            fileName: romData.name,
            system: systemInfo?.name || 'Unknown',
            extractionDate: new Date().toISOString(),
            totalTexts: allTexts.length,
            texts: allTexts.map(text => ({
                offset: text.offset,
                original: text.originalText,
                translation: text.translatedText,
                type: text.textType
            }))
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${romData.name.replace(/\.[^/.]+$/, "")}_translation.json`;
        a.click();
        URL.revokeObjectURL(url);
    }, [romData, systemInfo, allTexts]);

    // Pagination
    const totalPages = Math.ceil(filteredTexts.length / textsPerPage);
    const currentTexts = filteredTexts.slice(
        (currentPage - 1) * textsPerPage,
        currentPage * textsPerPage
    );

    const stats = useMemo(() => {
        const translated = allTexts.filter(t => t.translatedText.trim()).length;
        
        return {
            total: allTexts.length,
            translated,
            untranslated: allTexts.length - translated
        };
    }, [allTexts]);

    // Show loading screen if not initialized
    if (!isInitialized) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <div className="loading-text">Loading PocketTranslate...</div>
            </div>
        );
    }

    return (
        <div>
            {/* Progress bar */}
            {isProcessing && <ProgressBar progress={progress} />}

            <ZoomControls 
                onZoomIn={handleZoomIn} 
                onZoomOut={handleZoomOut} 
                onZoomReset={handleZoomReset} 
            />

            <Header />
            
            <Tabs 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
            />

            {/* Error/Success messages */}
            {error && (
                <div className="error-box">ERROR: {error}</div>
            )}
            
            {success && (
                <div className="success-box">{success}</div>
            )}

            {/* Extraction Tab */}
            <div className={`tab-content ${activeTab === 'extraction' ? 'active' : ''}`}>
                {/* File Upload */}
                <div className="terminal-card">
                    <h3>ROM File Upload</h3>
                    <div className="grid grid-3">
                        <div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                onChange={(e) => handleFileUpload(e.target.files[0])}
                                accept=".nes,.snes,.gb,.gbc,.gba,.nds,.smd,.bin,.iso,.z64,.n64,.v64"
                                style={{display: 'none'}}
                            />
                            <button 
                                className="btn"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isProcessing}
                            >
                                {isProcessing ? (
                                    <>
                                        <span className="loading-spinner"></span>
                                        Loading...
                                    </>
                                ) : (
                                    'Select ROM File'
                                )}
                            </button>
                        </div>
                        
                        <div>
                            <input
                                ref={tableInputRef}
                                type="file"
                                onChange={handleTableLoad}
                                accept=".tbl"
                                style={{display: 'none'}}
                            />
                            <button 
                                className="btn"
                                onClick={() => tableInputRef.current?.click()}
                                disabled={isProcessing}
                            >
                                Load Table File
                            </button>
                        </div>
                        
                        <div>
                            <button 
                                className="btn"
                                onClick={generateTableFromRom}
                                disabled={isProcessing || !romData}
                            >
                                Auto-Generate Table
                            </button>
                        </div>
                    </div>
                    
                    <div style={{marginTop: '15px'}}>
                        <button 
                            className="btn"
                            onClick={handleExtractTexts}
                            disabled={isProcessing || !romData || !tableData}
                        >
                            Extract Texts
                        </button>
                    </div>
                </div>

                {/* ROM Info */}
                {romData && (
                    <RomInfo 
                        romData={romData}
                        systemInfo={systemInfo}
                        tableData={tableData}
                        freeSpaceInfo={freeSpaceInfo}
                    />
                )}

                {/* Table Preview */}
                {(tableData && tableContent) && (
                    <TablePreview tableContent={tableContent} />
                )}

                {/* Extraction Options */}
                {romData && (
                    <ExtractionOptions 
                        options={options}
                        setOptions={setOptions}
                    />
                )}

                {/* Statistics */}
                {allTexts.length > 0 && (
                    <Stats stats={stats} />
                )}

                {/* Search and Export */}
                {allTexts.length > 0 && (
                    <SearchAndExport 
                        searchTerm={searchTerm}
                        onSearch={handleSearch}
                        searchResults={searchResults}
                        onImportJSON={() => jsonImportRef.current?.click()}
                        onExportJSON={exportJSON}
                        onBuildModifiedRom={buildModifiedRom}
                        isProcessing={isProcessing}
                        jsonImportRef={jsonImportRef}
                    />
                )}

                {/* Text List */}
                {currentTexts.length > 0 ? (
                    <div className="terminal-card">
                        <h3>Extracted Texts ({filteredTexts.length})</h3>
                        
                        {currentTexts.map((text, index) => (
                            <TextItem 
                                key={text.id}
                                text={text}
                                index={index}
                                currentPage={currentPage}
                                textsPerPage={textsPerPage}
                                updateTranslation={updateTranslation}
                            />
                        ))}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="pagination">
                                <button
                                    className="pagination-btn"
                                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                >
                                    &lt; Prev
                                </button>
                                
                                <span className="pagination-btn">
                                    {currentPage} / {totalPages}
                                </span>
                                
                                <button
                                    className="pagination-btn"
                                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    Next &gt;
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="terminal-card">
                        <div style={{textAlign: 'center', padding: '20px', color: '#888'}}>
                            {romData && tableData 
                                ? "No texts extracted yet. Click 'Extract Texts' to begin."
                                : "Load a ROM file and table to start extracting text"}
                        </div>
                    </div>
                )}
            </div>

            {/* Patching Tab */}
            <div className={`tab-content ${activeTab === 'patching' ? 'active' : ''}`}>
                <div className="terminal-card">
                    <h3>
                        ROM Patching
                    </h3>
                    
                    <div className="patch-options">
                        <PatchCard 
                            title="Apply Patch"
                            description="Apply an existing patch to your ROM"
                        >
                            <button
                                onClick={() => patchInputRef.current?.click()}
                                className="btn"
                            >
                                Upload Patch
                            </button>
                            <input 
                                ref={patchInputRef} 
                                type="file" 
                                onChange={handlePatchLoad} 
                                accept=".ips,.xdelta,.bps" 
                                style={{display: 'none'}} 
                            />
                        </PatchCard>
                        
                        <PatchCard 
                            title="Backup ROM"
                            description="Restore your ROM to its original state"
                        >
                            <button
                                onClick={restoreOriginalRom}
                                className="btn"
                                disabled={!originalRomData}
                            >
                                Restore Original
                            </button>
                        </PatchCard>
                    </div>
                    
                    {patchStatus && (
                        <div className="success-box mt-4">
                            {patchStatus}
                        </div>
                    )}
                </div>
                
                <div className="terminal-card mt-6">
                    <h3>
                        Generate Patches
                    </h3>
                    
                    <div className="patch-options">
                        <PatchCard 
                            title="IPS Patch"
                            description="Industry standard patch format"
                        >
                            <button
                                onClick={exportIpsPatch}
                                disabled={!modifiedRom || isProcessing}
                                className="btn"
                            >
                                Generate IPS
                            </button>
                        </PatchCard>
                        
                        <PatchCard 
                            title="XDelta Patch"
                            description="Efficient binary diff patch"
                        >
                            <button
                                onClick={exportXDeltaPatch}
                                disabled={!modifiedRom || isProcessing}
                                className="btn"
                            >
                                Generate XDelta
                            </button>
                        </PatchCard>
                        
                        <PatchCard 
                            title="BPS Patch"
                            description="Modern patch format with error detection"
                        >
                            <button
                                onClick={exportBpsPatch}
                                disabled={!modifiedRom}
                                className="btn"
                            >
                                Generate BPS
                            </button>
                        </PatchCard>
                    </div>
                </div>
                
                <div className="terminal-card mt-6">
                    <h3>
                        Export ROM
                    </h3>
                    
                    <div className="flex">
                        <button
                            onClick={exportModifiedRom}
                            disabled={!modifiedRom}
                            className="btn"
                        >
                            Export Patched ROM
                        </button>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
};

export default PocketTranslate;