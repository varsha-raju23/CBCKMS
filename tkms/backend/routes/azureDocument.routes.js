const express = require("express");
const multer = require("multer");
const router = express.Router();

const {
    uploadAzureDocument,
    getAzureDocuments,
    downloadAzureDocument
} = require("../controllers/azureDocument.controller");

const {
    azureAuditLogger
} = require("../middleware/azureAudit.middleware");

const {
    protectAzure,
    allowAzureRoles
} = require("../middleware/azureAuth.middleware");

const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: {
        fileSize: Number(process.env.MAX_FILE_SIZE) || 52428800
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            "application/pdf",
            "image/png",
            "image/jpeg",
            "image/jpg",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ];

        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error("Only PDF, images, Word and Excel files are allowed"));
        }

        cb(null, true);
    }
});

router.get(
    "/",
    protectAzure,
    allowAzureRoles("SUPER_ADMIN", "ADMIN", "PROJECT_MANAGER", "TUNNEL_ENGINEER"),
    getAzureDocuments
);

router.get(
    "/recent",
    protectAzure,
    allowAzureRoles("SUPER_ADMIN", "ADMIN", "PROJECT_MANAGER", "TUNNEL_ENGINEER"),
    getAzureDocuments
);

router.get(
    "/stats",
    protectAzure,
    allowAzureRoles("SUPER_ADMIN", "ADMIN", "PROJECT_MANAGER", "TUNNEL_ENGINEER"),
    async (req, res) => {
        res.json({
            success: true,
            stats: {
                total: 0,
                byType: [],
                byDept: [],
                mostViewed: [],
                recentUploads: []
            }
        });
    }
);

router.get(
    "/:id/download",
    protectAzure,
    allowAzureRoles("SUPER_ADMIN", "ADMIN", "PROJECT_MANAGER", "TUNNEL_ENGINEER"),
    azureAuditLogger("AZURE_DOCUMENT_DOWNLOADED"),
    downloadAzureDocument
);

router.post(
    "/upload",
    protectAzure,
    allowAzureRoles("SUPER_ADMIN", "ADMIN", "PROJECT_MANAGER", "TUNNEL_ENGINEER"),
    azureAuditLogger("AZURE_DOCUMENT_UPLOADED"),
    upload.single("file"),
    uploadAzureDocument
);

module.exports = router;