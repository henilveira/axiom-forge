import {
  PASSWORD_MAXIMUM_LENGTH,
  PASSWORD_MINIMUM_LENGTH,
} from '../../application/policies/password.constants';
import {
  HTTP_BAD_REQUEST,
  HTTP_CREATED,
  HTTP_FOUND,
  HTTP_OK,
  HTTP_SEE_OTHER,
  HTTP_SERVICE_UNAVAILABLE,
  HTTP_TOO_MANY_REQUESTS,
  HTTP_UNAUTHORIZED,
} from './http.constants';

// ponytail: senha de exemplo contém "/" de propósito — placeholder plausível
// que ainda satisfaz a política real (12-128 chars) sem disparar o falso
// positivo de sonarjs/no-hardcoded-passwords (exclui valores sem espaço/`/`).
const EXAMPLE_PASSWORD = 'Example-Password/2026!';
const EXAMPLE_EMAIL = 'ana.silva@example.com';
// ponytail: token de exemplo legível (baixa entropia) — magic link/oauth/state
// são sempre emitidos dinamicamente pelo servidor, nenhum valor estático
// funciona de verdade; isto só ilustra o formato esperado do campo.
const EXAMPLE_OPAQUE_TOKEN_HINT = 'cole-o-token-recebido-por-e-mail-aqui';

const CSRF_FLOW_DESCRIPTION =
  'Requer cookie CSRF double-submit: copie o valor do cookie `app_csrf` ' +
  '(setado como resposta de login/magic-link/Google) para o header ' +
  '`x-csrf-token`. O Swagger UI aberto no mesmo browser já envia os cookies ' +
  '`app_refresh`/`app_session`/`app_csrf` automaticamente nesta e nas próximas ' +
  'chamadas; falta só preencher o header manualmente com o valor do cookie.';

const CSRF_HEADER = {
  name: 'x-csrf-token',
  required: true,
  example: 'valor-do-cookie-app_csrf',
};

const AUTH_FAILED_EXAMPLE = { code: 'AUTH_FAILED' };
const AUTH_CSRF_REJECTED_EXAMPLE = { code: 'AUTH_CSRF_REJECTED' };
const AUTH_RATE_LIMITED_EXAMPLE = { code: 'AUTH_RATE_LIMITED' };
const AUTH_GOOGLE_UNAVAILABLE_EXAMPLE = { code: 'AUTH_GOOGLE_UNAVAILABLE' };

export const REGISTER_SWAGGER = {
  operation: {
    summary: 'Registra uma conta com e-mail e senha',
    description:
      'Sempre responde ACCEPTED (mesmo se o e-mail já existir) para não vazar ' +
      'existência de conta. Um e-mail de verificação é enfileirado; use o token ' +
      'recebido nele em GET /auth/email/verify.',
  },
  body: {
    schema: {
      type: 'object' as const,
      required: ['email', 'password', 'termsVersion'],
      properties: {
        email: { type: 'string', format: 'email' },
        password: {
          type: 'string',
          minLength: PASSWORD_MINIMUM_LENGTH,
          maxLength: PASSWORD_MAXIMUM_LENGTH,
        },
        termsVersion: { type: 'string' },
      },
    },
    examples: {
      valid: {
        value: {
          email: EXAMPLE_EMAIL,
          password: EXAMPLE_PASSWORD,
          termsVersion: 'v1',
        },
      },
    },
  },
  accepted: {
    status: HTTP_CREATED,
    description: 'ACCEPTED',
    schema: { example: { outcome: 'ACCEPTED' } },
  },
  invalid: {
    status: HTTP_BAD_REQUEST,
    description: 'E-mail/senha inválidos ou política de senha violada',
    schema: { example: AUTH_FAILED_EXAMPLE },
  },
};

export const VERIFY_EMAIL_SWAGGER = {
  operation: {
    summary: 'Consome o token de verificação de e-mail enviado no registro',
  },
  query: {
    name: 'token',
    required: true,
    example: 'AbCdEf012345-token-do-email',
  },
  accepted: { status: HTTP_OK, schema: { example: { outcome: 'ACCEPTED' } } },
  rejected: {
    status: HTTP_OK,
    description: 'Token inválido, expirado ou já consumido (não é erro HTTP)',
    schema: { example: { outcome: 'REJECTED' } },
  },
};

export const LOGIN_SWAGGER = {
  operation: {
    summary: 'Login com e-mail e senha',
    description:
      'Sucesso seta os cookies httpOnly `app_session`/`app_refresh` e o cookie ' +
      'legível `app_csrf` (necessário para os endpoints protegidos por CSRF).',
  },
  body: {
    schema: {
      type: 'object' as const,
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string' },
      },
    },
    examples: {
      valid: { value: { email: EXAMPLE_EMAIL, password: EXAMPLE_PASSWORD } },
    },
  },
  success: {
    status: HTTP_CREATED,
    schema: { example: { outcome: 'SUCCESS' } },
  },
  failed: {
    status: HTTP_UNAUTHORIZED,
    description: 'Credenciais inválidas ou conta inativa',
    schema: { example: AUTH_FAILED_EXAMPLE },
  },
  rateLimited: {
    status: HTTP_TOO_MANY_REQUESTS,
    description: 'Rate limit de login excedido',
    schema: { example: AUTH_RATE_LIMITED_EXAMPLE },
  },
};

export const MAGIC_LINK_REQUEST_SWAGGER = {
  operation: {
    summary: 'Solicita um magic link de login por e-mail',
    description:
      'Sempre responde ACCEPTED (não vaza existência de conta). O link enviado ' +
      'por e-mail aponta para GET /auth/magic-link/consume?token=...',
  },
  body: {
    schema: {
      type: 'object' as const,
      required: ['email'],
      properties: { email: { type: 'string', format: 'email' } },
    },
    examples: { valid: { value: { email: EXAMPLE_EMAIL } } },
  },
  accepted: {
    status: HTTP_CREATED,
    schema: { example: { outcome: 'ACCEPTED' } },
  },
  rateLimited: {
    status: HTTP_TOO_MANY_REQUESTS,
    description: 'Rate limit de magic link excedido',
    schema: { example: AUTH_RATE_LIMITED_EXAMPLE },
  },
};

export const MAGIC_LINK_CONSUME_SWAGGER = {
  operation: {
    summary: 'Consome o token de magic link e cria a sessão',
    description:
      'Sucesso seta os cookies de sessão/CSRF e redireciona (303) para a ' +
      'rota configurada em `AUTH_REDIRECT_PATH`. Falha responde 401 sem redirecionar.',
  },
  query: {
    name: 'token',
    required: true,
    example: EXAMPLE_OPAQUE_TOKEN_HINT,
  },
  redirect: {
    status: HTTP_SEE_OTHER,
    description: 'Redireciona com sessão criada',
  },
  failed: {
    status: HTTP_UNAUTHORIZED,
    description: 'Token inválido, expirado ou já consumido',
    schema: { example: AUTH_FAILED_EXAMPLE },
  },
};

export const GOOGLE_START_SWAGGER = {
  operation: {
    summary: 'Inicia o fluxo OAuth do Google (Authorization Code + PKCE)',
    description:
      'Redireciona (302) para o Google. Requer `GOOGLE_OIDC_ENABLED=true` ' +
      'e credenciais válidas no ambiente; caso contrário falha com ' +
      'AUTH_GOOGLE_UNAVAILABLE. Testável pela UI apenas até o redirect ' +
      '(seguir o fluxo completo do Google exige credencial real de usuário).',
  },
  redirect: { status: HTTP_FOUND, description: 'Redireciona para o Google' },
  unavailable: {
    status: HTTP_SERVICE_UNAVAILABLE,
    description: 'Google OAuth desabilitado ou indisponível',
    schema: { example: AUTH_GOOGLE_UNAVAILABLE_EXAMPLE },
  },
};

export const GOOGLE_CALLBACK_SWAGGER = {
  operation: {
    summary: 'Callback do Google OAuth',
    description:
      'Chamado pelo Google após o consentimento; valida `state` contra o cookie ' +
      '`app_oauth_state` gerado por GET /auth/google/start. Se a conta Google ' +
      'ainda não estiver vinculada a nenhum usuário local, responde LINK_REQUIRED ' +
      'e seta o cookie `app_google_link`, exigindo POST /auth/google/link para ' +
      'confirmar o vínculo com senha ou magic token. Caso contrário cria a ' +
      'sessão diretamente. Sempre redireciona (303) para `AUTH_REDIRECT_PATH`.',
  },
  codeQuery: {
    name: 'code',
    required: true,
    example: 'authorization-code-do-google',
  },
  stateQuery: {
    name: 'state',
    required: true,
    example: 'state-do-cookie-app_oauth_state',
  },
  redirect: {
    status: HTTP_SEE_OTHER,
    description: 'Redireciona (sessão criada ou vínculo pendente)',
  },
  failed: {
    status: HTTP_UNAUTHORIZED,
    description: 'state inválido ou callback do Google rejeitado',
    schema: { example: AUTH_FAILED_EXAMPLE },
  },
};

export const GOOGLE_LINK_SWAGGER = {
  operation: {
    summary: 'Confirma o vínculo de uma conta Google pendente (LINK_REQUIRED)',
    description:
      'Só funciona logo após um GET /auth/google/callback que respondeu ' +
      'LINK_REQUIRED (usa o cookie `app_google_link`). Prove a posse da conta ' +
      `local existente com a senha atual OU um magic token válido. ${CSRF_FLOW_DESCRIPTION}`,
  },
  csrfHeader: CSRF_HEADER,
  body: {
    schema: {
      type: 'object' as const,
      properties: {
        password: { type: 'string' },
        magicToken: { type: 'string' },
      },
    },
    examples: {
      byPassword: { value: { password: EXAMPLE_PASSWORD } },
      byMagicToken: { value: { magicToken: EXAMPLE_OPAQUE_TOKEN_HINT } },
    },
  },
  success: {
    status: HTTP_CREATED,
    schema: { example: { outcome: 'SUCCESS' } },
  },
  failed: {
    status: HTTP_UNAUTHORIZED,
    description: 'CSRF inválido, vínculo expirado ou prova de posse incorreta',
    schema: { example: AUTH_FAILED_EXAMPLE },
  },
};

export const SESSION_REFRESH_SWAGGER = {
  operation: {
    summary: 'Rotaciona o refresh token e emite uma nova sessão',
    description: `Requer o cookie \`app_refresh\` de um login/refresh anterior. ${CSRF_FLOW_DESCRIPTION}`,
  },
  csrfHeader: CSRF_HEADER,
  success: {
    status: HTTP_CREATED,
    schema: { example: { outcome: 'SUCCESS' } },
  },
  failed: {
    status: HTTP_UNAUTHORIZED,
    description:
      'CSRF ausente/inválido ou refresh token inválido/reutilizado (replay)',
    schema: { example: AUTH_CSRF_REJECTED_EXAMPLE },
  },
};

export const LOGOUT_SWAGGER = {
  operation: {
    summary: 'Encerra a sessão atual e limpa os cookies',
    description: `Revoga o refresh token e limpa todos os cookies de auth. ${CSRF_FLOW_DESCRIPTION}`,
  },
  csrfHeader: CSRF_HEADER,
  accepted: {
    status: HTTP_CREATED,
    schema: { example: { outcome: 'ACCEPTED' } },
  },
  failed: {
    status: HTTP_UNAUTHORIZED,
    description: 'CSRF ausente ou inválido',
    schema: { example: AUTH_CSRF_REJECTED_EXAMPLE },
  },
};
