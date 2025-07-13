// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "npm:@supabase/functions-js";
import { createTransport } from "npm:nodemailer";

interface EmailRequest {
  to: string;
  subject: string;
  body: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    name: string;
    content: string;
    contentType: string;
  }>;
  smtpSettings: {
    host: string;
    port: number | string;
    user: string;
    pass: string;
    fromName?: string;
  };
}

serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      status: 204,
    });
  }

  try {
    const { to, subject, body, from, replyTo, attachments, smtpSettings } = await req.json() as EmailRequest;

    // Validate required fields
    if (!to || !subject || !body || !smtpSettings) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    // Configure SMTP transporter
    const transporter = createTransport({
      host: smtpSettings.host,
      port: Number(smtpSettings.port),
      secure: Number(smtpSettings.port) === 465, // true for 465, false for other ports
      auth: {
        user: smtpSettings.user,
        pass: smtpSettings.pass,
      },
    });

    // Prepare email options
    const mailOptions = {
      from: `"${smtpSettings.fromName || 'Szemesi Pékség'}" <${from || smtpSettings.user}>`,
      to,
      subject,
      html: body,
      replyTo: replyTo || from || smtpSettings.user,
      attachments: attachments ? attachments.map(attachment => ({
        filename: attachment.name,
        content: Buffer.from(attachment.content, 'base64'),
        contentType: attachment.contentType,
      })) : undefined,
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    return new Response(
      JSON.stringify({ success: true, messageId: info.messageId }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  } catch (error) {
    console.error('Email sending error:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }
});