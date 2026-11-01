const router = require('express').Router();
const mongoose = require('mongoose');
const Recipe = require('../models/Recipe');
const User = require('../models/user');
const auth = require('../middleware/auth');
const { upload, optimizeAndStore } = require('../middleware/upload');
const validate = require('../middleware/validate');
const {
  recipeCreateSchema,
  recipeQuerySchema,
  reviewInputSchema,
  pantryFinderSchema,
} = require('../validation/schemas');

/**
 * GET /api/recipes
 * Advanced search, multi-faceted filtering, sorting, and pagination with .lean()
 */
router.get('/', validate({ query: recipeQuerySchema }), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      search,
      cuisine,
      dietary,
      difficulty,
      maxTime,
      sort = 'newest',
      all,
    } = req.query;

    const filter = {};

    // 1. Text Search across title, cuisine, and ingredients
    if (search && search.trim()) {
      const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rx = new RegExp(safeSearch, 'i');
      filter.$or = [
        { title: rx },
        { cuisine: rx },
        { ingredients: rx },
      ];
    }

    // 2. Cuisine Filter
    if (cuisine) {
      filter.cuisine = new RegExp(`^${cuisine}$`, 'i');
    }

    // 3. Dietary Filter (e.g., Vegan, Gluten-Free, Keto)
    if (dietary) {
      filter.dietary = new RegExp(`^${dietary}$`, 'i');
    }

    // 4. Difficulty Filter
    if (difficulty) {
      filter.difficulty = difficulty;
    }

    // 5. Sorting configuration
    let sortOptions = { createdAt: -1 };
    if (sort === 'oldest') sortOptions = { createdAt: 1 };
    if (sort === 'rating') sortOptions = { averageRating: -1, createdAt: -1 };
    if (sort === 'popular') sortOptions = { favoritesCount: -1, averageRating: -1 };

    // Support fetching all recipes without pagination if explicitly requested
    if (all) {
      const recipes = await Recipe.find(filter)
        .populate('author', 'username name profilePic')
        .sort(sortOptions)
        .lean();
      return res.json(recipes);
    }

    const skip = (page - 1) * limit;
    const totalRecipes = await Recipe.countDocuments(filter);
    const totalPages = Math.ceil(totalRecipes / limit);

    // Lean queries bypass Mongoose hydration for lightning-fast reads & lower memory
    const recipes = await Recipe.find(filter)
      .populate('author', 'username name profilePic')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean();

    // Return paginated response
    res.json({
      recipes,
      pagination: {
        totalRecipes,
        totalPages,
        currentPage: page,
        limit,
        hasMore: page < totalPages,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/recipes/pantry-finder
 * Pantry / "What's in My Fridge?" Finder
 * Matches recipes based on available ingredients and ranks them by match %
 */
router.post('/pantry-finder', validate({ body: pantryFinderSchema }), async (req, res) => {
  try {
    const rawInput = req.body.ingredients;
    const userIngredients = (Array.isArray(rawInput) ? rawInput : rawInput.split(','))
      .map(i => i.trim().toLowerCase())
      .filter(Boolean);

    if (userIngredients.length === 0) {
      return res.status(400).json({ error: 'Please provide at least one ingredient.' });
    }

    // Search for recipes that contain at least one user ingredient
    const regexes = userIngredients.map(ing => new RegExp(ing.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
    const candidates = await Recipe.find({
      ingredients: { $in: regexes },
    })
      .populate('author', 'username name profilePic')
      .lean();

    // Score and rank recipes by ingredient availability
    const scoredRecipes = candidates.map(recipe => {
      const recipeIngs = recipe.ingredients || [];
      const matchedIngs = [];
      const missingIngs = [];

      recipeIngs.forEach(rIng => {
        const rLower = rIng.toLowerCase();
        const hasMatch = userIngredients.some(uIng => rLower.includes(uIng));
        if (hasMatch) {
          matchedIngs.push(rIng);
        } else {
          missingIngs.push(rIng);
        }
      });

      const matchPercentage = recipeIngs.length > 0
        ? Math.round((matchedIngs.length / recipeIngs.length) * 100)
        : 0;

      return {
        ...recipe,
        matchPercentage,
        matchedCount: matchedIngs.length,
        totalIngredients: recipeIngs.length,
        missingIngredients: missingIngs,
      };
    });

    // Sort by match percentage descending
    scoredRecipes.sort((a, b) => b.matchPercentage - a.matchPercentage);

    res.json({
      totalMatches: scoredRecipes.length,
      searchedIngredients: userIngredients,
      recipes: scoredRecipes,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/recipes/favorites/my-favorites
 * Retrieve authenticated user's bookmarked recipes
 */
router.get('/favorites/my-favorites', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate({
        path: 'favorites',
        populate: { path: 'author', select: 'username name profilePic' },
      })
      .lean();

    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(user.favorites || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/recipes/user/:userId
 * Fetch recipes published by a specific author
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const recipes = await Recipe.find({ author: req.params.userId })
      .populate('author', 'username name profilePic')
      .sort({ createdAt: -1 })
      .lean();
    res.json(recipes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/recipes/:id
 * Fetch single recipe by ID
 */
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid recipe ID format.' });
    }

    const recipe = await Recipe.findById(req.params.id)
      .populate('author', 'username name profilePic')
      .populate('ratings.user', 'username name profilePic')
      .lean();

    if (!recipe) return res.status(404).json({ error: 'Recipe not found.' });
    res.json(recipe);
  } catch (err) {
    res.status(400).json({ error: 'Invalid recipe id' });
  }
});

/**
 * POST /api/recipes
 * Create recipe with Sharp image optimization / Cloudinary upload
 */
router.post('/', auth, upload.single('image'), optimizeAndStore, async (req, res) => {
  try {
    const {
      title,
      cuisine = 'General',
      servings = 4,
      prepTime = '',
      cookTime = '',
      ingredients = '',
      steps = '',
      dietary = '',
      difficulty = 'Medium',
      calories = 0,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Recipe title is required.' });
    }

    const ingredientsArray = Array.isArray(ingredients)
      ? ingredients
      : ingredients.split('\n').map(i => i.trim()).filter(Boolean);

    const stepsArray = Array.isArray(steps)
      ? steps
      : steps.split('\n').map(s => s.trim()).filter(Boolean);

    const dietaryArray = Array.isArray(dietary)
      ? dietary
      : (typeof dietary === 'string' && dietary.trim() ? dietary.split(',').map(d => d.trim()).filter(Boolean) : []);

    const imagePath = req.file ? (req.file.location || req.file.path) : '';

    const recipe = await Recipe.create({
      title: title.trim(),
      cuisine: cuisine.trim(),
      servings: Number(servings) || 4,
      prepTime: String(prepTime).trim(),
      cookTime: String(cookTime).trim(),
      ingredients: ingredientsArray,
      steps: stepsArray,
      dietary: dietaryArray,
      difficulty,
      calories: Number(calories) || 0,
      image: imagePath,
      author: req.userId,
    });

    const populated = await Recipe.findById(recipe._id)
      .populate('author', 'username name profilePic')
      .lean();

    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * PUT /api/recipes/:id
 * Update recipe (author only) with image optimization
 */
router.put('/:id', auth, upload.single('image'), optimizeAndStore, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid recipe ID.' });
    }

    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found.' });

    if (recipe.author.toString() !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to edit this recipe.' });
    }

    const {
      title,
      cuisine,
      servings,
      prepTime,
      cookTime,
      ingredients,
      steps,
      dietary,
      difficulty,
      calories,
    } = req.body;

    if (title) recipe.title = title.trim();
    if (cuisine) recipe.cuisine = cuisine.trim();
    if (servings !== undefined) recipe.servings = Number(servings) || recipe.servings;
    if (prepTime !== undefined) recipe.prepTime = String(prepTime).trim();
    if (cookTime !== undefined) recipe.cookTime = String(cookTime).trim();
    if (difficulty) recipe.difficulty = difficulty;
    if (calories !== undefined) recipe.calories = Number(calories) || 0;

    if (ingredients !== undefined) {
      recipe.ingredients = Array.isArray(ingredients)
        ? ingredients
        : ingredients.split('\n').map(i => i.trim()).filter(Boolean);
    }

    if (steps !== undefined) {
      recipe.steps = Array.isArray(steps)
        ? steps
        : steps.split('\n').map(s => s.trim()).filter(Boolean);
    }

    if (dietary !== undefined) {
      recipe.dietary = Array.isArray(dietary)
        ? dietary
        : (typeof dietary === 'string' && dietary.trim() ? dietary.split(',').map(d => d.trim()).filter(Boolean) : []);
    }

    if (req.file) {
      recipe.image = req.file.location || req.file.path;
    }

    await recipe.save();
    const updated = await Recipe.findById(recipe._id)
      .populate('author', 'username name profilePic')
      .lean();

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * DELETE /api/recipes/:id
 * Delete recipe (author only)
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid recipe ID.' });
    }

    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found.' });

    if (recipe.author.toString() !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to delete this recipe.' });
    }

    await recipe.deleteOne();
    // Also remove recipe from any users' bookmarks
    await User.updateMany(
      { favorites: req.params.id },
      { $pull: { favorites: req.params.id } }
    );

    res.json({ message: 'Recipe deleted successfully.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/recipes/:id/reviews
 * User Reviews & Star Ratings (Add or Update Rating)
 */
router.post('/:id/reviews', auth, validate({ body: reviewInputSchema }), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid recipe ID.' });
    }

    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found.' });

    const { rating, review = '' } = req.body;

    const existingIndex = recipe.ratings.findIndex(r => r.user.toString() === req.userId);
    if (existingIndex >= 0) {
      recipe.ratings[existingIndex].rating = rating;
      recipe.ratings[existingIndex].review = review.trim();
      recipe.ratings[existingIndex].createdAt = new Date();
    } else {
      recipe.ratings.push({
        user: req.userId,
        rating,
        review: review.trim(),
        createdAt: new Date(),
      });
    }

    // Recalculate average rating
    recipe.numReviews = recipe.ratings.length;
    const totalScore = recipe.ratings.reduce((acc, curr) => acc + curr.rating, 0);
    recipe.averageRating = Number((totalScore / recipe.numReviews).toFixed(1));

    await recipe.save();

    const populated = await Recipe.findById(recipe._id)
      .populate('ratings.user', 'username name profilePic')
      .lean();

    res.json({
      averageRating: recipe.averageRating,
      numReviews: recipe.numReviews,
      ratings: populated.ratings,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/recipes/:id/favorite
 * Toggle Bookmark / Favorite for recipe
 */
router.post('/:id/favorite', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid recipe ID.' });
    }

    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found.' });

    const user = await User.findById(req.userId);
    const isBookmarked = user.favorites.some(id => id.toString() === req.params.id);

    if (isBookmarked) {
      user.favorites = user.favorites.filter(id => id.toString() !== req.params.id);
      recipe.favoritesCount = Math.max(0, (recipe.favoritesCount || 1) - 1);
    } else {
      user.favorites.push(recipe._id);
      recipe.favoritesCount = (recipe.favoritesCount || 0) + 1;
    }

    await user.save();
    await recipe.save();

    res.json({
      isFavorite: !isBookmarked,
      favoritesCount: recipe.favoritesCount,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
