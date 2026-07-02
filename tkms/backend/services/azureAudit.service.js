const { connectAzureSQL, sql } = require("../config/azureSql");

async function createAuditLog({
    userId = null,
    action,
    ipAddress,
    userAgent,
    details
}) {
    try {
        const pool = await connectAzureSQL();

        await pool.request()
            .input("userId", sql.Int, userId)
            .input("action", sql.NVarChar, action)
            .input("ipAddress", sql.NVarChar, ipAddress || null)
            .input("userAgent", sql.NVarChar, userAgent || null)
            .input("details", sql.NVarChar, details || null)
            .query(`
        INSERT INTO AuditLogs (
          userId,
          action,
          ipAddress,
          userAgent,
          details
        )
        VALUES (
          @userId,
          @action,
          @ipAddress,
          @userAgent,
          @details
        )
      `);
    } catch (error) {
        console.error("Audit log error:", error.message);
    }
}

module.exports = {
    createAuditLog
};