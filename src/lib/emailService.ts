import { supabase } from './supabase';

interface EmailOptions {
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
}

/**
 * Sends an email using the Supabase Edge Function
 * @param options Email options
 * @returns Promise<boolean> Success status
 */
export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    // Get SMTP settings from database
    const { data: settingsData, error: settingsError } = await supabase
      .from('settings')
      .select('*')
      .in('category', ['email'])
    
    if (settingsError) throw settingsError;
    
    // Extract SMTP settings
    const smtpSettings: Record<string, any> = {};
    settingsData?.forEach(setting => {
      if (setting.category === 'email') {
        try {
          smtpSettings[setting.key] = JSON.parse(setting.value);
        } catch {
          smtpSettings[setting.key] = setting.value;
        }
      }
    });
    
    // Call the Supabase Edge Function to send the email
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: options.to,
        subject: options.subject,
        body: options.body,
        from: options.from || smtpSettings.from_email || 'admin@szemesipekseg.com',
        replyTo: options.replyTo,
        attachments: options.attachments,
        smtpSettings: {
          host: smtpSettings.smtp_host || 'mail.szemesipekseg.com',
          port: smtpSettings.smtp_port || 465,
          user: smtpSettings.smtp_username || 'admin@szemesipekseg.com',
          pass: smtpSettings.smtp_password || '',
          fromName: smtpSettings.from_name || 'Szemesi Pékség'
        }
      }
    });
    
    if (error) {
      console.error('Error sending email via Edge Function:', error);
      throw error;
    }
    
    // Record the sent email in the database
    const { error: recordError } = await supabase
      .from('sent_emails')
      .insert({
        recipient_email: options.to,
        recipient_name: options.to.split('@')[0],
        subject: options.subject,
        body: options.body,
        status: 'sent'
      });
    
    if (recordError) {
      console.error('Error recording sent email:', recordError);
    }
    
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
};

export const sendOrderConfirmationEmail = async (
  email: string, 
  orderNumber: string, 
  orderDetails: any
): Promise<boolean> => {
  try {
    // Format order details
    let itemsHtml = '';
    orderDetails.items.forEach((item: any) => {
      itemsHtml += `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.product_name || item.name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.quantity} db</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${(item.price || item.unit_price).toLocaleString('hu-HU')} Ft</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${((item.price || item.unit_price) * item.quantity).toLocaleString('hu-HU')} Ft</td>
        </tr>
      `;
    });
    
    return await sendEmail({
      to: email,
      subject: `Rendelés visszaigazolás - ${orderNumber}`,
      body: `
        <h1>Rendelés visszaigazolás</h1>
        <p>Tisztelt ${orderDetails.customer_name}!</p>
        <p>Köszönjük rendelését! Az alábbiakban találja a rendelés részleteit:</p>
        
        <p><strong>Rendelésszám:</strong> ${orderNumber}</p>
        <p><strong>Rendelés dátuma:</strong> ${new Date(orderDetails.order_date || orderDetails.created_at).toLocaleDateString('hu-HU')}</p>
        
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f2f2f2;">
              <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Termék</th>
              <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Mennyiség</th>
              <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Egységár</th>
              <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Összesen</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding: 8px; text-align: right;"><strong>Végösszeg:</strong></td>
              <td style="padding: 8px;"><strong>${orderDetails.total_amount.toLocaleString('hu-HU')} Ft</strong></td>
            </tr>
          </tfoot>
        </table>
        
        <p>Üdvözlettel,<br>Szemesi Pékség</p>
      `
    });
  } catch (error) {
    console.error('Error sending order confirmation email:', error);
    return false;
  }
};

export const sendPasswordResetEmail = async (email: string): Promise<boolean> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `https://admin.szemesipekseg.com/reset-password`,
    });
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
};

export const sendContractSigningEmail = async (email: string, contractName: string): Promise<boolean> => {
  try {
    const contractUrl = `https://admin.szemesipekseg.com/sign-contract`;
    
    return await sendEmail({
      to: email,
      subject: 'Munkaszerződés aláírása',
      body: `
        <h1>Munkaszerződés aláírása</h1>
        <p>Tisztelt Munkatársunk!</p>
        <p>Kérjük, írja alá a munkaszerződését az alábbi linken:</p>
        <p><a href="${contractUrl}">Szerződés aláírása</a></p>
        <p>Üdvözlettel,<br>Szemesi Pékség</p>
      `
    });
  } catch (error) {
    console.error('Error sending contract signing email:', error);
    return false;
  }
};

export const sendLowStockAlert = async (
  items: Array<{name: string, current_stock: number, unit: string, min_threshold: number}>
): Promise<boolean> => {
  try {
    // Get admin email addresses
    const { data: admins, error: adminsError } = await supabase
      .from('profiles')
      .select('email')
      .eq('role', 'admin');
    
    if (adminsError) throw adminsError;
    
    if (!admins || admins.length === 0) {
      console.error('No admin users found');
      return false;
    }
    
    // Format low stock items
    let itemsHtml = '';
    items.forEach(item => {
      itemsHtml += `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.current_stock} ${item.unit}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.min_threshold} ${item.unit}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; color: red;">${item.min_threshold - item.current_stock} ${item.unit}</td>
        </tr>
      `;
    });
    
    // Send email to all admins
    const emailPromises = admins.map(admin => 
      sendEmail({
        to: admin.email,
        subject: 'Alacsony készlet figyelmeztetés',
        body: `
          <h1>Alacsony készlet figyelmeztetés</h1>
          <p>Az alábbi termékek készlete a minimum szint alá csökkent:</p>
          
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f2f2f2;">
                <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Termék</th>
                <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Jelenlegi készlet</th>
                <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Minimum szint</th>
                <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Hiány</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <p>Kérjük, intézkedjen a készlet feltöltéséről!</p>
          
          <p>Üdvözlettel,<br>Szemesi Pékség - Készletkezelő Rendszer</p>
        `
      })
    );
    
    await Promise.all(emailPromises);
    return true;
  } catch (error) {
    console.error('Error sending low stock alert:', error);
    return false;
  }
};

/**
 * Sends a manual email to a partner
 * @param partnerEmail Partner email address
 * @param partnerName Partner name
 * @param subject Email subject
 * @param body Email body
 * @returns Promise<boolean> Success status
 */
export const sendPartnerEmail = async (
  partnerEmail: string,
  partnerName: string,
  subject: string,
  body: string
): Promise<boolean> => {
  try {
    return await sendEmail({
      to: partnerEmail,
      subject: subject,
      body: body
    });
  } catch (error) {
    console.error('Error sending partner email:', error);
    return false;
  }
};

/**
 * Sends an automatic order email to a supplier
 * @param supplierEmail Supplier email address
 * @param supplierName Supplier name
 * @param productName Product name
 * @param quantity Order quantity
 * @param unit Unit of measurement
 * @returns Promise<boolean> Success status
 */
export const sendAutomaticOrderEmail = async (
  supplierEmail: string,
  supplierName: string,
  productName: string,
  quantity: number,
  unit: string
): Promise<boolean> => {
  try {
    const subject = `Automatikus rendelés: ${productName}`;
    const body = `
      <h1>Automatikus rendelés</h1>
      <p>Tisztelt ${supplierName}!</p>
      <p>Ezúton szeretnénk automatikus rendelést leadni a következő termékre:</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr style="background-color: #f2f2f2;">
          <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Termék</th>
          <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Mennyiség</th>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;">${productName}</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${quantity} ${unit}</td>
        </tr>
      </table>
      
      <p>Kérjük a lehető leghamarabb szállítsák ki a fenti terméket.</p>
      
      <p>Üdvözlettel,<br>Szemesi Pékség - Automatikus Rendelési Rendszer</p>
    `;
    
    return await sendEmail({
      to: supplierEmail,
      subject: subject,
      body: body
    });
  } catch (error) {
    console.error('Error sending automatic order email:', error);
    return false;
  }
};