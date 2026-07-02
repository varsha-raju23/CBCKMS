const express = require("express");
const router = express.Router();

const {
    getAnalyticsDashboard
} = require("../controllers/azureAnalytics.controller");

const {
    azureAuditLogger
} = require("../middleware/azureAudit.middleware");

const {
    protectAzure,
    allowAzureRoles
} = require("../middleware/azureAuth.middleware");

router.get(
    "/dashboard",
    protectAzure,
    allowAzureRoles("SUPER_ADMIN", "ADMIN", "PROJECT_MANAGER"),
    azureAuditLogger("ANALYTICS_DASHBOARD_VIEWED"),
    getAnalyticsDashboard
);

module.exports = router;