const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();

const { GoogleGenerativeAI } = require("@google/generative-ai");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

const { connectAzureSQL, sql } = require("../config/azureSql");
const { protectAzure } = require("../middleware/azureAuth.middleware");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

async function ensureDocumentContentTable() {
    const pool = await connectAzureSQL();

    await pool.request().query(`
        IF OBJECT_ID('DocumentContent', 'U') IS NULL
        BEGIN
            CREATE TABLE DocumentContent (
                documentId INT PRIMARY KEY,
                extractedText NVARCHAR(MAX) NULL,
                extractedAt DATETIME2 DEFAULT SYSUTCDATETIME()
            )
        END
    `);
}

function findLocalFile(fileName, fileUrl) {
    const candidates = [
        path.join(__dirname, "..", "uploads", "documents", fileName || ""),
        path.join(__dirname, "..", "frontend", "uploads", "documents", fileName || ""),
        path.join(process.cwd(), "uploads", "documents", fileName || ""),
        path.join(process.cwd(), "frontend", "uploads", "documents", fileName || "")
    ];

    if (fileUrl) {
        const clean = fileUrl.replace(/^\/+/, "");
        candidates.push(path.join(__dirname, "..", clean));
        candidates.push(path.join(__dirname, "..", "frontend", clean));
        candidates.push(path.join(process.cwd(), clean));
    }

    return candidates.find(p => p && fs.existsSync(p));
}

async function extractTextFromFile(filePath) {
    if (!filePath || !fs.existsSync(filePath)) return "";

    const ext = path.extname(filePath).toLowerCase();

    try {
        if (ext === ".pdf") {
            const data = await pdfParse(fs.readFileSync(filePath));
            return data.text || "";
        }

        if (ext === ".docx") {
            const result = await mammoth.extractRawText({ path: filePath });
            return result.value || "";
        }

        if ([".txt", ".csv", ".md", ".json", ".html"].includes(ext)) {
            return fs.readFileSync(filePath, "utf8");
        }

        return "";
    } catch (error) {
        console.error("Text extraction failed:", filePath, error.message);
        return "";
    }
}

async function getCachedText(documentId) {
    await ensureDocumentContentTable();
    const pool = await connectAzureSQL();

    const result = await pool.request()
        .input("documentId", sql.Int, documentId)
        .query(`
            SELECT extractedText
            FROM DocumentContent
            WHERE documentId = @documentId
        `);

    return result.recordset[0]?.extractedText || "";
}

async function saveCachedText(documentId, text) {
    await ensureDocumentContentTable();
    const pool = await connectAzureSQL();

    await pool.request()
        .input("documentId", sql.Int, documentId)
        .input("extractedText", sql.NVarChar(sql.MAX), text || "")
        .query(`
            MERGE DocumentContent AS target
            USING (SELECT @documentId AS documentId, @extractedText AS extractedText) AS source
            ON target.documentId = source.documentId
            WHEN MATCHED THEN
                UPDATE SET extractedText = source.extractedText, extractedAt = SYSUTCDATETIME()
            WHEN NOT MATCHED THEN
                INSERT (documentId, extractedText, extractedAt)
                VALUES (source.documentId, source.extractedText, SYSUTCDATETIME());
        `);
}

async function loadDocumentsWithText() {
    const pool = await connectAzureSQL();

    const result = await pool.request().query(`
        SELECT TOP 50
            id,
            title,
            originalName,
            fileName,
            documentType,
            category,
            departmentName,
            projectName,
            fileUrl,
            blobUrl,
            uploadedAt,
            isActive
        FROM Documents
        WHERE isActive = 1
        ORDER BY uploadedAt DESC
    `);

    const docs = [];

    for (const doc of result.recordset) {
        let text = await getCachedText(doc.id);

        if (!text || text.trim().length < 20) {
            const filePath = findLocalFile(doc.fileName, doc.fileUrl || doc.blobUrl);
            text = await extractTextFromFile(filePath);

            if (text && text.trim()) {
                await saveCachedText(doc.id, text);
            }
        }

        docs.push({
            ...doc,
            text: (text || "").replace(/\s+/g, " ").trim()
        });
    }

    return docs;
}

function tokenize(question) {
    return String(question || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter(w => w.length > 2);
}

function makeChunks(text, size = 1200) {
    const chunks = [];
    const clean = String(text || "").replace(/\s+/g, " ").trim();

    for (let i = 0; i < clean.length; i += size) {
        chunks.push(clean.slice(i, i + size));
    }

    return chunks;
}

function searchRelevantChunks(question, documents) {
    const words = tokenize(question);
    const results = [];

    for (const doc of documents) {
        const chunks = makeChunks(doc.text || "");

        chunks.forEach((chunk, index) => {
            const lower = chunk.toLowerCase();
            let score = 0;

            words.forEach(word => {
                if (lower.includes(word)) score += 3;
            });

            const titleText = `${doc.title || ""} ${doc.originalName || ""} ${doc.documentType || ""} ${doc.projectName || ""}`.toLowerCase();
            words.forEach(word => {
                if (titleText.includes(word)) score += 2;
            });

            if (score > 0) {
                results.push({
                    score,
                    documentId: doc.id,
                    documentName: doc.title || doc.originalName || doc.fileName,
                    projectName: doc.projectName || "Tunnel Project",
                    documentType: doc.documentType || doc.category || "Document",
                    chunkIndex: index + 1,
                    text: chunk
                });
            }
        });
    }

    return results.sort((a, b) => b.score - a.score).slice(0, 8);
}

async function answerWithGemini(question, contextChunks) {
    if (!genAI) return null;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const context = contextChunks.map((c, i) => {
        return `
SOURCE ${i + 1}
Document: ${c.documentName}
Project: ${c.projectName}
Type: ${c.documentType}
Content: ${c.text}
`;
    }).join("\n\n");

    const prompt = `
You are TunnelKMS AI Assistant for tunnel construction knowledge management.

Answer the user's question using ONLY the uploaded document content below.

Rules:
1. Give a direct answer.
2. Do not say "refer yourself".
3. If exact answer is not available, say what is available and what is missing.
4. Mention document names used.
5. Keep answer professional and useful for tunnel project engineers.

Uploaded document context:
${context}

User question:
${question}

Final answer:
`;

    const result = await model.generateContent(prompt);
    return result.response.text();
}

function fallbackAnswer(question, chunks, docs) {
    if (!docs.length) {
        return "No uploaded documents are available. Please upload tunnel project documents first.";
    }

    if (!chunks.length) {
        const names = docs.map(d => d.title || d.originalName || d.fileName).join(", ");

        return `I found ${docs.length} uploaded document(s): ${names}. However, I could not find exact content related to your question: "${question}". Please upload a readable PDF, DOCX, or TXT file with project details for accurate analysis.`;
    }

    const usedDocs = [...new Set(chunks.map(c => c.documentName))].join(", ");

    const points = chunks.slice(0, 4).map((c, i) => {
        const shortText = c.text.length > 450 ? c.text.slice(0, 450) + "..." : c.text;
        return `${i + 1}. From ${c.documentName}: ${shortText}`;
    }).join("\n\n");

    return `Based on the uploaded tunnel documents, I found relevant information for your question.

${points}

Documents used: ${usedDocs}`;
}

async function handleAIQuestion(req, res) {
    try {
        const question = req.body.message || req.body.question || req.body.query || "";

        if (!question.trim()) {
            return res.status(400).json({
                success: false,
                message: "Question is required"
            });
        }

        const documents = await loadDocumentsWithText();

        if (!documents.length) {
            return res.json({
                success: true,
                answer: "No uploaded documents are available. Please upload tunnel project documents first.",
                response: "No uploaded documents are available. Please upload tunnel project documents first.",
                message: "No uploaded documents are available. Please upload tunnel project documents first.",
                references: [],
                sources: []
            });
        }

        const readableDocs = documents.filter(d => d.text && d.text.length > 20);
        const chunks = searchRelevantChunks(question, readableDocs);

        let answer = null;

        if (chunks.length) {
            answer = await answerWithGemini(question, chunks);
        }

        if (!answer) {
            answer = fallbackAnswer(question, chunks, documents);
        }

        const sources = chunks.map(c => ({
            documentId: c.documentId,
            documentName: c.documentName,
            projectName: c.projectName,
            documentType: c.documentType,
            chunk: c.chunkIndex
        }));

        return res.json({
            success: true,
            answer,
            response: answer,
            message: answer,
            references: sources,
            sources,
            sessionId: req.body.sessionId || "default"
        });

    } catch (error) {
        console.error("AI assistant error:", error);
        return res.status(500).json({
            success: false,
            message: "AI Assistant failed",
            error: error.message
        });
    }
}

router.post("/chat", protectAzure, handleAIQuestion);
router.post("/ask", protectAzure, handleAIQuestion);
router.post("/query", protectAzure, handleAIQuestion);
router.post("/", protectAzure, handleAIQuestion);

module.exports = router;

