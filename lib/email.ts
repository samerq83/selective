import type { Transporter } from 'nodemailer';

let transporter: Transporter | null = null;

let isFallbackTransport = false;

async function getTransporter() {
  if (!transporter) {
    const nodemailer = await import('nodemailer');
    const emailUser = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_PASSWORD;

    if (!emailUser || !emailPassword) {
      isFallbackTransport = true;
      transporter = nodemailer.default.createTransport({
        jsonTransport: true,
      });
      console.warn(
        '[Email] EMAIL_USER or EMAIL_PASSWORD is missing. Using JSON transport fallback (emails are logged but not sent).'
      );
    } else {
      isFallbackTransport = false;
      transporter = nodemailer.default.createTransport({
        service: 'gmail',
        auth: {
          user: emailUser,
          pass: emailPassword,
        },
      });
    }
  }
  return transporter;
}

export async function sendVerificationEmail(
  to: string,
  code: string,
  name: string
): Promise<void> {
  const transport = await getTransporter();
  
  const mailOptions = {
    from: `"Selective Trading" <${process.env.EMAIL_USER ?? 'no-reply@selectivetrading.com'}>`,
    to,
    subject: 'Your Verification Code - Selective Trading',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 10px;
            padding: 40px;
            text-align: center;
          }
          .logo {
            background: white;
            width: 80px;
            height: 80px;
            border-radius: 50%;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            font-weight: bold;
            color: #dc2626;
          }
          .title {
            color: white;
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .subtitle {
            color: rgba(255, 255, 255, 0.9);
            font-size: 16px;
            margin-bottom: 30px;
          }
          .code-container {
            background: white;
            border-radius: 10px;
            padding: 30px;
            margin: 20px 0;
          }
          .code {
            font-size: 48px;
            font-weight: bold;
            color: #dc2626;
            letter-spacing: 10px;
            margin: 20px 0;
          }
          .message {
            color: #666;
            font-size: 14px;
            margin-top: 20px;
          }
          .footer {
            color: rgba(255, 255, 255, 0.8);
            font-size: 12px;
            margin-top: 30px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">ST</div>
          <div class="title">Selective Trading</div>
          <div class="subtitle">Premium Milk Products</div>
          
          <div class="code-container">
            <h2 style="color: #333; margin-top: 0;">Hello ${name}!</h2>
            <p style="color: #666;">Your verification code is:</p>
            <div class="code">${code}</div>
            <p class="message">
              This code will expire in <strong>30 minutes</strong>.<br>
              If you didn't request this code, please ignore this email.
            </p>
          </div>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} Selective Trading. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Hello ${name}!

Your verification code for Selective Trading is: ${code}

This code will expire in 30 minutes.
If you didn't request this code, please ignore this email.

© ${new Date().getFullYear()} Selective Trading. All rights reserved.
    `,
  };

  const info = await transport.sendMail(mailOptions);

  if (isFallbackTransport) {
    const output = typeof info === 'object' ? JSON.stringify(info, null, 2) : String(info);
    console.info('[Email] Fallback transport output:', output);
  }
}