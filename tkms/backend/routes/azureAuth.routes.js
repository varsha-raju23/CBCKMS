const express = require("express");
const router = express.Router();

const {
    azureLogin
} = require("../controllers/azureLogin.controller");

const {
    azureAuditLogger
} = require("../middleware/azureAudit.middleware");

router.post("/login", azureAuditLogger("AZURE_USER_LOGIN"), azureLogin);

module.exports = router;