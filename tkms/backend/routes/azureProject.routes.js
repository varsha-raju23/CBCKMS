const express = require("express");
const router = express.Router();

const {
    createProject,
    getProjects,
    getProjectById,
    updateProjectProgress
} = require("../controllers/azureProject.controller");

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
    allowAzureRoles("SUPER_ADMIN", "ADMIN", "PROJECT_MANAGER"),
    azureAuditLogger("PROJECT_CREATED"),
    createProject
);

router.get(
    "/",
    protectAzure,
    allowAzureRoles("SUPER_ADMIN", "ADMIN", "PROJECT_MANAGER", "TUNNEL_ENGINEER", "VIEWER"),
    azureAuditLogger("PROJECTS_VIEWED"),
    getProjects
);

router.get(
    "/:id",
    protectAzure,
    allowAzureRoles("SUPER_ADMIN", "ADMIN", "PROJECT_MANAGER", "TUNNEL_ENGINEER", "VIEWER"),
    azureAuditLogger("PROJECT_DETAILS_VIEWED"),
    getProjectById
);

router.patch(
    "/:id/progress",
    protectAzure,
    allowAzureRoles("SUPER_ADMIN", "ADMIN", "PROJECT_MANAGER"),
    azureAuditLogger("PROJECT_PROGRESS_UPDATED"),
    updateProjectProgress
);

module.exports = router;