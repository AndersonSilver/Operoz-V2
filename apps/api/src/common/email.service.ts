import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Abstração simples de envio de e-mail. Sem SMTP configurado (dev/local),
 * cai para um transporte "stream" que só loga o conteúdo — nunca falha
 * silenciosamente nem tenta enviar de verdade sem credenciais.
 */
class EmailService {
  private transporter: Transporter;

  constructor() {
    this.transporter = env.smtp.configured
      ? nodemailer.createTransport({
          host: env.smtp.host,
          port: env.smtp.port,
          secure: env.smtp.port === 465,
          auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.password } : undefined,
        })
      : nodemailer.createTransport({ streamTransport: true, buffer: true });
  }

  async send(input: SendEmailInput): Promise<void> {
    if (!env.smtp.configured) {
      logger.warn(
        { to: input.to, subject: input.subject },
        "SMTP não configurado — e-mail não enviado de verdade (modo dev). Conteúdo no debug.",
      );
      logger.debug({ html: input.html }, "Conteúdo do e-mail (dev)");
      return;
    }

    await this.transporter.sendMail({
      from: env.smtp.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
  }

  async sendMagicLink(to: string, url: string): Promise<void> {
    await this.send({
      to,
      subject: "Seu link de acesso ao Operoz",
      html: `<p>Clique no link abaixo para entrar no Operoz. Ele expira em 10 minutos e só pode ser usado uma vez.</p><p><a href="${url}">${url}</a></p>`,
      text: `Acesse: ${url} (expira em 10 minutos)`,
    });
  }

  async sendPasswordReset(to: string, url: string): Promise<void> {
    await this.send({
      to,
      subject: "Redefinição de senha — Operoz",
      html: `<p>Recebemos um pedido para redefinir sua senha. Clique no link abaixo (válido por 1 hora):</p><p><a href="${url}">${url}</a></p><p>Se não foi você, ignore este e-mail.</p>`,
      text: `Redefina sua senha: ${url} (expira em 1 hora)`,
    });
  }

  async sendWorkspaceInvite(
    to: string,
    workspaceName: string,
    inviterName: string,
    url: string,
  ): Promise<void> {
    await this.send({
      to,
      subject: `${inviterName} convidou você para o workspace "${workspaceName}" no Operoz`,
      html: `<p>${inviterName} convidou você para colaborar no workspace <strong>${workspaceName}</strong>.</p><p><a href="${url}">${url}</a></p>`,
      text: `${inviterName} convidou você para o workspace "${workspaceName}": ${url}`,
    });
  }

  async sendProjectInvite(to: string, projectName: string, url: string): Promise<void> {
    await this.send({
      to,
      subject: `Você foi convidado para o projeto "${projectName}" no Operoz`,
      html: `<p>Você foi convidado a colaborar no projeto <strong>${projectName}</strong>.</p><p><a href="${url}">${url}</a></p>`,
      text: `Você foi convidado para o projeto "${projectName}": ${url}`,
    });
  }

  async sendProjectMemberAdded(to: string, projectName: string): Promise<void> {
    await this.send({
      to,
      subject: `Você foi adicionado ao projeto "${projectName}" no Operoz`,
      html: `<p>Você foi adicionado como membro do projeto <strong>${projectName}</strong>.</p>`,
      text: `Você foi adicionado ao projeto "${projectName}".`,
    });
  }
}

export const emailService = new EmailService();
