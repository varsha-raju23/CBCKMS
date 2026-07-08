const { connectAzureSQL, sql } = require("../config/azureSql");
const { uploadFileToAzureBlob } = require("../services/azureBlob.service");
const { BlobServiceClient } = require("@azure/storage-blob");
const path = require("path");
const fs = require("fs");

async function ensureDefaultProject(pool, userId) {
    const existing = await pool.request()
        .query("SELECT TOP 1 id FROM Projects ORDER BY id ASC");

    if (existing.recordset.length > 0) {
        return existing.recordset[0].id;
    }

    const inserted = await pool.request()
        .input("projectName", sql.NVarChar, "CBCKMS Tunnel Project")
        .input("location", sql.NVarChar, "Central India")
        .input("tunnelType", sql.NVarChar, "Metro Tunnel")
        .input("method", sql.NVarChar, "TBM")
        .input("createdBy", sql.Int, userId || null)
        .query(`
            INSERT INTO Projects (
                projectName, location, tunnelType, method, createdBy
            )
            OUTPUT INSERTED.id
            VALUES (
                @projectName, @location, @tunnelType, @method, @createdBy
            )
        `);

    return inserted.recordset[0].id;
}

function mapDocument(row) {
    return {
        id: row.id,
        _id: row.id,
        projectId: row.projectId,
        title: row.title,
        originalName: row.title || row.fileName,
        fileName: row.fileName,
        category: row.category,
        documentType: row.category,
        departmentName: row.category,
        projectName: row.projectName || "CBCKMS Tunnel Project",
        blobUrl: row.blobUrl,
        fileUrl: row.blobUrl,
        versionNo: row.versionNo,
        uploadedBy: row.uploadedBy,
        uploadedAt: row.uploadedAt,
        createdAt: row.uploadedAt,
        isActive: row.isActive,
        fileSize: 0,
        downloadCount: 0
    };
}

async function uploadAzureDocument(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Document file is required"
            });
        }

        const pool = await connectAzureSQL();

        let projectIdValue = req.body.projectId && !isNaN(Number(req.body.projectId))
            ? Number(req.body.projectId)
            : null;

        if (!projectIdValue) {
            projectIdValue = await ensureDefaultProject(pool, req.user?.id);
        }

        const title =
            req.body.title ||
            req.body.originalName ||
            req.body.projectName ||
            req.file.originalname ||
            "Untitled Document";

        const category =
            req.body.category ||
            req.body.documentType ||
            req.body.department ||
            "General";

        let fileName = `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
        let fileUrl;

        if (process.env.AZURE_STORAGE_CONNECTION_STRING) {
            const uploadedFile = await uploadFileToAzureBlob(
                req.file,
                `projects/${projectIdValue}/${category}`
            );

            fileName = uploadedFile.fileName;
            fileUrl = uploadedFile.blobUrl;
        } else {
            const uploadDir = path.join(__dirname, "..", "uploads", "documents");
            fs.mkdirSync(uploadDir, { recursive: true });

            const filePath = path.join(uploadDir, fileName);
            fs.writeFileSync(filePath, req.file.buffer);

            fileUrl = `/uploads/documents/${fileName}`;
        }

        const result = await pool.request()
            .input("projectId", sql.Int, projectIdValue)
            .input("title", sql.NVarChar, title)
            .input("category", sql.NVarChar, category)
            .input("fileName", sql.NVarChar, fileName)
            .input("blobUrl", sql.NVarChar, fileUrl)
            .input("uploadedBy", sql.Int, req.user?.id || null)
            .query(`
                INSERT INTO Documents (
                    projectId,
                    title,
                    category,
                    fileName,
                    blobUrl,
                    uploadedBy
                )
                OUTPUT INSERTED.*
                VALUES (
                    @projectId,
                    @title,
                    @category,
                    @fileName,
                    @blobUrl,
                    @uploadedBy
                )
            `);

        return res.status(201).json({
            success: true,
            message: "Document uploaded successfully",
            document: mapDocument(result.recordset[0])
        });
    } catch (error) {
        console.error("Azure document upload error:", error.message);

        return res.status(500).json({
            success: false,
            message: error.message || "Failed to upload document"
        });
    }
}

async function getAzureDocuments(req, res) {
    try {
        const { projectId, search, limit } = req.query;

        const pool = await connectAzureSQL();
        const request = pool.request();

        let query = `
            SELECT TOP (${Number(limit) || 100})
                d.id,
                d.projectId,
                d.title,
                d.category,
                d.fileName,
                d.blobUrl,
                d.versionNo,
                d.uploadedBy,
                d.uploadedAt,
                d.isActive,
                p.projectName
            FROM Documents d
            LEFT JOIN Projects p ON d.projectId = p.id
            WHERE d.isActive = 1
        `;

        if (projectId) {
            request.input("projectId", sql.Int, Number(projectId));
            query += ` AND d.projectId = @projectId`;
        }

        if (search) {
            request.input("search", sql.NVarChar, `%${search}%`);
            query += ` AND (d.title LIKE @search OR d.category LIKE @search OR d.fileName LIKE @search)`;
        }

        query += ` ORDER BY d.uploadedAt DESC`;

        const result = await request.query(query);

        return res.status(200).json({
            success: true,
            documents: result.recordset.map(mapDocument)
        });
    } catch (error) {
        console.error("Azure document list error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch documents"
        });
    }
}

async function getAzureDocumentById(req, res) {
    try {
        const pool = await connectAzureSQL();

        const result = await pool.request()
            .input("id", sql.Int, Number(req.params.id))
            .query(`
                SELECT 
                    d.*,
                    p.projectName
                FROM Documents d
                LEFT JOIN Projects p ON d.projectId = p.id
                WHERE d.id = @id AND d.isActive = 1
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Document not found"
            });
        }

        return res.json({
            success: true,
            document: mapDocument(result.recordset[0])
        });
    } catch (error) {
        console.error("Azure document view error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch document"
        });
    }
}

async function downloadAzureDocument(req, res) {
    try {
        const pool = await connectAzureSQL();

        const result = await pool.request()
            .input("id", sql.Int, Number(req.params.id))
            .query(`
                SELECT *
                FROM Documents
                WHERE id = @id AND isActive = 1
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Document not found"
            });
        }

        const document = result.recordset[0];

        if (document.blobUrl && document.blobUrl.startsWith("/uploads/")) {
            const localPath = path.join(__dirname, "..", document.blobUrl);
            return res.download(localPath, document.title || document.fileName);
        }

        if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
            return res.redirect(document.blobUrl);
        }

        const containerName = process.env.AZURE_STORAGE_CONTAINER || "tunnel-documents";

        const blobServiceClient = BlobServiceClient.fromConnectionString(
            process.env.AZURE_STORAGE_CONNECTION_STRING
        );

        const containerClient = blobServiceClient.getContainerClient(containerName);

        const blobUrl = new URL(document.blobUrl);
        const blobName = decodeURIComponent(
            blobUrl.pathname.replace(`/${containerName}/`, "")
        );

        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        const downloadResponse = await blockBlobClient.download();

        res.setHeader("Content-Type", downloadResponse.contentType || "application/octet-stream");
        res.setHeader("Content-Disposition", `attachment; filename="${document.fileName}"`);

        return downloadResponse.readableStreamBody.pipe(res);
    } catch (error) {
        console.error("Azure document download error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to download document"
        });
    }
}

async function deleteAzureDocument(req, res) {
    try {
        const pool = await connectAzureSQL();

        const result = await pool.request()
            .input("id", sql.Int, Number(req.params.id))
            .query(`
                UPDATE Documents
                SET isActive = 0
                OUTPUT INSERTED.*
                WHERE id = @id
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Document not found"
            });
        }

        return res.json({
            success: true,
            message: "Document deleted successfully"
        });
    } catch (error) {
        console.error("Azure document delete error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to delete document"
        });
    }
}

module.exports = {
    uploadAzureDocument,
    getAzureDocuments,
    getAzureDocumentById,
    downloadAzureDocument,
    deleteAzureDocument
};
