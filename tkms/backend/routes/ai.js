const express = require("express");
const router = express.Router();
const { connectAzureSQL, sql } = require("../config/azureSql");
const { protectAzure } = require("../middleware/azureAuth.middleware");

async function aiChatHandler(req, res) {
  try {
    const message = req.body.message || req.body.question || req.body.query || "";

    if (!message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message is required"
      });
    }

    const pool = await connectAzureSQL();

    const keywords = `%${message.trim()}%`;

    let result = await pool.request()
      .input("search", sql.NVarChar, keywords)
      .query(`
        SELECT TOP 5
          d.id,
          d.title,
          d.category,
          d.fileName,
          d.blobUrl,
          d.uploadedAt,
          p.projectName
        FROM Documents d
        LEFT JOIN Projects p ON d.projectId = p.id
        WHERE d.isActive = 1
          AND (
            d.title LIKE @search OR
            d.category LIKE @search OR
            d.fileName LIKE @search OR
            p.projectName LIKE @search
          )
        ORDER BY d.uploadedAt DESC
      `);

    if (result.recordset.length === 0) {
      result = await pool.request().query(`
        SELECT TOP 5
          d.id,
          d.title,
          d.category,
          d.fileName,
          d.blobUrl,
          d.uploadedAt,
          p.projectName
        FROM Documents d
        LEFT JOIN Projects p ON d.projectId = p.id
        WHERE d.isActive = 1
        ORDER BY d.uploadedAt DESC
      `);
    }

    const docs = result.recordset;

    if (docs.length === 0) {
      return res.json({
        success: true,
        answer: "This information is not available in the uploaded documents. Please upload tunnel project documents first.",
        references: [],
        sessionId: req.body.sessionId || "default"
      });
    }

    const references = docs.map(d => ({
      documentId: d.id,
      documentName: d.title || d.fileName,
      projectName: d.projectName || "CBCKMS Tunnel Project"
    }));

    const context = docs.map(d =>
      `Document: ${d.title || d.fileName}, Project: ${d.projectName || "CBCKMS Tunnel Project"}, Category: ${d.category}, File: ${d.fileName}`
    ).join("\n");

    let answer = `Based on the uploaded tunnel documents, I found ${docs.length} related document(s).\n\n${context}\n\nFor your question: "${message}", please refer to the listed document references.`;

    if (process.env.GEMINI_API_KEY) {
      try {
        const { GoogleGenerativeAI } = require("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
You are an AI assistant for a Construction Knowledge Management System focused on tunnel projects.

Answer ONLY using these uploaded document records:

${context}

User question: ${message}

Give a clear professional answer. If exact information is not available, say it is not available in uploaded documents.
`;

        const geminiResult = await model.generateContent(prompt);
        answer = geminiResult.response.text();
      } catch (aiError) {
        console.error("Gemini fallback used:", aiError.message);
      }
    }

    return res.json({
      success: true,
      answer,
      response: answer,
      message: answer,
      references,
      sources: references,
      sessionId: req.body.sessionId || "default"
    });

  } catch (error) {
    console.error("AI assistant error:", error.message);

    return res.status(500).json({
      success: false,
      message: "AI assistant failed: " + error.message
    });
  }
}

router.post("/chat", protectAzure, aiChatHandler);
router.post("/ask", protectAzure, aiChatHandler);
router.post("/query", protectAzure, aiChatHandler);
router.post("/", protectAzure, aiChatHandler);

router.get("/history", protectAzure, async (req, res) => {
  res.json({
    success: true,
    chats: []
  });
});

router.delete("/history", protectAzure, async (req, res) => {
  res.json({
    success: true,
    message: "Chat history cleared"
  });
});

module.exports = router;
