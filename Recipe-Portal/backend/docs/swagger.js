const swaggerUi = require('swagger-ui-express');

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Flavoriz Recipe Portal API',
    version: '1.0.0',
    description: 'Interactive API documentation for Flavoriz Recipe Portal — covering Authentication, Recipes, Social Reviews, Pantry Search, AI Assistant, and User Profiles.',
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local development server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token from /api/auth/login or /api/auth/signup',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '64d8f1e2c9e77a0012345678' },
          username: { type: 'string', example: 'chef_sumit' },
          email: { type: 'string', example: 'sumit@example.com' },
          name: { type: 'string', example: 'Sumit Majumder' },
          bio: { type: 'string', example: 'Passionate Italian cuisine chef' },
          profilePic: { type: 'string', example: '/uploads/avatar.webp' },
          followersCount: { type: 'integer', example: 42 },
          followingCount: { type: 'integer', example: 12 },
        },
      },
      Recipe: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '64d8f1e2c9e77a0012345679' },
          title: { type: 'string', example: 'Classic Margherita Pizza' },
          image: { type: 'string', example: '/uploads/pizza.webp' },
          cuisine: { type: 'string', example: 'Italian' },
          dietary: { type: 'array', items: { type: 'string' }, example: ['Vegetarian'] },
          difficulty: { type: 'string', enum: ['Easy', 'Medium', 'Hard'], example: 'Easy' },
          calories: { type: 'number', example: 450 },
          servings: { type: 'number', example: 4 },
          prepTime: { type: 'string', example: '20 mins' },
          cookTime: { type: 'string', example: '15 mins' },
          ingredients: { type: 'array', items: { type: 'string' }, example: ['Pizza dough', 'San Marzano tomatoes', 'Fresh mozzarella', 'Fresh basil'] },
          steps: { type: 'array', items: { type: 'string' }, example: ['Roll out dough', 'Spread tomato sauce', 'Bake at 450°F for 12 mins'] },
          averageRating: { type: 'number', example: 4.8 },
          numReviews: { type: 'integer', example: 14 },
          favoritesCount: { type: 'integer', example: 28 },
          author: { $ref: '#/components/schemas/User' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Review: {
        type: 'object',
        properties: {
          rating: { type: 'integer', minimum: 1, maximum: 5, example: 5 },
          review: { type: 'string', example: 'Turned out perfectly crispy and delicious!' },
        },
        required: ['rating'],
      },
      PantryFinderRequest: {
        type: 'object',
        properties: {
          ingredients: {
            type: 'array',
            items: { type: 'string' },
            example: ['eggs', 'cheese', 'bread'],
          },
        },
        required: ['ingredients'],
      },
    },
  },
  paths: {
    '/api/auth/signup': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a new user account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'email', 'password'],
                properties: {
                  username: { type: 'string', example: 'chef_sumit' },
                  email: { type: 'string', example: 'sumit@example.com' },
                  password: { type: 'string', example: 'SecretPass123' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'User registered successfully with JWT token.' },
          400: { description: 'Validation error.' },
          409: { description: 'Username or email already exists.' },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Log into user account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'sumit@example.com' },
                  password: { type: 'string', example: 'SecretPass123' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Authentication successful, returns JWT token.' },
          400: { description: 'Invalid credentials.' },
        },
      },
    },
    '/api/auth/forgot-password': {
      post: {
        tags: ['Authentication'],
        summary: 'Request password reset token via email',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: {
                  email: { type: 'string', example: 'sumit@example.com' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Password reset email triggered if user exists.' },
        },
      },
    },
    '/api/recipes': {
      get: {
        tags: ['Recipes'],
        summary: 'Get paginated recipes with advanced search and multi-faceted filtering',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 12 } },
          { name: 'search', in: 'query', description: 'Text search across title, cuisine, ingredients', schema: { type: 'string' } },
          { name: 'cuisine', in: 'query', description: 'Filter by cuisine (e.g., Italian, Mexican)', schema: { type: 'string' } },
          { name: 'dietary', in: 'query', description: 'Filter by dietary preference (e.g., Vegetarian, Vegan, Gluten-Free)', schema: { type: 'string' } },
          { name: 'difficulty', in: 'query', schema: { type: 'string', enum: ['Easy', 'Medium', 'Hard'] } },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['newest', 'oldest', 'rating', 'popular'], default: 'newest' } },
        ],
        responses: {
          200: {
            description: 'List of recipes with pagination details.',
          },
        },
      },
      post: {
        tags: ['Recipes'],
        summary: 'Create a new recipe with image upload & Sharp optimization',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['title', 'ingredients', 'steps'],
                properties: {
                  title: { type: 'string' },
                  cuisine: { type: 'string' },
                  servings: { type: 'number' },
                  prepTime: { type: 'string' },
                  cookTime: { type: 'string' },
                  difficulty: { type: 'string', enum: ['Easy', 'Medium', 'Hard'] },
                  calories: { type: 'number' },
                  dietary: { type: 'string', description: 'Comma-separated dietary tags' },
                  ingredients: { type: 'string', description: 'Newline separated list of ingredients' },
                  steps: { type: 'string', description: 'Newline separated list of steps' },
                  image: { type: 'string', format: 'binary', description: 'Recipe image file' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Recipe created successfully.' },
          400: { description: 'Validation error.' },
        },
      },
    },
    '/api/recipes/{id}': {
      get: {
        tags: ['Recipes'],
        summary: 'Get single recipe by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Recipe details found.' },
          404: { description: 'Recipe not found.' },
        },
      },
      put: {
        tags: ['Recipes'],
        summary: 'Update recipe (Author only)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Recipe updated successfully.' },
          403: { description: 'Not authorized.' },
        },
      },
      delete: {
        tags: ['Recipes'],
        summary: 'Delete recipe (Author only)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Recipe deleted successfully.' },
          403: { description: 'Not authorized.' },
        },
      },
    },
    '/api/recipes/pantry-finder': {
      post: {
        tags: ['Pantry Finder'],
        summary: 'Find recipes ranked by ingredient availability ("What\'s in my fridge?")',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PantryFinderRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Ranked list of recipes matching available ingredients.' },
        },
      },
    },
    '/api/recipes/{id}/reviews': {
      post: {
        tags: ['Social & Reviews'],
        summary: 'Add or update user review & star rating for a recipe',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Review' },
            },
          },
        },
        responses: {
          200: { description: 'Review saved and average rating updated.' },
        },
      },
    },
    '/api/recipes/{id}/favorite': {
      post: {
        tags: ['Social & Reviews'],
        summary: 'Toggle bookmark / favorite on a recipe',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Favorite toggled.' },
        },
      },
    },
    '/api/recipes/favorites/my-favorites': {
      get: {
        tags: ['Social & Reviews'],
        summary: 'Get all favorite recipes bookmarked by current user',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'List of favorite recipes.' },
        },
      },
    },
  },
};

const setupSwagger = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  console.log('Swagger API docs initialized at /api-docs');
};

module.exports = setupSwagger;
