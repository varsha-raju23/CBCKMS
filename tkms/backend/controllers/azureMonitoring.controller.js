const { connectAzureSQL, sql } = require("../config/azureSql");

const allowedMonitoringTypes = [
    "NATM",
    "TBM",
    "GEOLOGICAL_MAPPING",
    "TUNNEL_LINING",
    "EXCAVATION",
    "GROUND_SETTLEMENT",
    "INSTRUMENTATION",
    "VENTILATION",
    "DEWATERING",
    "RISK"
];

async function createMonitoringRecord(req, res) {
    try {
        const {
            projectId,
            monitoringType,
            chainage,
            readingValue,
            unit,
            riskLevel,
            remarks
        } = req.body;

        if (!projectId || !monitoringType) {
            return res.status(400).json({
                success: false,
                message: "Project ID and monitoring type are required"
            });
        }

        const finalType = String(monitoringType).toUpperCase();

        if (!allowedMonitoringTypes.includes(finalType)) {
            return res.status(400).json({
                success: false,
                message: "Invalid monitoring type"
            });
        }

        const pool = await connectAzureSQL();

        const result = await pool.request()
            .input("projectId", sql.Int, Number(projectId))
            .input("monitoringType", sql.NVarChar, finalType)
            .input("chainage", sql.NVarChar, chainage || null)
            .input("readingValue", sql.Decimal(18, 4), readingValue || null)
            .input("unit", sql.NVarChar, unit || null)
            .input("riskLevel", sql.NVarChar, riskLevel || null)
            .input("remarks", sql.NVarChar, remarks || null)
            .input("recordedBy", sql.Int, req.user?.id || null)
            .query(`
        INSERT INTO TunnelMonitoring (
          projectId,
          monitoringType,
          chainage,
          readingValue,
          unit,
          riskLevel,
          remarks,
          recordedBy
        )
        OUTPUT INSERTED.*
        VALUES (
          @projectId,
          @monitoringType,
          @chainage,
          @readingValue,
          @unit,
          @riskLevel,
          @remarks,
          @recordedBy
        )
      `);

        return res.status(201).json({
            success: true,
            message: "Tunnel monitoring record created successfully",
            monitoring: result.recordset[0]
        });
    } catch (error) {
        console.error("Create monitoring error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to create monitoring record"
        });
    }
}

async function getMonitoringRecords(req, res) {
    try {
        const { projectId, monitoringType } = req.query;

        const pool = await connectAzureSQL();
        const request = pool.request();

        let query = `
      SELECT *
      FROM TunnelMonitoring
      WHERE 1 = 1
    `;

        if (projectId) {
            request.input("projectId", sql.Int, Number(projectId));
            query += ` AND projectId = @projectId`;
        }

        if (monitoringType) {
            request.input("monitoringType", sql.NVarChar, String(monitoringType).toUpperCase());
            query += ` AND monitoringType = @monitoringType`;
        }

        query += ` ORDER BY recordedAt DESC`;

        const result = await request.query(query);

        return res.status(200).json({
            success: true,
            monitoringRecords: result.recordset
        });
    } catch (error) {
        console.error("Get monitoring records error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch monitoring records"
        });
    }
}

module.exports = {
    createMonitoringRecord,
    getMonitoringRecords
};
