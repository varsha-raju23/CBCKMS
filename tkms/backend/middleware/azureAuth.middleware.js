const jwt = require("jsonwebtoken");
const { connectAzureSQL, sql } = require("../config/azureSql");

async function protectAzure(req, res, next) {
    try {
        let token;

        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith("Bearer ")
        ) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Not authorized. No token provided."
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const pool = await connectAzureSQL();

        const result = await pool.request()
            .input("userId", sql.Int, decoded.id || decoded.userId)
            .query(`
                SELECT 
                    id,
                    fullName,
                    email,
                    organization,
                    role,
                    status
                FROM Users
                WHERE id = @userId
            `);

        if (result.recordset.length === 0) {
            return res.status(401).json({
                success: false,
                message: "User not found."
            });
        }

        const user = result.recordset[0];

        if (user.status !== "APPROVED") {
            return res.status(403).json({
                success: false,
                message: "Your account is not approved yet."
            });
        }

        req.user = user;
        next();

    } catch (error) {
        console.error("Azure auth middleware error:", error.message);

        return res.status(401).json({
            success: false,
            message: "Invalid or expired token."
        });
    }
}

function allowAzureRoles(...roles) {
    return function (req, res, next) {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to access this route."
            });
        }

        next();
    };
}

module.exports = {
    protectAzure,
    allowAzureRoles
};