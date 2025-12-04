import twilio from 'twilio';
import { Resend } from 'resend';

const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

interface SendSMSParams {
  to: string;
  message: string;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

interface InspectionReportParams {
  customerName: string;
  vehicleInfo: string;
  shareUrl: string;
  shopName: string;
}

export function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  return `+${digits}`;
}

export async function sendSMS({ to, message }: SendSMSParams): Promise<{ success: boolean; error?: string; messageId?: string }> {
  if (!twilioClient) {
    return { success: false, error: 'Twilio is not configured. Please add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.' };
  }
  
  if (!process.env.TWILIO_PHONE_NUMBER) {
    return { success: false, error: 'Twilio phone number not configured. Please add TWILIO_PHONE_NUMBER.' };
  }
  
  try {
    const formattedTo = formatPhoneNumber(to);
    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedTo,
    });
    return { success: true, messageId: result.sid };
  } catch (error: any) {
    console.error('Twilio SMS error:', error);
    return { success: false, error: error.message || 'Failed to send SMS' };
  }
}

export async function sendEmail({ to, subject, html, from }: SendEmailParams): Promise<{ success: boolean; error?: string; messageId?: string }> {
  if (!resend) {
    return { success: false, error: 'Resend is not configured. Please add RESEND_API_KEY.' };
  }
  
  const fromAddress = from || process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  
  try {
    const result = await resend.emails.send({
      from: fromAddress,
      to: [to],
      subject,
      html,
    });
    
    if (result.error) {
      return { success: false, error: result.error.message };
    }
    
    return { success: true, messageId: result.data?.id };
  } catch (error: any) {
    console.error('Resend email error:', error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
}

export function generateInspectionSMS({ customerName, vehicleInfo, shareUrl, shopName }: InspectionReportParams): string {
  return `Hi ${customerName}! Your vehicle inspection report for your ${vehicleInfo} is ready. View it here: ${shareUrl} - ${shopName}`;
}

export function generateInspectionEmail({ customerName, vehicleInfo, shareUrl, shopName }: InspectionReportParams): { subject: string; html: string } {
  const subject = `Your Vehicle Inspection Report - ${vehicleInfo}`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vehicle Inspection Report</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 40px 30px; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);">
        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">${shopName}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 30px;">
        <h2 style="margin: 0 0 20px; color: #18181b; font-size: 20px;">Hi ${customerName},</h2>
        <p style="margin: 0 0 20px; color: #3f3f46; font-size: 16px; line-height: 1.6;">
          Your vehicle inspection report for your <strong>${vehicleInfo}</strong> is now ready for review.
        </p>
        <p style="margin: 0 0 30px; color: #3f3f46; font-size: 16px; line-height: 1.6;">
          Click the button below to view the detailed inspection results, including photos and technician recommendations.
        </p>
        <table role="presentation" cellspacing="0" cellpadding="0">
          <tr>
            <td style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); border-radius: 8px;">
              <a href="${shareUrl}" target="_blank" style="display: inline-block; padding: 16px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                View Inspection Report
              </a>
            </td>
          </tr>
        </table>
        <p style="margin: 30px 0 0; color: #71717a; font-size: 14px; line-height: 1.6;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${shareUrl}" style="color: #2563eb; word-break: break-all;">${shareUrl}</a>
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px; background-color: #f4f4f5; border-top: 1px solid #e4e4e7;">
        <p style="margin: 0; color: #71717a; font-size: 14px; text-align: center;">
          This email was sent by ${shopName}.<br>
          If you have questions, please contact us directly.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
  
  return { subject, html };
}

export function isMessagingConfigured(): { sms: boolean; email: boolean } {
  return {
    sms: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER),
    email: !!process.env.RESEND_API_KEY,
  };
}
