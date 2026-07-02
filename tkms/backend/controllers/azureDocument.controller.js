const { connectAzureSQL, sql } = require("../config/azureSql");
const { uploadFileToAzureBlob } = require("../services/azureBlob.service");
const { BlobServiceClient } = require("@azure/storage-blob");

async function uploadAzureDocument(req, res) {
    try {
        const projectIdValue = req.body.projectId && !isNaN(Number(req.body.projectId))
            ? Number(req.body.projectId)
            : 1;

        const title =
            req.body.title ||
            req.body.projectName ||
            req.file?.originalname ||
            "Untitled Document";

        const category =
            req.body.category ||
            req.body.documentType ||
            req.body.department ||
            "General";

        if (!title || !category) {
            return res.status(400).json({
                success: false,
                message: "Title and category are required"
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Document file is required"
            });
        }

        const uploadedFile = await uploadFileToAzureBlob(
            req.file,
            `projects/${projectIdValue}/${category}`
        );

        const pool = await connectAzureSQL();

        const result = await pool.request()
            .input("projectId", sql.Int, projectIdValue)
            .input("title", sql.NVarChar, title)
            .input("category", sql.NVarChar, category)
            .input("fileName", sql.NVarChar, uploadedFile.fileName)
            .input("blobUrl", sql.NVarChar, uploadedFile.blobUrl)
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
            message: "Document uploaded successfully to Azure Blob Storage",
            document: result.recordset[0]
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
        const { projectId } = req.query;

        const pool = await connectAzureSQL();
        const request = pool.request();

        let query = `
            SELECT 
                id,
                projectId,
                title,
                category,
                fileName,
                blobUrl,
                versionNo,
                uploadedBy,
                uploadedAt,
                isActive
            FROM Documents
            WHERE isActive = 1
        `;

        if (projectId) {
            request.input("projectId", sql.Int, Number(projectId));
            query += ` AND projectId = @projectId`;
        }

        query += ` ORDER BY uploadedAt DESC`;

        const result = await request.query(query);

        return res.status(200).json({
            success: true,
            documents: result.recordset
        });
    } catch (error) {
        console.error("Azure document list error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch documents"
        });
    }
}

async function downloadAzureDocument(req, res) {
    try {
        const { id } = req.params;

        const pool = await connectAzureSQL();

        const result = await pool.request()
            .input("id", sql.Int, Number(id))
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

module.exports = {
    uploadAzureDocument,
    getAzureDocuments,
    downloadAzureDocument
};