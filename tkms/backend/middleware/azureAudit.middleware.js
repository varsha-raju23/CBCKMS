const azureAuditLogger = (action) => {
    return async (req, res, next) => {
        try {
            console.log("Azure Audit Log:", {
                action: action,
                method: req.method,
                url: req.originalUrl,
                ip: req.ip,
                time: new Date().toISOString()
            });
        } catch (error) {
            console.error("Azure audit logger error:", error.message);
        }

        next();
    };
};

module.exports = {
    azureAuditLogger
};