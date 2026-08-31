import {
  HTTP_BAD_REQUEST,
  HTTP_NOT_FOUND,
  HTTP_OK,
  HTTP_SERVICE_UNAVAILABLE,
} from './http.constants';

export const EMAIL_DIAGNOSTICS_SWAGGER = {
  operation: {
    summary: 'Lista metadados dos e-mails enviados no Resend',
    description:
      'Rota operacional local, disponível somente em development com diagnóstico explicitamente habilitado. ' +
      'Nunca retorna o conteúdo dos e-mails nem credenciais do provedor.',
  },
  secretHeader: {
    name: 'x-auth-email-diagnostic-secret',
    required: true,
    description: 'Segredo operacional separado da chave de API do Resend.',
  },
  limitQuery: {
    name: 'limit',
    required: false,
    type: Number,
    minimum: 1,
    maximum: 100,
    example: 20,
  },
  afterQuery: {
    name: 'after',
    required: false,
    description: 'ID do último item da página anterior.',
    example: '4ef9a417-02e9-4d39-ad75-9611e0fcc33c',
  },
  beforeQuery: {
    name: 'before',
    required: false,
    description: 'ID do primeiro item da página atual.',
    example: '4ef9a417-02e9-4d39-ad75-9611e0fcc33c',
  },
  success: {
    status: HTTP_OK,
    schema: {
      example: {
        object: 'list',
        hasMore: false,
        data: [
          {
            id: '4ef9a417-02e9-4d39-ad75-9611e0fcc33c',
            to: ['p***@e***'],
            from: 'h***@s***',
            createdAt: '2026-08-28T12:00:00.000Z',
            subject: 'Seu link de acesso à Example App',
            lastEvent: 'queued',
          },
        ],
      },
    },
  },
  invalidQuery: {
    status: HTTP_BAD_REQUEST,
    description: 'Parâmetros de paginação inválidos.',
    schema: { example: { code: 'AUTH_FAILED' } },
  },
  notFound: {
    status: HTTP_NOT_FOUND,
    description: 'Diagnóstico não habilitado ou credencial/origem inválida.',
  },
  unavailable: {
    status: HTTP_SERVICE_UNAVAILABLE,
    description:
      'O provedor de e-mail não respondeu ou retornou payload inválido.',
    schema: { example: { code: 'EMAIL_DIAGNOSTICS_UNAVAILABLE' } },
  },
} as const;
