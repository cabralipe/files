// lib/email.ts
// Serviço de envio de emails usando Nodemailer ou SendGrid

import nodemailer from 'nodemailer';

// Configurar transporter (usar variáveis de ambiente)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true para 465, false para outros
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Enviar email genérico
 */
export async function sendEmail(
  options: EmailOptions
): Promise<{ success: boolean; error?: Error }> {
  try {
    const result = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@bncc-platform.com',
      ...options,
    });

    console.log('Email enviado:', result.messageId);
    return { success: true };
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Email de boas-vindas após signup
 */
export async function sendWelcomeEmail(
  email: string,
  name: string
): Promise<{ success: boolean; error?: Error }> {
  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <div style="background-color: #1a5490; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1>Bem-vindo à BNCC Platform!</h1>
      </div>

      <div style="padding: 30px; background-color: #f9f9f9;">
        <p>Olá <strong>${name}</strong>,</p>

        <p>Muito obrigado por se cadastrar na BNCC Platform! 🎉</p>

        <p>Agora você pode:</p>
        <ul>
          <li>✅ Criar e gerenciar seus planos de aula com IA</li>
          <li>✅ Compartilhar experiências exitosas com outros professores</li>
          <li>✅ Ganhar pontos e subir no ranking</li>
          <li>✅ Acessar uma comunidade de educadores comprometidos</li>
        </ul>

        <p style="margin-top: 30px;">
          <a href="${process.env.APP_URL || 'https://bncc-platform.com'}/dashboard"
             style="display: inline-block; background-color: #1a5490; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Acessar Dashboard
          </a>
        </p>

        <p style="margin-top: 20px; font-size: 14px; color: #666;">
          Se tiver dúvidas, responda este email ou visite nossa <a href="${process.env.APP_URL}/help">página de ajuda</a>.
        </p>
      </div>

      <div style="background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 12px; color: #999; border-radius: 0 0 8px 8px;">
        <p>© 2026 BNCC Platform. Todos os direitos reservados.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: 'Bem-vindo à BNCC Platform!',
    html,
    text: `Bem-vindo ${name}! Você agora pode criar planos de aula com IA.`,
  });
}

/**
 * Email de resetar senha
 */
export async function sendPasswordResetEmail(
  email: string,
  resetLink: string,
  name: string
): Promise<{ success: boolean; error?: Error }> {
  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <div style="background-color: #1a5490; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1>Resetar Senha</h1>
      </div>

      <div style="padding: 30px; background-color: #f9f9f9;">
        <p>Olá <strong>${name}</strong>,</p>

        <p>Recebemos uma solicitação para resetar sua senha. Clique no link abaixo para criar uma nova senha:</p>

        <p style="margin-top: 20px; text-align: center;">
          <a href="${resetLink}"
             style="display: inline-block; background-color: #1a5490; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Resetar Senha
          </a>
        </p>

        <p style="margin-top: 20px; font-size: 14px; color: #999;">
          Este link expira em 24 horas.<br/>
          Se você não solicitou a redefinição de senha, ignore este email.
        </p>
      </div>

      <div style="background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 12px; color: #999; border-radius: 0 0 8px 8px;">
        <p>© 2026 BNCC Platform. Todos os direitos reservados.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: 'Resetar sua senha - BNCC Platform',
    html,
    text: `Clique para resetar sua senha: ${resetLink}`,
  });
}

/**
 * Email de notificação de experiência publicada
 */
export async function sendExperiencePublishedEmail(
  email: string,
  name: string,
  experienceTitle: string,
  experienceLink: string
): Promise<{ success: boolean; error?: Error }> {
  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <div style="background-color: #27ae60; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1>Experiência Publicada! 🎉</h1>
      </div>

      <div style="padding: 30px; background-color: #f9f9f9;">
        <p>Parabéns <strong>${name}</strong>!</p>

        <p>Sua experiência exitosa <strong>"${experienceTitle}"</strong> foi publicada com sucesso!</p>

        <p>Você ganhou <strong>+25 pontos</strong> e agora pode receber likes de outros professores.</p>

        <p style="margin-top: 20px; text-align: center;">
          <a href="${experienceLink}"
             style="display: inline-block; background-color: #27ae60; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Ver Experiência
          </a>
        </p>
      </div>

      <div style="background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 12px; color: #999; border-radius: 0 0 8px 8px;">
        <p>© 2026 BNCC Platform. Todos os direitos reservados.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: `Sua experiência "${experienceTitle}" foi publicada!`,
    html,
    text: `Parabéns! Sua experiência foi publicada e você ganhou 25 pontos.`,
  });
}

/**
 * Email de notificação de like recebido
 */
export async function sendLikeNotificationEmail(
  email: string,
  authorName: string,
  experienceTitle: string,
  totalLikes: number
): Promise<{ success: boolean; error?: Error }> {
  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <div style="background-color: #e74c3c; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1>Novo Like! ❤️</h1>
      </div>

      <div style="padding: 30px; background-color: #f9f9f9;">
        <p>Olá <strong>${authorName}</strong>,</p>

        <p>Sua experiência <strong>"${experienceTitle}"</strong> recebeu um novo like!</p>

        <p>Você ganhou <strong>+1 ponto</strong>.</p>

        <p>Total de likes: <strong>${totalLikes}</strong> 👍</p>
      </div>

      <div style="background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 12px; color: #999; border-radius: 0 0 8px 8px;">
        <p>© 2026 BNCC Platform. Todos os direitos reservados.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: `Sua experiência recebeu um novo like! ❤️`,
    html,
    text: `Sua experiência recebeu um like! Total: ${totalLikes}`,
  });
}

/**
 * Email de newsletter com sugestões
 */
export async function sendNewsletterEmail(
  email: string,
  name: string,
  content: string
): Promise<{ success: boolean; error?: Error }> {
  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <div style="background-color: #1a5490; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1>Newsletter BNCC Platform</h1>
      </div>

      <div style="padding: 30px; background-color: #f9f9f9;">
        ${content}
      </div>

      <div style="background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 12px; color: #999; border-radius: 0 0 8px 8px;">
        <p>© 2026 BNCC Platform. Todos os direitos reservados.</p>
        <p><a href="${process.env.APP_URL}/unsubscribe?email=${encodeURIComponent(email)}" style="color: #999;">Desinscrever-se</a></p>
      </div>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: 'Newsletter BNCC Platform - Novas sugestões',
    html,
  });
}

/**
 * Email de confirmação de email
 */
export async function sendEmailVerificationEmail(
  email: string,
  verificationLink: string
): Promise<{ success: boolean; error?: Error }> {
  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <div style="background-color: #1a5490; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1>Confirme seu Email</h1>
      </div>

      <div style="padding: 30px; background-color: #f9f9f9;">
        <p>Obrigado por se cadastrar na BNCC Platform!</p>

        <p>Clique no link abaixo para confirmar seu email e ativar sua conta:</p>

        <p style="margin-top: 20px; text-align: center;">
          <a href="${verificationLink}"
             style="display: inline-block; background-color: #1a5490; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Confirmar Email
          </a>
        </p>

        <p style="margin-top: 20px; font-size: 14px; color: #999;">
          Este link expira em 7 dias.
        </p>
      </div>

      <div style="background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 12px; color: #999; border-radius: 0 0 8px 8px;">
        <p>© 2026 BNCC Platform. Todos os direitos reservados.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: 'Confirme seu email - BNCC Platform',
    html,
    text: `Clique para confirmar: ${verificationLink}`,
  });
}

/**
 * Testar configuração de email
 */
export async function testEmailConfiguration(): Promise<boolean> {
  try {
    await transporter.verify();
    console.log('✅ Email configuration is correct');
    return true;
  } catch (error) {
    console.error('❌ Email configuration error:', error);
    return false;
  }
}
