const { BlobServiceClient } = require("@azure/storage-blob");

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_STORAGE_CONTAINER || "tunnel-documents";

let blobServiceClient = null;

function getBlobServiceClient() {
    if (!connectionString) {
        throw new Error("AZURE_STORAGE_CONNECTION_STRING is missing");
    }

    if (!blobServiceClient) {
        blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    }

    return blobServiceClient;
}

async function uploadFileToAzureBlob(file, folder = "documents") {
    try {
        if (!file) {
            throw new Error("No file provided");
        }

        const client = getBlobServiceClient();
        const containerClient = client.getContainerClient(containerName);

        await containerClient.createIfNotExists();

        const safeFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
        const blobName = `${folder}/${Date.now()}-${safeFileName}`;

        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        await blockBlobClient.uploadData(file.buffer, {
            blobHTTPHeaders: {
                blobContentType: file.mimetype
            }
        });

        return {
            fileName: file.originalname,
            blobName,
            blobUrl: blockBlobClient.url,
            mimeType: file.mimetype,
            size: file.size
        };
    } catch (error) {
        console.error("Azure Blob upload failed:", error.message);
        throw new Error("File upload failed");
    }
}

module.exports = {
    uploadFileToAzureBlob
};