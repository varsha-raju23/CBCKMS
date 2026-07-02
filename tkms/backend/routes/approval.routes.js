const express = require("express");
const router = express.Router();

const {
    approveUser,
    rejectUser
} = require("../controllers/approval.controller");

const {
    azureAuditLogger
} = require("../middleware/azureAudit.middleware");
console.log("azureAuditLogger:", typeof azureAuditLogger);
console.log("approveUser:", typeof approveUser);
console.log("rejectUser:", typeof rejectUser);

router.get(
    "/approve/:token",
    azureAuditLogger("USER_ACCOUNT_APPROVED"),
    approveUser
);

router.get(
    "/reject/:token",
    azureAuditLogger("USER_ACCOUNT_REJECTED"),
    rejectUser
);

module.exports = router;