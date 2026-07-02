const sql = require("mssql");

const dbConfig = {
    user: process.env.AZURE_SQL_USER,
    password: process.env.AZURE_SQL_PASSWORD,
    server: process.env.AZURE_SQL_SERVER,
    database: process.env.AZURE_SQL_DATABASE,
    port: 1433,
    options: {
        encrypt: true,
        trustServerCertificate: false
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    },
    connectionTimeout: 30000,
    requestTimeout: 30000
};

let pool;

async function connectAzureSQL() {
    try {
        if (!pool) {
            pool = await sql.connect(dbConfig);
            console.log("Azure SQL connected successfully");
        }
        return pool;
    } catch (error) {
        console.error("Azure SQL connection failed:", error.message);
        throw error;
    }
}

module.exports = {
    sql,
    connectAzureSQL
};