import type { OutboundEmail } from '../../../application/types/outbound-email.types';
import {
  AUTH_EMAIL_MAGIC_LINK_CATEGORY,
  AUTH_EMAIL_MAGIC_LINK_PATH,
  AUTH_EMAIL_MAGIC_LINK_SUBJECT,
  AUTH_EMAIL_VERIFICATION_CATEGORY,
  AUTH_EMAIL_VERIFICATION_PATH,
  AUTH_EMAIL_VERIFICATION_SUBJECT,
} from './auth-email.constants';

export function renderAuthenticationVerificationEmail(input: {
  readonly email: string;
  readonly token: string;
  readonly expiresAt: Date;
  readonly from: string;
  readonly publicBaseUrl: string;
}): OutboundEmail {
  return renderAuthenticationEmail({
    ...input,
    category: AUTH_EMAIL_VERIFICATION_CATEGORY,
    path: AUTH_EMAIL_VERIFICATION_PATH,
    subject: AUTH_EMAIL_VERIFICATION_SUBJECT,
    title: 'Confirme seu e-mail',
    instruction:
      'Use o link abaixo para confirmar seu e-mail e ativar sua conta.',
  });
}

export function renderAuthenticationMagicLinkEmail(input: {
  readonly email: string;
  readonly token: string;
  readonly expiresAt: Date;
  readonly from: string;
  readonly publicBaseUrl: string;
}): OutboundEmail {
  return renderAuthenticationEmail({
    ...input,
    category: AUTH_EMAIL_MAGIC_LINK_CATEGORY,
    path: AUTH_EMAIL_MAGIC_LINK_PATH,
    subject: AUTH_EMAIL_MAGIC_LINK_SUBJECT,
    title: 'Seu link de acesso',
    instruction: 'Use o link abaixo para entrar na Example App.',
  });
}

function renderAuthenticationEmail(input: {
  readonly email: string;
  readonly token: string;
  readonly expiresAt: Date;
  readonly from: string;
  readonly publicBaseUrl: string;
  readonly category: string;
  readonly path: string;
  readonly subject: string;
  readonly title: string;
  readonly instruction: string;
}): OutboundEmail {
  const link = buildAuthenticationLink(
    input.publicBaseUrl,
    input.path,
    input.token,
  );
  const expiration = input.expiresAt.toISOString();
  const safeEmail = escapeHtml(input.email);
  const safeLink = escapeHtml(link);
  const safeExpiration = escapeHtml(expiration);
  const text = [
    input.title,
    '',
    input.instruction,
    link,
    '',
    `Este link expira em ${expiration}.`,
    `Se você não solicitou esta mensagem, ignore-a.`,
  ].join('\n');
  const html = [
    `<p>${safeEmail}</p>`,
    `<h1>${escapeHtml(input.title)}</h1>`,
    `<p>${escapeHtml(input.instruction)}</p>`,
    `<p><a href="${safeLink}">${escapeHtml(input.title)}</a></p>`,
    `<p>Este link expira em ${safeExpiration}.</p>`,
    '<p>Se você não solicitou esta mensagem, ignore-a.</p>',
  ].join('');

  return Object.freeze({
    to: input.email,
    from: input.from,
    subject: input.subject,
    text,
    html,
    metadata: Object.freeze({
      category: input.category,
    }),
  });
}

function buildAuthenticationLink(
  publicBaseUrl: string,
  path: string,
  token: string,
): string {
  const baseUrl = parsePublicBaseUrl(publicBaseUrl);
  const link = new URL(path, baseUrl);
  link.searchParams.set('token', token);
  return link.toString();
}

function parsePublicBaseUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError('AUTH_PUBLIC_BASE_URL must be a valid URL');
  }
  if (
    (url.protocol !== 'https:' && url.protocol !== 'http:') ||
    url.username.length > 0 ||
    url.password.length > 0 ||
    url.search.length > 0 ||
    url.hash.length > 0 ||
    url.pathname !== '/'
  ) {
    throw new TypeError('AUTH_PUBLIC_BASE_URL is not a safe public URL');
  }
  return url;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return character;
    }
  });
}
