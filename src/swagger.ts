import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'BiblioSys API',
      version: '1.0.0',
      description: 'API do sistema de gerenciamento de biblioteca com empréstimos, notificações SQS e cache Redis.',
    },
    servers: [{ url: 'http://localhost:3000', description: 'Desenvolvimento' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '664a1b2c3d4e5f6a7b8c9d0e' },
            name: { type: 'string', example: 'Maria Silva' },
            email: { type: 'string', example: 'maria@email.com' },
            role: { type: 'string', enum: ['user', 'admin'], example: 'user' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiJ9...' },
            user: { $ref: '#/components/schemas/User' },
          },
        },
        Book: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '664a1b2c3d4e5f6a7b8c9d0f' },
            title: { type: 'string', example: 'Dom Casmurro' },
            author: { type: 'string', example: 'Machado de Assis' },
            isbn: { type: 'string', example: '978-85-359-0277-5' },
            totalQty: { type: 'integer', example: 3 },
            availableQty: { type: 'integer', example: 2 },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        BookRef: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            title: { type: 'string' },
            author: { type: 'string' },
            isbn: { type: 'string' },
          },
        },
        Loan: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '664a1b2c3d4e5f6a7b8c9d10' },
            userId: { type: 'string', example: '664a1b2c3d4e5f6a7b8c9d0e' },
            bookId: { $ref: '#/components/schemas/BookRef' },
            borrowedAt: { type: 'string', format: 'date-time' },
            returnedAt: { type: 'string', format: 'date-time', nullable: true },
            status: { type: 'string', enum: ['active', 'returned'], example: 'active' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
      },
    },
    paths: {
      '/health': {
        get: {
          tags: ['Sistema'],
          summary: 'Liveness probe',
          responses: {
            200: {
              description: 'API operacional',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'ok' },
                      timestamp: { type: 'string', format: 'date-time' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/auth/register': {
        post: {
          tags: ['Autenticação'],
          summary: 'Cadastrar novo usuário',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'email', 'password'],
                  properties: {
                    name: { type: 'string', example: 'Maria Silva' },
                    email: { type: 'string', format: 'email', example: 'maria@email.com' },
                    password: { type: 'string', example: 'senha123' },
                    adminSecret: { type: 'string', description: 'Chave para criar conta admin', example: 'admin123' },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: 'Usuário criado com sucesso',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
            },
            400: { description: 'Campos obrigatórios ausentes', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            409: { description: 'Email já cadastrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Autenticação'],
          summary: 'Login',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email', example: 'maria@email.com' },
                    password: { type: 'string', example: 'senha123' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Login realizado com sucesso',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
            },
            400: { description: 'Campos obrigatórios ausentes' },
            401: { description: 'Credenciais inválidas' },
          },
        },
      },
      '/books': {
        get: {
          tags: ['Livros'],
          summary: 'Listar livros',
          description: 'Retorna todos os livros. Resultado cacheado no Redis por 60 segundos.',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: 'query',
              name: 'q',
              schema: { type: 'string' },
              description: 'Busca por título ou autor (text search)',
            },
          ],
          responses: {
            200: {
              description: 'Lista de livros',
              content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Book' } } } },
            },
            401: { description: 'Token ausente ou inválido' },
          },
        },
        post: {
          tags: ['Livros'],
          summary: 'Cadastrar livro',
          description: 'Requer role admin.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['title', 'author', 'isbn', 'totalQty'],
                  properties: {
                    title: { type: 'string', example: 'Dom Casmurro' },
                    author: { type: 'string', example: 'Machado de Assis' },
                    isbn: { type: 'string', example: '978-85-359-0277-5' },
                    totalQty: { type: 'integer', minimum: 1, example: 3 },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Livro criado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Book' } } } },
            400: { description: 'Campos obrigatórios ausentes' },
            401: { description: 'Token ausente ou inválido' },
            403: { description: 'Usuário não é admin' },
            409: { description: 'ISBN já cadastrado' },
          },
        },
      },
      '/books/{id}': {
        get: {
          tags: ['Livros'],
          summary: 'Detalhar livro',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: 'ID do livro' }],
          responses: {
            200: { description: 'Livro encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Book' } } } },
            401: { description: 'Token ausente ou inválido' },
            404: { description: 'Livro não encontrado' },
          },
        },
        put: {
          tags: ['Livros'],
          summary: 'Atualizar livro',
          description: 'Requer role admin. Envie apenas os campos a alterar.',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    author: { type: 'string' },
                    isbn: { type: 'string' },
                    totalQty: { type: 'integer', minimum: 1 },
                    availableQty: { type: 'integer', minimum: 0 },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Livro atualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Book' } } } },
            401: { description: 'Token ausente ou inválido' },
            403: { description: 'Usuário não é admin' },
            404: { description: 'Livro não encontrado' },
          },
        },
      },
      '/loans': {
        get: {
          tags: ['Empréstimos'],
          summary: 'Listar todos os empréstimos',
          description: 'Requer role admin. Retorna todos os empréstimos com usuário e livro populados.',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Lista de empréstimos', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Loan' } } } } },
            401: { description: 'Token ausente ou inválido' },
            403: { description: 'Usuário não é admin' },
          },
        },
        post: {
          tags: ['Empréstimos'],
          summary: 'Emprestar livro',
          description: 'Cria um empréstimo e publica evento `LOAN_CREATED` no SQS.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['bookId'],
                  properties: {
                    bookId: { type: 'string', example: '664a1b2c3d4e5f6a7b8c9d0f' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Empréstimo criado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Loan' } } } },
            400: { description: 'Campo bookId ausente' },
            401: { description: 'Token ausente ou inválido' },
            404: { description: 'Livro não encontrado' },
            409: { description: 'Sem exemplares disponíveis ou usuário já possui este livro emprestado' },
          },
        },
      },
      '/loans/my': {
        get: {
          tags: ['Empréstimos'],
          summary: 'Meus empréstimos',
          description: 'Retorna todos os empréstimos do usuário autenticado, ordenados do mais recente.',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Empréstimos do usuário', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Loan' } } } } },
            401: { description: 'Token ausente ou inválido' },
          },
        },
      },
      '/loans/{id}/return': {
        put: {
          tags: ['Empréstimos'],
          summary: 'Devolver livro',
          description: 'Marca o empréstimo como devolvido e publica evento `LOAN_RETURNED` no SQS. Somente o dono do empréstimo pode devolver.',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: 'ID do empréstimo' }],
          responses: {
            200: { description: 'Empréstimo devolvido', content: { 'application/json': { schema: { $ref: '#/components/schemas/Loan' } } } },
            401: { description: 'Token ausente ou inválido' },
            404: { description: 'Empréstimo ativo não encontrado para este usuário' },
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
