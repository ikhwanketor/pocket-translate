// Enhanced Heuristic Table Generator (Advanced Version)
export const generateHeuristicTable = (romData) => {
    const freq = new Array(256).fill(0);
    const bigramFreq = new Array(256).fill(0).map(() => new Array(256).fill(0));
    const charFreq = {};

    // Pass 1: Frequency and Bigram Analysis
    for (let i = 0; i < romData.length - 1; i++) {
        const byte1 = romData[i];
        const byte2 = romData[i + 1];
        freq[byte1]++;
        bigramFreq[byte1][byte2]++;
    }
    freq[romData.length - 1]++; // Count the last byte

    const candidates = [];
    for (let i = 0; i < 256; i++) {
        if (freq[i] > 100) { // Only consider reasonably frequent bytes
            candidates.push({ byte: i, count: freq[i] });
        }
    }
    candidates.sort((a, b) => b.count - a.count);

    const table = {};
    const assignedBytes = new Set();

    // Pass 2: Identify likely terminator and space
    // Terminator is often frequent but rarely starts a common bigram
    let terminator = -1;
    for (const c of candidates) {
        const byte = c.byte;
        const startsCommonBigram = bigramFreq[byte].some(count => count > 50);
        if (!startsCommonBigram && c.count > 1000) {
            terminator = byte;
            break;
        }
    }
    if (terminator !== -1) {
        table[terminator] = '[END]';
        assignedBytes.add(terminator);
    }
    
    // Space is frequent and part of many different bigrams
    let space = -1;
    let maxDiversity = 0;
    for (const c of candidates) {
        if (assignedBytes.has(c.byte)) continue;
        const beforeDiversity = bigramFreq.map(row => row[c.byte]).filter(count => count > 0).length;
        const afterDiversity = bigramFreq[c.byte].filter(count => count > 0).length;
        const diversity = beforeDiversity + afterDiversity;
        
        if (diversity > maxDiversity) {
            maxDiversity = diversity;
            space = c.byte;
        }
    }
    if (space !== -1) {
        table[space] = ' ';
        assignedBytes.add(space);
    }

    // Pass 3: Character frequency analysis
    for (let i = 0; i < romData.length; i++) {
        const byte = romData[i];
        if (!assignedBytes.has(byte)) {
            charFreq[byte] = (charFreq[byte] || 0) + 1;
        }
    }

    // Pass 4: Map to common characters
    const commonChars = 'ETAOINSHRDLCUMWFGYPBVKJXQZetaoinshrdlcumwfgypbvkjxqz0123456789.,!?\'";:()- ';
    const charMap = {};
    const charCounts = Object.entries(charFreq).sort((a, b) => b[1] - a[1]);
    
    for (let i = 0; i < Math.min(charCounts.length, commonChars.length); i++) {
        const [byte] = charCounts[i];
        const char = commonChars[i];
        if (!assignedBytes.has(parseInt(byte))) {
            table[parseInt(byte)] = char;
            assignedBytes.add(parseInt(byte));
        }
    }

    // Add common control characters if not assigned
    if (!table.hasOwnProperty(0x0A)) table[0x0A] = '[LF]'; // Line Feed
    if (!table.hasOwnProperty(0x0D)) table[0x0D] = '[CR]'; // Carriage Return
    if (!table.hasOwnProperty(0x01)) table[0x01] = '[PLAYER]'; // Common placeholder
    if (!table.hasOwnProperty(0x02)) table[0x02] = '[ITEM]'; // Common placeholder

    return table;
};