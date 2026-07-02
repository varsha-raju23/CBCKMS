const express = require("express");
const router = express.Router();

const {
    getPendingUsers,
    getAllUsers,
    approveUserById,
    rejectUserById,
    unlockUser,
    updateUserRole,
    getAuditLogs
} = require("../controllers/azureAdmin.controller");

const {
    azureAuditLogger
} = require("../middleware/azureAudit.middleware");

const {
    protectAzure,
    allowAzureRoles
} = require("../middleware/azureAuth.middleware");

router.get(
    "/pending-users",
    protectAzure,
    allowAzureRoles("SUPER_ADMIN"),
    azureAuditLogger("PENDING_USERS_VIEWED"),
    getPendingUsers
);

router.get(
    "/users",
    protectAzure,
    allowAzureRoles("SUPER_ADMIN", "ADMIN"),
    azureAuditLogger("ALL_USERS_VIEWED"),
    getAllUsers
);

router.patch(
    "/users/:id/approve",
    protectAzure,
    allowAzureRoles("SUPER_ADMIN"),
    azureAuditLogger("USER_APPROVED_BY_ADMIN"),
    approveUserById
);

router.patch(
    "/users/:id/reject",
    protectAzure,
    allowAzureRoles("SUPER_ADMIN"),
    azureAuditLogger("USER_REJECTED_BY_ADMIN"),
    rejectUserById
);

router.patch(
    "/users/:id/unlock",
    protectAzure,
    allowAzureRoles("SUPER_ADMIN"),
    azureAuditLogger("USER_UNLOCKED_BY_ADMIN"),
    unlockUser
);

router.patch(
    "/users/:id/role",
    protectAzure,
    allowAzureRoles("SUPER_ADMIN"),
    azureAuditLogger("USER_ROLE_UPDATED"),
    updateUserRole
);

router.get(
    "/audit-logs",
    protectAzure,
    allowAzureRoles("SUPER_ADMIN"),
    azureAuditLogger("AUDIT_LOGS_VIEWED"),
    getAuditLogs
);

module.exports = router;