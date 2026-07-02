const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendVerificationEmail = async (email, name, token) => {
  const verifyUrl = `${process.env.FRONTEND_URL}/pages/verify-email.html?token=${token}`;
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: '✅ Verify Your TunnelKMS Account',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#fff;border-radius:12px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:30px;text-align:center;">
          <h1 style="margin:0;font-size:28px;">🚇 TunnelKMS</h1>
          <p style="margin:5px 0;opacity:.8;">Construction Knowledge Management System</p>
        </div>
        <div style="padding:40px;">
          <h2>Hello, ${name || 'User'}!</h2>
          <p style="color:#94a3b8;line-height:1.6;">Thank you for registering with TunnelKMS. Please verify your email address to activate your account.</p>
          <div style="text-align:center;margin:30px 0;">
            <a href="${verifyUrl}" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#0f172a;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block;">
              ✅ Verify Email Address
            </a>
          </div>
          <p style="color:#64748b;font-size:13px;">This link expires in 24 hours. If you didn't register, ignore this email.</p>
          <p style="color:#64748b;font-size:12px;">Or copy this link: <a href="${verifyUrl}" style="color:#f59e0b;">${verifyUrl}</a></p>
        </div>
        <div style="background:#1e293b;padding:20px;text-align:center;color:#64748b;font-size:12px;">
          © ${new Date().getFullYear()} TunnelKMS | Cloud-Based Construction Knowledge Management
        </div>
      </div>
    `
  });
};

const sendPasswordResetEmail = async (email, name, token) => {
  const resetUrl = `${process.env.FRONTEND_URL}/pages/reset-password.html?token=${token}`;
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: '🔑 Reset Your TunnelKMS Password',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#fff;border-radius:12px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:30px;text-align:center;">
          <h1 style="margin:0;font-size:28px;">🚇 TunnelKMS</h1>
        </div>
        <div style="padding:40px;">
          <h2>Password Reset Request</h2>
          <p style="color:#94a3b8;">Hi ${name || 'User'}, click below to reset your password. This link expires in 1 hour.</p>
          <div style="text-align:center;margin:30px 0;">
            <a href="${resetUrl}" style="background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
              🔑 Reset Password
            </a>
          </div>
          <p style="color:#64748b;font-size:13px;">If you didn't request this, ignore this email. Your password won't change.</p>
        </div>
      </div>
    `
  });
};

const sendWelcomeEmail = async (email, name) => {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: '🎉 Welcome to TunnelKMS!',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#fff;border-radius:12px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:30px;text-align:center;">
          <h1 style="margin:0;font-size:28px;">🚇 TunnelKMS</h1>
        </div>
        <div style="padding:40px;">
          <h2>Welcome, ${name}! 🎉</h2>
          <p style="color:#94a3b8;line-height:1.6;">Your account is now active. You can now upload tunnel construction documents, use our AI assistant, and collaborate with your team.</p>
          <p style="color:#94a3b8;">Login at: <a href="${process.env.FRONTEND_URL}" style="color:#f59e0b;">${process.env.FRONTEND_URL}</a></p>
        </div>
      </div>
    `
  });
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail };
