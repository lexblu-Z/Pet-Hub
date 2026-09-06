import { Resend } from 'resend';

const cleanEnv = (val?: string) => (val ? val.replace(/^["'\[]+|["'\]]+$/g, '').trim() : '');
const RESEND_API_KEY = cleanEnv(process.env.RESEND_API_KEY);
const FROM_EMAIL = cleanEnv(process.env.RESEND_FROM_EMAIL) || 'PetHub <onboarding@resend.dev>';

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export const emailService = {
  /**
   * Envia o código OTP de verificação para o e-mail informado.
   * Nunca registra ou expõe o código nem a API Key.
   */
  async sendOtpEmail(toEmail: string, code: string): Promise<{ success: boolean; id?: string; error?: string }> {
    if (!resend || !RESEND_API_KEY) {
      return {
        success: false,
        error: 'Serviço de e-mail não configurado no servidor (RESEND_API_KEY ausente).',
      };
    }

    try {
      const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Seu código de acesso PetHub</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="520" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); border: 1px solid #f1f5f9;">
          
          <!-- Header Branding -->
          <tr>
            <td style="padding: 36px 40px 24px 40px; text-align: center; background: linear-gradient(135deg, #ea580c 0%, #f97316 100%);">
              <table border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="font-size: 28px; line-height: 1;">🐾</td>
                  <td style="font-size: 24px; font-weight: 800; color: #ffffff; padding-left: 8px; letter-spacing: -0.5px;">
                    Pet<span style="color: #fed7aa;">Hub</span>
                  </td>
                </tr>
              </table>
              <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 13px; font-weight: 500;">
                Amor e tecnologia para cuidar do seu pet
              </p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 40px 24px 40px;">
              <h1 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #0f172a; text-align: center;">
                Seu código de acesso
              </h1>
              <p style="margin: 0 0 28px 0; font-size: 14px; line-height: 1.6; color: #64748b; text-align: center;">
                Use o código de verificação de 6 dígitos abaixo para entrar na sua conta com segurança no PetHub:
              </p>

              <!-- OTP Code Box -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; background-color: #fff7ed; border: 2px dashed #fb923c; border-radius: 16px; padding: 18px 32px; margin: 0 auto;">
                      <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #ea580c; display: block;">
                        ${code}
                      </span>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Expiration Notice -->
              <div style="margin-top: 24px; background-color: #f8fafc; border-radius: 12px; padding: 12px 16px; text-align: center; border: 1px solid #e2e8f0;">
                <p style="margin: 0; font-size: 12px; font-weight: 600; color: #475569;">
                  ⏱️ Este código é válido por <strong>10 minutos</strong>.
                </p>
              </div>

              <!-- Security Disclaimer -->
              <p style="margin: 24px 0 0 0; font-size: 12px; line-height: 1.6; color: #94a3b8; text-align: center;">
                Se você não solicitou este código de acesso, não se preocupe! Nenhuma ação é necessária e você pode ignorar este e-mail com total segurança. Ninguém poderá acessar sua conta sem o código.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #94a3b8;">
                © ${new Date().getFullYear()} PetHub — Plataforma Pet Integrada. Ourinhos - SP.
              </p>
              <p style="margin: 0; font-size: 11px; color: #cbd5e1;">
                Mensagem enviada automaticamente para ${toEmail}.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `;

      const textContent = `
PetHub — Seu código de acesso

Olá! Use o código abaixo para entrar no PetHub:

${code}

Este código expira em 10 minutos.

Se você não solicitou este código, por favor ignore este e-mail com segurança.
© ${new Date().getFullYear()} PetHub — Ourinhos - SP.
      `.trim();

      const response = await resend.emails.send({
        from: FROM_EMAIL,
        to: toEmail,
        subject: `${code} é o seu código de acesso ao PetHub 🐾`,
        html: htmlContent,
        text: textContent,
      });

      if (response.error) {
        return {
          success: false,
          error: response.error.message || 'Erro ao despachar e-mail pelo Resend.',
        };
      }

      return {
        success: true,
        id: response.data?.id,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Falha na comunicação com o serviço de e-mail.',
      };
    }
  },
};
