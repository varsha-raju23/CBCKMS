const { EmailClient } = require("@azure/communication-email");

const connectionString = process.env.AZURE_COMMUNICATION_CONNECTION_STRING;
const senderAddress = process.env.AZURE_EMAIL_SENDER;

let emailClient = null;

function getEmailClient() {
    if (!connectionString) {
        throw new Error("AZURE_COMMUNICATION_CONNECTION_STRING is missing");
    }

    if (!senderAddress) {
        throw new Error("AZURE_EMAIL_SENDER is missing");
    }

    if (!emailClient) {
        emailClient = new EmailClient(connectionString);
    }

    return emailClient;
}

async function sendEmail({ to, subject, html }) {
    try {
        const client = getEmailClient();

        const message = {
            senderAddress,
            content: {
                subject,
                html
            },
            recipients: {
                to: [{ address: to }]
            }
        };

        const poller = await client.beginSend(message);
        const result = await poller.pollUntilDone();

        return result;
    } catch (error) {
        console.error("Azure email sending failed:", error.message);
        throw new Error("Email notification failed");
    }
}

async function sendApprovalRequestEmail({
    fullName,
    email,
    organization,
    role,
    approvalToken
}) {
    const adminEmail = process.env.APPROVAL_ADMIN_EMAIL;

    if (!adminEmail) {
        throw new Error("APPROVAL_ADMIN_EMAIL is missing");
    }

    const approveUrl = `${process.env.FRONTEND_URL}/approval/approve/${approvalToken}`;
    const rejectUrl = `${process.env.FRONTEND_URL}/approval/reject/${approvalToken}`;

    return sendEmail({
        to: adminEmail,
        subject: "Tunnel KMS Account Approval Request",
        html: `
      <div style="font-family: Arial, sans-serif; background:#f3f4f6; padding:24px;">
        <div style="max-width:600px; margin:auto; background:white; padding:24px; border-radius:12px;">
          <h2 style="color:#071A3D;">New Tunnel KMS Account Request</h2>

          <p><b>Full Name:</b> ${fullName}</p>
          <p><b>Email:</b> ${email}</p>
          <p><b>Organization:</b> ${organization}</p>
          <p><b>Requested Role:</b> ${role}</p>

          <p style="margin-top:24px;">
            <a href="${approveUrl}" style="background:#1D4ED8; color:white; padding:12px 18px; text-decoration:none; border-radius:8px;">
              Approve
            </a>

            <a href="${rejectUrl}" style="background:#b91c1c; color:white; padding:12px 18px; text-decoration:none; border-radius:8px; margin-left:10px;">
              Reject
            </a>
          </p>
        </div>
      </div>
    `
    });
}

async function sendAccountApprovedEmail(to) {
    return sendEmail({
        to,
        subject: "Tunnel KMS Account Approved",
        html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Your Tunnel KMS account has been approved</h2>
        <p>You can now log in to the internal Tunnel Construction Knowledge Management System.</p>
      </div>
    `
    });
}

async function sendAccountRejectedEmail(to) {
    return sendEmail({
        to,
        subject: "Tunnel KMS Account Request Rejected",
        html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Your Tunnel KMS account request was rejected</h2>
        <p>Please contact the administrator for more details.</p>
      </div>
    `
    });
}

module.exports = {
    sendEmail,
    sendApprovalRequestEmail,
    sendAccountApprovedEmail,
    sendAccountRejectedEmail
};