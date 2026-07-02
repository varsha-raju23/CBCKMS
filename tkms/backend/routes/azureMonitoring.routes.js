const express = require("express");
const router = express.Router();

const {
    createMonitoringRecord,
    getMonitoringRecords
} = require("../controllers/azureMonitoring.controller");

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
    azureAuditLogger("TUNNEL_MONITORING_RECORD_CREATED"),
    createMonitoringRecord
);

router.get(
    "/",
    protectAzure,
    allowAzureRoles("SUPER_ADMIN", "ADMIN", "PROJECT_MANAGER", "TUNNEL_ENGINEER", "VIEWER"),
    azureAuditLogger("TUNNEL_MONITORING_RECORDS_VIEWED"),
    getMonitoringRecords
);

module.exports = router;