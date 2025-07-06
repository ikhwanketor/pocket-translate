// Enhanced ROM Rebuilding Engine
export const rebuildRom = (originalRom, translations, system) => {
    const romCopy = new Uint8Array(originalRom);
    const newTextBlocks = [];
    const freeSpaceStart = findFreeSpace(originalRom);
    
    translations.forEach(text => {
        if (!text.translatedText || text.translatedText.trim() === '') return;
        
        const start = parseInt(text.offset.substring(2), 16);
        const encoder = new TextEncoder();
        const translatedBytes = encoder.encode(text.translatedText);
        const terminator = system.terminator[0];
        const originalLength = text.endByte - text.startByte;
        
        // Check if translation fits in original space
        if (translatedBytes.length <= originalLength) {
            // Write translated text
            for (let i = 0; i < translatedBytes.length; i++) {
                if (start + i < romCopy.length) {
                    romCopy[start + i] = translatedBytes[i];
                }
            }
            
            // Write terminator
            if (start + translatedBytes.length < romCopy.length) {
                romCopy[start + translatedBytes.length] = terminator;
            }
            
            // Clear remaining space
            for (let i = translatedBytes.length + 1; i < originalLength; i++) {
                if (start + i < romCopy.length) {
                    romCopy[start + i] = 0xFF; // Fill with unused value
                }
            }
            
            // Record modified block
            newTextBlocks.push({
                start,
                end: start + translatedBytes.length,
                original: text.originalText,
                translation: text.translatedText
            });
        } else {
            // Write to free space
            const newStart = freeSpaceStart;
            for (let i = 0; i < translatedBytes.length; i++) {
                if (newStart + i < romCopy.length) {
                    romCopy[newStart + i] = translatedBytes[i];
                }
            }
            
            // Write terminator
            if (newStart + translatedBytes.length < romCopy.length) {
                romCopy[newStart + translatedBytes.length] = terminator;
            }
            
            // Update pointer to new location
            // (This is simplified - real implementation would update all pointers)
            romCopy[start] = newStart & 0xFF;
            romCopy[start + 1] = (newStart >> 8) & 0xFF;
            
            newTextBlocks.push({
                start: newStart,
                end: newStart + translatedBytes.length,
                original: text.originalText,
                translation: text.translatedText,
                relocated: true
            });
        }
    });
    
    return {
        modifiedRom: romCopy,
        modifiedBlocks: newTextBlocks
    };
};

// Optimized IPS Patch Generator
export const generateIpsPatch = async (original, modified, romName) => {
    // IPS Header: "PATCH"
    let patchData = [];
    patchData.push(0x50, 0x41, 0x54, 0x43, 0x48); // "PATCH"
    let records = [];
    let offset = 0;
    const chunkSize = 65536;
    
    while (offset < original.length) {
        if (original[offset] !== modified[offset]) {
            const startOffset = offset;
            let recordLength = 0;
            let recordData = [];
            
            while (offset < original.length && 
                   original[offset] !== modified[offset] && 
                   recordLength < 65535) {
                recordData.push(modified[offset]);
                recordLength++;
                offset++;
            }
            
            // Add record
            records.push({
                offset: startOffset,
                length: recordLength,
                data: recordData
            });
        } else {
            offset++;
        }
        
        // Process in chunks to prevent UI freeze
        if (offset % chunkSize === 0) {
            // Yield to UI
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }
    
    // Combine all records
    records.forEach(record => {
        // Offset (3 bytes big-endian)
        patchData.push((record.offset >> 16) & 0xFF);
        patchData.push((record.offset >> 8) & 0xFF);
        patchData.push(record.offset & 0xFF);
        
        // Length (2 bytes big-endian)
        patchData.push((record.length >> 8) & 0xFF);
        patchData.push(record.length & 0xFF);
        
        // Data
        patchData.push(...record.data);
    });
    
    // EOF marker: "EOF"
    patchData.push(0x45, 0x4F, 0x46);
    
    return {
        name: `${romName.replace(/\.[^/.]+$/, "")}.ips`,
        data: new Uint8Array(patchData)
    };
};

// Generate XDelta patch
export const generateXDeltaPatch = async (original, modified) => {
    return new Promise((resolve, reject) => {
        try {
            const xdelta = new Xdelta();
            const patch = xdelta.createPatch(original, modified);
            resolve({
                name: "translation_patch.xdelta",
                data: patch
            });
        } catch (err) {
            reject(err);
        }
    });
};

// Generate BPS patch
export const generateBpsPatch = (original, modified) => {
    const bps = new BPS();
    const patch = bps.create(original, modified);
    return {
        name: "translation_patch.bps",
        data: patch
    };
};

// Apply patch to ROM
export const applyPatch = async (romData, patchData, patchType) => {
    return new Promise((resolve, reject) => {
        try {
            let patchedRom;
            if (patchType === 'ips') {
                patchedRom = applyIpsPatch(romData, patchData);
            } else if (patchType === 'xdelta') {
                const xdelta = new Xdelta();
                patchedRom = xdelta.applyPatch(romData, patchData);
            } else if (patchType === 'bps') {
                const bps = new BPS();
                patchedRom = bps.apply(romData, patchData);
            } else {
                reject(new Error("Unsupported patch type"));
                return;
            }
            resolve(patchedRom);
        } catch (err) {
            reject(err);
        }
    });
};

// Apply IPS patch
export const applyIpsPatch = (original, patchData) => {
    // IPS Header: "PATCH"
    const header = String.fromCharCode(...patchData.slice(0, 5));
    if (header !== "PATCH") {
        throw new Error("Invalid IPS patch file");
    }
    
    const patchedRom = new Uint8Array(original);
    let offset = 5;
    
    while (offset < patchData.length - 3) {
        // Check for EOF marker
        if (patchData[offset] === 0x45 && 
            patchData[offset+1] === 0x4F && 
            patchData[offset+2] === 0x46) {
            break;
        }
        
        // Read record offset
        const recordOffset = 
            (patchData[offset] << 16) | 
            (patchData[offset+1] << 8) | 
            patchData[offset+2];
        offset += 3;
        
        // Read record length
        const recordLength = (patchData[offset] << 8) | patchData[offset+1];
        offset += 2;
        
        // Apply record
        if (recordLength > 0) {
            for (let i = 0; i < recordLength; i++) {
                if (recordOffset + i < patchedRom.length) {
                    patchedRom[recordOffset + i] = patchData[offset + i];
                }
            }
            offset += recordLength;
        } else {
            // RLE record (not implemented in this example)
            offset += 3;
        }
    }
    
    return patchedRom;
};