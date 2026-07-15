const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();

let GoogleGenerativeAI = null;
let pdfParse = null;
let mammoth = null;

try { GoogleGenerativeAI = require("@google/generative-ai").GoogleGenerativeAI; } catch {}
try { pdfParse = require("pdf-parse"); } catch {}
try { mammoth = require("mammoth"); } catch {}

const { connectAzureSQL } = require("../config/azureSql");
const { protectAzure } = require("../middleware/azureAuth.middleware");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const genAI = GEMINI_API_KEY && GoogleGenerativeAI ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

function cleanText(value) {
    return String(value || "")
        .replace(/\s+/g, " ")
        .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]/g, "")
        .trim();
}

function docName(doc) {
    return cleanText(doc.title || doc.originalName || doc.fileName || ("Document " + doc.id));
}

function docType(doc) {
    return cleanText(doc.documentType || doc.category || doc.type || "General Document");
}

function projectName(doc) {
    return cleanText(doc.projectName || doc.project || "Tunnel Project");
}

async function getDocuments() {
    const pool = await connectAzureSQL();

    try {
        const result = await pool.request().query(`
            SELECT TOP 100 *
            FROM Documents
            WHERE ISNULL(isActive, 1) = 1
            ORDER BY id DESC
        `);
        return result.recordset || [];
    } catch {
        const result = await pool.request().query(`
            SELECT TOP 100 *
            FROM Documents
            ORDER BY id DESC
        `);
        return result.recordset || [];
    }
}

function findLocalFile(doc) {
    const fileName = doc.fileName || "";
    const fileUrl = doc.fileUrl || doc.blobUrl || "";

    const candidates = [];

    if (fileName) {
        candidates.push(path.join(__dirname, "..", "uploads", "documents", fileName));
        candidates.push(path.join(process.cwd(), "uploads", "documents", fileName));
        candidates.push(path.join(__dirname, "..", "frontend", "uploads", "documents", fileName));
    }

    if (fileUrl) {
        const cleanUrl = String(fileUrl).replace(/^\/+/, "");
        candidates.push(path.join(__dirname, "..", cleanUrl));
        candidates.push(path.join(process.cwd(), cleanUrl));
        candidates.push(path.join(__dirname, "..", "frontend", cleanUrl));
    }

    return candidates.find(p => p && fs.existsSync(p));
}

async function extractText(filePath) {
    if (!filePath || !fs.existsSync(filePath)) return "";

    const ext = path.extname(filePath).toLowerCase();

    try {
        if (ext === ".pdf" && pdfParse) {
            const data = await pdfParse(fs.readFileSync(filePath));
            return cleanText(data.text || "");
        }

        if (ext === ".docx" && mammoth) {
            const data = await mammoth.extractRawText({ path: filePath });
            return cleanText(data.value || "");
        }

        if ([".txt", ".md", ".csv", ".json"].includes(ext)) {
            return cleanText(fs.readFileSync(filePath, "utf8"));
        }

        return "";
    } catch (error) {
        console.error("Document extraction failed:", error.message);
        return "";
    }
}

async function loadDocumentText(doc) {
    const directText = cleanText(doc.extractedText || doc.content || doc.description || "");
    if (directText.length > 30) return directText;

    const filePath = findLocalFile(doc);
    const extracted = await extractText(filePath);
    return extracted;
}

function tokenize(question) {
    const stop = new Set(["what", "when", "where", "which", "with", "from", "that", "this", "have", "been", "will", "shall", "your", "about", "documents", "document", "uploaded", "project"]);
    return cleanText(question)
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter(w => w.length > 2 && !stop.has(w));
}

function splitChunks(text, size = 1000) {
    const chunks = [];
    const clean = cleanText(text);

    for (let i = 0; i < clean.length; i += size) {
        chunks.push(clean.slice(i, i + size));
    }

    return chunks;
}

function isDocumentListQuestion(question) {
    const q = question.toLowerCase();
    return q.includes("what documents") ||
        q.includes("which documents") ||
        q.includes("list documents") ||
        q.includes("available documents") ||
        q.includes("what files") ||
        q.includes("available files");
}

function searchRelevantChunks(question, docs) {
    const words = tokenize(question);
    const results = [];

    for (const doc of docs) {
        const metadata = [
            docName(doc),
            docType(doc),
            projectName(doc),
            doc.departmentName || "",
            doc.tags || ""
        ].join(" ").toLowerCase();

        const chunks = splitChunks(doc.__text || "");

        chunks.forEach((chunk, index) => {
            const lower = chunk.toLowerCase();
            let score = 0;

            for (const word of words) {
                if (lower.includes(word)) score += 5;
                if (metadata.includes(word)) score += 2;
            }

            if (score > 0) {
                results.push({
                    score,
                    documentId: doc.id,
                    documentName: docName(doc),
                    projectName: projectName(doc),
                    documentType: docType(doc),
                    chunkIndex: index + 1,
                    text: chunk
                });
            }
        });

        if (!chunks.length) {
            let score = 0;
            for (const word of words) {
                if (metadata.includes(word)) score += 2;
            }

            if (score > 0) {
                results.push({
                    score,
                    documentId: doc.id,
                    documentName: docName(doc),
                    projectName: projectName(doc),
                    documentType: docType(doc),
                    chunkIndex: 0,
                    text: "Document metadata: " + metadata
                });
            }
        }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, 8);
}

async function geminiAnswer(question, chunks) {
    if (!genAI || !chunks.length) return null;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const context = chunks.map((c, i) => {
            return [
                "SOURCE " + (i + 1),
                "Document: " + c.documentName,
                "Project: " + c.projectName,
                "Type: " + c.documentType,
                "Content: " + c.text
            ].join("\n");
        }).join("\n\n");

        const prompt = [
            "You are TunnelKMS AI Assistant for tunnel construction knowledge management.",
            "Answer using ONLY the uploaded document context.",
            "Do not say refer yourself.",
            "Give a direct professional answer for tunnel engineers.",
            "If exact information is missing, say exact information is not available and mention related information found.",
            "Mention document names used.",
            "",
            "Uploaded document context:",
            context,
            "",
            "User question:",
            question,
            "",
            "Answer:"
        ].join("\n");

        const result = await model.generateContent(prompt);
        return cleanText(result.response.text());
    } catch (error) {
        console.error("Gemini failed:", error.message);
        return null;
    }
}

function listDocumentsAnswer(docs) {
    if (!docs.length) {
        return "No uploaded documents are available. Please upload readable PDF, DOCX, or TXT tunnel documents first.";
    }

    const lines = docs.map((d, i) => {
        return (i + 1) + ". " + docName(d) + " | Project: " + projectName(d) + " | Type: " + docType(d);
    });

    return "The following uploaded tunnel documents are available:\n\n" + lines.join("\n");
}

function fallbackAnswer(question, docs, chunks) {
    if (!docs.length) {
        return "No uploaded documents are available. Please upload readable PDF, DOCX, or TXT tunnel documents first.";
    }

    if (isDocumentListQuestion(question)) {
        return listDocumentsAnswer(docs);
    }

    if (!chunks.length) {
        const related = docs.slice(0, 5).map(d => docName(d)).join(", ");
        return "This exact information is not available in uploaded documents. Related uploaded documents found: " + related + ". Please upload a readable document containing this detail for a more accurate answer.";
    }

    const used = [...new Set(chunks.map(c => c.documentName))].join(", ");

    const points = chunks.slice(0, 5).map((c, i) => {
        const shortText = c.text.length > 500 ? c.text.slice(0, 500) + "..." : c.text;
        return (i + 1) + ". From " + c.documentName + ": " + shortText;
    }).join("\n\n");

    return [
        "Based on the uploaded tunnel documents, I found the following relevant information:",
        "",
        points,
        "",
        "Documents used: " + used
    ].join("\n");
}

function uniqueSources(chunks) {
    const map = new Map();

    for (const c of chunks) {
        if (!map.has(c.documentId)) {
            map.set(c.documentId, {
                documentId: c.documentId,
                documentName: c.documentName,
                projectName: c.projectName,
                documentType: c.documentType
            });
        }
    }

    return Array.from(map.values());
}

async function handleQuestion(req, res) {
    try {
        const question = cleanText(req.body.message || req.body.question || req.body.query || "");

        if (!question) {
            return res.status(400).json({
                success: false,
                message: "Question is required"
            });
        }

        const docs = await getDocuments();

        for (const doc of docs) {
            doc.__text = await loadDocumentText(doc);
        }

        if (isDocumentListQuestion(question)) {
            const answer = listDocumentsAnswer(docs);
            return res.json({
                success: true,
                answer,
                response: answer,
                message: answer,
                sources: docs.map(d => ({
                    documentId: d.id,
                    documentName: docName(d),
                    projectName: projectName(d),
                    documentType: docType(d)
                })),
                references: docs.map(d => ({
                    documentId: d.id,
                    documentName: docName(d),
                    projectName: projectName(d),
                    documentType: docType(d)
                })),
                sessionId: req.body.sessionId || "default"
            });
        }

        const readableDocs = docs.filter(d => d.__text && d.__text.length > 20);
        const chunks = searchRelevantChunks(question, readableDocs.length ? readableDocs : docs);

        let answer = await geminiAnswer(question, chunks);

        if (!answer) {
            answer = fallbackAnswer(question, docs, chunks);
        }

        const sources = uniqueSources(chunks);

        return res.json({
            success: true,
            answer,
            response: answer,
            message: answer,
            sources,
            references: sources,
            sessionId: req.body.sessionId || "default"
        });
    } catch (error) {
        console.error("AI Assistant error:", error);
        return res.status(200).json({
            success: true,
            answer: "AI could not answer right now. Please upload readable PDF, DOCX, or TXT documents and try again.",
            response: "AI could not answer right now. Please upload readable PDF, DOCX, or TXT documents and try again.",
            message: "AI could not answer right now. Please upload readable PDF, DOCX, or TXT documents and try again.",
            sources: [],
            references: [],
            error: error.message
        });
    }
}

router.post("/chat", protectAzure, handleQuestion);
router.post("/ask", protectAzure, handleQuestion);
router.post("/query", protectAzure, handleQuestion);
router.post("/", protectAzure, handleQuestion);

module.exports = router;
