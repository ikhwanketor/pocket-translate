import React from 'react';

const TextItem = ({ text, index, currentPage, textsPerPage, updateTranslation }) => {
    const originalLength = text.endByte - text.startByte;
    const translationLength = text.translatedText ? new TextEncoder().encode(text.translatedText).length : 0;
    const lengthWarning = translationLength > originalLength;
    
    return (
        <div className={`text-item text-type-${text.textType}`}>
            <div className="flex" style={{marginBottom: '8px', fontSize: '9px'}}>
                <span>#{((currentPage - 1) * textsPerPage) + index + 1}</span>
                <span>{text.offset}</span>
                <span>{text.textType.toUpperCase()}</span>
                <span>{text.length} chars</span>
            </div>
            
            <div className="grid grid-2" style={{gap: '10px'}}>
                <div>
                    <div style={{fontSize: '9px', color: '#888', marginBottom: '4px'}}>
                        ORIGINAL:
                    </div>
                    <textarea
                        className="textarea"
                        value={text.originalText}
                        readOnly
                        style={{minHeight: '80px'}}
                    />
                    <div className="translation-length">
                        Original length: {originalLength} bytes
                    </div>
                </div>
                
                <div>
                    <div style={{fontSize: '9px', color: '#888', marginBottom: '4px'}}>
                        TRANSLATION:
                    </div>
                    <textarea
                        className="textarea"
                        value={text.translatedText}
                        onChange={(e) => updateTranslation(text.id, e.target.value)}
                        placeholder="Enter translation..."
                        style={{minHeight: '80px'}}
                    />
                    <div className={`translation-length ${lengthWarning ? 'length-warning' : 'length-ok'}`}>
                        {translationLength} bytes {lengthWarning ? `(Exceeds by ${translationLength - originalLength} bytes!)` : ''}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TextItem;