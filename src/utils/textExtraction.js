// Improved text extraction algorithm
export const extractText = (data, start, end, hexToChar, options) => {
    const texts = [];
    let i = start;
    const terminatorBytes = options.system.terminator;
    const maxLength = Math.min(options.maxLength, 1024);
    
    // Add boundary check
    if (start >= end) return texts;
    if (start >= data.length) return texts;
    end = Math.min(end, data.length);
    
    while (i < end) {
        let currentText = '';
        let textStart = i;
        let validChars = 0;
        let terminatorFound = false;
        let lastValidByte = i;
        let consecutiveRepeats = 0;
        const lastByte = i > 0 ? data[i-1] : -1;
        
        while (i < end) {
            const byte = data[i];
            
            // Check for terminators
            if (terminatorBytes.includes(byte)) {
                if (currentText.length >= options.minLength) {
                    terminatorFound = true;
                    i++;
                    break;
                } else {
                    currentText = '';
                    textStart = i + 1;
                    validChars = 0;
                }
            }
            
            // Handle character mapping
            if (hexToChar[byte]) {
                currentText += hexToChar[byte];
                validChars++;
                lastValidByte = i;
                consecutiveRepeats = 0;
            } else if (options.asciiFallback && byte >= 0x20 && byte <= 0x7E) {
                currentText += String.fromCharCode(byte);
                validChars++;
                lastValidByte = i;
                consecutiveRepeats = 0;
            } else if (byte === 0x0A) {
                currentText += '\n';
            } else {
                // Check for consecutive repeat bytes
                if (byte === lastByte) {
                    consecutiveRepeats++;
                    if (consecutiveRepeats > 3) {
                        // Too many repeats - skip
                        currentText = '';
                        textStart = i + 1;
                        validChars = 0;
                        consecutiveRepeats = 0;
                        i++;
                        break;
                    }
                } else {
                    consecutiveRepeats = 0;
                }
                
                if (currentText.length > 0 && validChars >= options.minLength) {
                    // Stop at invalid byte after valid sequence
                    i = lastValidByte + 1;
                    break;
                } else {
                    currentText = '';
                    textStart = i + 1;
                    validChars = 0;
                }
            }
            
            i++;
            
            // Prevent infinite loops
            if (i - textStart > 10000) break;
            if (currentText.length >= maxLength) break;
        }
        
        if (validChars >= options.minLength && currentText.length <= maxLength) {
            const cleanText = currentText.trim().replace(/\n+/g, ' ');
            
            // Skip if text is all the same character or numbers
            if (!/^(.)\1{3,}$/.test(cleanText) && !/^\d+$/.test(cleanText)) {
                const isDuplicate = !options.includeRepeats && 
                    texts.some(t => t.originalText === cleanText);
                
                if (!isDuplicate) {
                    let textType = 'system';
                    if (cleanText.length > 30) textType = 'dialogue';
                    else if (/^(start|option|menu|exit|yes|no|ok|cancel)/i.test(cleanText)) textType = 'menu';
                    
                    if (options.textType === 'all' || options.textType === textType) {
                        texts.push({
                            offset: `0x${textStart.toString(16).toUpperCase().padStart(6, '0')}`,
                            originalText: cleanText,
                            startByte: textStart,
                            endByte: i,
                            length: currentText.length,
                            textType: textType,
                            terminator: terminatorFound ? data[i - 1] : null,
                            system: options.system.name
                        });
                    }
                }
            }
        }
        
        // Prevent infinite loops
        if (i <= textStart) i = textStart + 1;
        if (i >= end) break;
    }
    
    return texts;
};