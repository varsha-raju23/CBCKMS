const express = require("express");
const router = express.Router();

const {
    createDailyProgressReport,
    getDailyProgressReports
} = require("../controllers/azureProgress.controller");

const {
    azureAuditLogger
} = require("../middleware/azureAudit.middleware");

const {
    protectAzure,
    allowAzureRoles
} = require("../middleware/azureAuth.middleware");

router.post(
    "/",
    protectAzure,
    allowAzureRoles("SUPER_ADMIN", "ADMIN", "PROJECT_MANAGER", "TUNNEL_ENGINEER"),
    azureAuditLogger("DAILY_PROGRESS_REPORT_CREATED"),
    createDailyProgressReport
);

router.get(
    "/",
    protectAzure,
    allowAzureRoles("SUPER_ADMIN", "ADMIN", "PROJECT_MANAGER", "TUNNEL_ENGINEER", "VIEWER"),
    azureAuditLogger("DAILY_PROGRESS_REPORTS_VIEWED"),
    getDailyProgressReports
);

module.exports = router;