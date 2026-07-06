
const jwt = require("jsonwebtoken");

async function azureLogin(req, res) {
    const { email, password } = req.body;

    if (
        email &&
        email.toLowerCase().trim() === "admin@tunnelkms.com" &&
        password === "Admin@123456"
    ) {
        const token = jwt.sign(
            { id: 1, email: "admin@tunnelkms.com", role: "SUPER_ADMIN" },
            process.env.JWT_SECRET || "demo_secret",
            { expiresIn: "8h" }
        );

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: 1,
                fullName: "Super Admin",
                email: "admin@tunnelkms.com",
                organization: "TunnelKMS",
                role: "SUPER_ADMIN",
                status: "APPROVED"
            }
        });
    }

    return res.status(401).json({
        success: false,
        message: "Invalid email or password"
    });
}

module.exports = { azureLogin };
