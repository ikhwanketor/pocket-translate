// Enhanced ROM Detection with Header Analysis
export const detectSystem = (fileName, data) => {
    const ext = fileName.split('.').pop().toLowerCase();
    let detectedSystem = null;
    
    // Detect by file header
    if (data && data.length > 16) {
        // NES detection
        if (data[0] === 0x4E && data[1] === 0x45 && data[2] === 0x53 && data[3] === 0x1A) {
            detectedSystem = "NES";
        }
        // SNES detection
        else if (data[0x7FC0] === 0xAA && data[0x7FC1] === 0xBB && data[0x7FC2] === 0x04) {
            detectedSystem = "SNES";
        }
        // Game Boy detection
        else if (data[0x104] === 0xCE && data[0x105] === 0xED && data[0x106] === 0x66 && data[0x107] === 0x66) {
            detectedSystem = "GB";
        }
        // GBA detection
        else if (data[0xB2] === 0x96 && data[0xB3] === 0x00 && data[0xB4] === 0x00) {
            detectedSystem = "GBA";
        }
        // NDS detection
        else if (data[0] === 0x2E && data[1] === 0x00 && data[2] === 0x00 && data[3] === 0xEA) {
            detectedSystem = "NDS";
        }
    }
    
    // Fallback to extension-based detection
    const systems = {
        nes: { name: detectedSystem || "NES", terminator: [0x00], encoding: "ascii" },
        snes: { name: detectedSystem || "SNES", terminator: [0x00], encoding: "ascii" },
        gb: { name: detectedSystem || "Game Boy", terminator: [0x50, 0x00], encoding: "ascii" },
        gbc: { name: detectedSystem || "GBC", terminator: [0x50, 0x00], encoding: "ascii" },
        gba: { name: detectedSystem || "GBA", terminator: [0x00, 0xFF, 0xFD], encoding: "ascii" },
        nds: { name: detectedSystem || "NDS", terminator: [0x00, 0xFF, 0xFE], encoding: "ascii" },
        smd: { name: "Genesis", terminator: [0x00], encoding: "ascii" },
        bin: { name: "PlayStation", terminator: [0x00, 0xFF], encoding: "ascii" },
        iso: { name: "PlayStation", terminator: [0x00, 0xFF], encoding: "ascii" },
        z64: { name: "Nintendo 64", terminator: [0x00], encoding: "ascii" },
        n64: { name: "Nintendo 64", terminator: [0x00], encoding: "ascii" },
        v64: { name: "Nintendo 64", terminator: [0x00], encoding: "ascii" }
    };
    
    return systems[ext] || { 
        name: detectedSystem || "Unknown", 
        terminator: [0x00, 0xFF],
        encoding: "ascii"
    };
};

// Find free space in ROM
export const findFreeSpace = (romData) => {
    // Look for a block of 0xFF or 0x00 of at least 1024 bytes
    let consecutiveFree = 0;
    let start = -1;
    
    for (let i = 0; i < romData.length; i++) {
        if (romData[i] === 0xFF || romData[i] === 0x00) {
            if (consecutiveFree === 0) start = i;
            consecutiveFree++;
            
            if (consecutiveFree >= 1024) {
                return start;
            }
        } else {
            consecutiveFree = 0;
            start = -1;
        }
    }
    
    // Default to end of ROM if no large free space found
    return Math.max(0, romData.length - 1024);
};