const fs = require('fs');
const path = require('path');

const extractText = async (filePath, mimeType) => {
  try {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.pdf') {
      try {
        const pdfParse = require('pdf-parse');
        const buffer = fs.readFileSync(filePath);
        const data = await pdfParse(buffer);
        return data.text.substring(0, 50000); // Limit to 50k chars
      } catch (e) {
        console.log('PDF parse error:', e.message);
        return '';
      }
    }

    if (ext === '.docx' || ext === '.doc') {
      try {
        const mammoth = require('mammoth');
        const result = await mammoth.extractRawText({ path: filePath });
        return result.value.substring(0, 50000);
      } catch (e) {
        console.log('DOCX parse error:', e.message);
        return '';
      }
    }

    if (ext === '.txt' || ext === '.csv') {
      const content = fs.readFileSync(filePath, 'utf8');
      return content.substring(0, 50000);
    }

    // For images and other files, return empty (could add OCR here)
    return '';
  } catch (err) {
    console.error('Text extraction error:', err.message);
    return '';
  }
};

const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  return (bytes / 1073741824).toFixed(1) + ' GB';
};

module.exports = { extractText, formatFileSize };
