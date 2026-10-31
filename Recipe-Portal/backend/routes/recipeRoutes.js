const router = require('express').Router();
const Recipe = require('../models/Recipe');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', async (req, res) => {
  try {
    const { cuisine } = req.query;
    const filter = {};
    if (cuisine) {
      filter.cuisine = new RegExp(`^${cuisine}$`, 'i');
    }
    const recipes = await Recipe.find(filter).populate('author', 'username');
    res.json(recipes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/user/:userId', async (req, res) => {
  const recipes = await Recipe.find({ author: req.params.userId });
  res.json(recipes);
});

router.get('/:id', async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id).populate('author', 'username');
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    res.json(recipe);
  } catch (err) {
    res.status(400).json({ error: 'Invalid recipe id' });
  }
});

router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const { title, cuisine, servings, prepTime, cookTime, ingredients, steps } = req.body;
    const ingredientsArray = ingredients.split('\n').map(i => i.trim()).filter(Boolean);
    const stepsArray = steps.split('\n').map(s => s.trim()).filter(Boolean);
    const imagePath = req.file ? `/uploads/${req.file.filename}` : '';

    const recipe = await Recipe.create({
      title, cuisine, servings, prepTime, cookTime,
      ingredients: ingredientsArray,
      steps: stepsArray,
      image: imagePath,
      author: req.userId,
    });

    res.status(201).json(recipe);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// NEW - update an existing recipe (owner only)
router.put('/:id', auth, upload.single('image'), async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

    // Ownership check - only the original author can edit
    if (recipe.author.toString() !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to edit this recipe' });
    }

    const { title, cuisine, servings, prepTime, cookTime, ingredients, steps } = req.body;

    recipe.title = title;
    recipe.cuisine = cuisine;
    recipe.servings = servings;
    recipe.prepTime = prepTime;
    recipe.cookTime = cookTime;
    recipe.ingredients = ingredients.split('\n').map(i => i.trim()).filter(Boolean);
    recipe.steps = steps.split('\n').map(s => s.trim()).filter(Boolean);

    // Only replace the image if a new one was uploaded
    if (req.file) {
      recipe.image = `/uploads/${req.file.filename}`;
    }

    await recipe.save();
    res.json(recipe);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// NEW - delete a recipe (owner only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

    if (recipe.author.toString() !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to delete this recipe' });
    }

    await recipe.deleteOne();
    res.json({ message: 'Recipe deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;