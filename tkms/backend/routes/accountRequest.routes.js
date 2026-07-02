const express = require("express");
const router = express.Router();

const {
    requestAccount
} = require("../controllers/accountRequest.controller");

const {
    azureAuditLogger
} = require("../middleware/azureAudit.middleware");

router.post(
    "/request-account",
    azureAuditLogger("ACCOUNT_REQUEST_SUBMITTED"),
    requestAccount
);

module.exports = router;