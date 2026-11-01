const { z } = require('zod');

// Authentication Schemas
const signupSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9._]+$/, 'Username can only contain letters, numbers, dots, and underscores'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
  email: z.string().min(1, 'Please enter your email or username').trim(),
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// Recipe Schemas
const recipeCreateSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(120, 'Title cannot exceed 120 characters'),
  cuisine: z.string().optional().default('General'),
  servings: z.coerce.number().min(1, 'Servings must be at least 1').optional().default(4),
  prepTime: z.string().optional().default(''),
  cookTime: z.string().optional().default(''),
  ingredients: z.union([
    z.string().min(1, 'Ingredients are required'),
    z.array(z.string()).min(1, 'At least one ingredient is required')
  ]),
  steps: z.union([
    z.string().min(1, 'Instructions are required'),
    z.array(z.string()).min(1, 'At least one step is required')
  ]),
  dietary: z.union([
    z.string(),
    z.array(z.string())
  ]).optional(),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional().default('Medium'),
  calories: z.coerce.number().min(0).optional().default(0),
});

const recipeQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(12),
  search: z.string().optional(),
  cuisine: z.string().optional(),
  dietary: z.string().optional(),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional(),
  maxTime: z.coerce.number().optional(),
  sort: z.enum(['newest', 'oldest', 'rating', 'popular']).optional().default('newest'),
  all: z.coerce.boolean().optional(),
});

const reviewInputSchema = z.object({
  rating: z.coerce.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  review: z.string().max(1000, 'Review cannot exceed 1000 characters').optional().default(''),
});

const pantryFinderSchema = z.object({
  ingredients: z.union([
    z.string().min(1, 'Ingredients are required'),
    z.array(z.string()).min(1, 'At least one ingredient is required')
  ]),
});

module.exports = {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  recipeCreateSchema,
  recipeQuerySchema,
  reviewInputSchema,
  pantryFinderSchema,
};
