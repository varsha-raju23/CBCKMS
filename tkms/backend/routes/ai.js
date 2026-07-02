const express = require('express');
const router = express.Router();
const Document = require('../models/Document');
const AIChat = require('../models/AIChat');
const { protect } = require('../middleware/auth');

// POST /api/ai/chat
router.post('/chat', protect, async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ success: false, message: 'Message is required' });

    // Fetch relevant documents with text content
    const documents = await Document.find({
      isDeleted: false,
      isProcessed: true,
      extractedText: { $exists: true, $ne: '' }
    }).select('documentId originalName projectName departmentName documentType tunnelSection extractedText description createdAt uploadedByName');

    let contextText = '';
    let referencedDocs = [];

    if (documents.length === 0) {
      const answer = 'This information is not available in the uploaded documents. No documents have been uploaded to the system yet.';
      return res.json({ success: true, answer, references: [], sessionId });
    }

    // Build context from documents (simple keyword matching + full context)
    const msgLower = message.toLowerCase();
    const keywords = msgLower.split(/\s+/).filter(w => w.length > 3);

    // Score each document for relevance
    const scored = documents.map(doc => {
      let score = 0;
      const searchText = `${doc.originalName} ${doc.projectName} ${doc.documentType} ${doc.description} ${doc.tunnelSection} ${doc.extractedText}`.toLowerCase();
      keywords.forEach(kw => { if (searchText.includes(kw)) score++; });
      if (searchText.includes(msgLower)) score += 10;
      return { doc, score };
    }).filter(d => d.score > 0).sort((a, b) => b.score - a.score);

    // Take top 5 most relevant
    const topDocs = scored.slice(0, 5);

    if (topDocs.length === 0) {
      // No matches, include summaries of all docs
      documents.slice(0, 3).forEach(doc => {
        contextText += `\n---\nDocument: "${doc.originalName}"\nProject: ${doc.projectName}\nType: ${doc.documentType}\nSection: ${doc.tunnelSection || 'N/A'}\nContent: ${(doc.extractedText || doc.description || '').substring(0, 1000)}\n`;
      });
    } else {
      topDocs.forEach(({ doc }) => {
        contextText += `\n---\nDocument ID: ${doc.documentId}\nDocument: "${doc.originalName}"\nProject: ${doc.projectName}\nDepartment: ${doc.departmentName}\nType: ${doc.documentType}\nTunnel Section: ${doc.tunnelSection || 'N/A'}\nUploaded by: ${doc.uploadedByName}\nDate: ${new Date(doc.createdAt).toLocaleDateString()}\nContent:\n${(doc.extractedText || doc.description || '').substring(0, 3000)}\n`;
        referencedDocs.push({ documentId: doc.documentId, documentName: doc.originalName, projectName: doc.projectName });
      });
    }

    // Call Gemini API
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const systemPrompt = `You are an expert AI assistant for a Construction Knowledge Management System focused on tunnel construction projects. 
    
You MUST answer questions ONLY based on the provided tunnel construction documents below.
If the information is not found in the documents, you MUST say: "This information is not available in the uploaded documents."
Always mention which document you are referencing.
Be professional, precise, and helpful.
Format your answers clearly with document references.

UPLOADED TUNNEL CONSTRUCTION DOCUMENTS:
${contextText}

USER QUESTION: ${message}

Answer based ONLY on the above documents. If not found in documents, say "This information is not available in the uploaded documents."`;

    const result = await model.generateContent(systemPrompt);
    const answer = result.response.text();

    // Save chat history
    await AIChat.findOneAndUpdate(
      { userId: req.user._id, sessionId: sessionId || 'default' },
      {
        $push: {
          messages: [
            { role: 'user', content: message, timestamp: new Date() },
            { role: 'assistant', content: answer, references: referencedDocs, timestamp: new Date() }
          ]
        }
      },
      { upsert: true }
    );

    res.json({ success: true, answer, references: referencedDocs, sessionId });
  } catch (err) {
    console.error('AI error:', err);
    if (err.message?.includes('API_KEY') || err.message?.includes('api_key')) {
      return res.status(500).json({ success: false, message: 'Gemini API key not configured. Please add GEMINI_API_KEY to backend .env file.' });
    }
    res.status(500).json({ success: false, message: 'AI service error: ' + err.message });
  }
});

// GET /api/ai/history
router.get('/history', protect, async (req, res) => {
  try {
    const chats = await AIChat.find({ userId: req.user._id }).sort({ updatedAt: -1 }).limit(10);
    res.json({ success: true, chats });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/ai/history
router.delete('/history', protect, async (req, res) => {
  try {
    await AIChat.deleteMany({ userId: req.user._id });
    res.json({ success: true, message: 'Chat history cleared' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
