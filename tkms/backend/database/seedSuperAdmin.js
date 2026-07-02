require("dotenv").config();
const bcrypt = require("bcryptjs");
const { connectAzureSQL, sql } = require("../config/azureSql");

async function seedSuperAdmin() {
    try {
        const pool = await connectAzureSQL();

        const fullName = process.env.AZURE_SUPER_ADMIN_FULLNAME || "System Administrator";
        const email = process.env.AZURE_SUPER_ADMIN_EMAIL || "admin@tunnelkms.com";
        const password = process.env.AZURE_SUPER_ADMIN_PASSWORD || "Admin@123456";
        const organization = process.env.AZURE_SUPER_ADMIN_ORGANIZATION || "TunnelKMS";

        const existingUser = await pool.request()
            .input("email", sql.NVarChar, email)
            .query("SELECT id FROM Users WHERE email = @email");

        if (existingUser.recordset.length > 0) {
            console.log("Super Admin already exists");
            process.exit(0);
        }

        const passwordHash = await bcrypt.hash(password, 12);

        await pool.request()
            .input("fullName", sql.NVarChar, fullName)
            .input("email", sql.NVarChar, email)
            .input("passwordHash", sql.NVarChar, passwordHash)
            .input("organization", sql.NVarChar, organization)
            .query(`
        INSERT INTO Users (
          fullName,
          email,
          passwordHash,
          organization,
          role,
          status,
          approvedAt
        )
        VALUES (
          @fullName,
          @email,
          @passwordHash,
          @organization,
          'SUPER_ADMIN',
          'APPROVED',
          SYSUTCDATETIME()
        )
      `);

        console.log("Super Admin created successfully");
        console.log("Email:", email);
        console.log("Password:", password);

        process.exit(0);
    } catch (error) {
        console.error("Super Admin seed failed:", error.message);
        process.exit(1);
    }
}

seedSuperAdmin();