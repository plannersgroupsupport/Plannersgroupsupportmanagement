import nodemailer from 'nodemailer';

export async function sendCredentialsEmail(to: string, name: string, loginId: string, password: string, companyName: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"${companyName}" <\${process.env.EMAIL_USER}>`,
    to: to,
    subject: `Welcome to \${companyName} - Your Login Credentials`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; borderRadius: 8px;">
        <h2 style="color: #4c6ef5;">Welcome to \${companyName}!</h2>
        <p>Dear \${name},</p>
        <p>Your registration has been approved. You can now log in to our management system using the credentials below:</p>
        <div style="background: #f8f9fa; padding: 15px; borderRadius: 4px; border: 1px dashed #4c6ef5; margin: 20px 0;">
          <p style="margin: 0;"><strong>Username:</strong> \${loginId}</p>
          <p style="margin: 5px 0 0;"><strong>Temporary Password:</strong> \${password}</p>
        </div>
        <p>Please log in and change your password immediately for security.</p>
        <p>Portal Link: <a href="\${process.env.NEXTAUTH_URL}">\${process.env.NEXTAUTH_URL}</a></p>
        <hr style="border: 0; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">This is an automated message. Please do not reply.</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}
