const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  review: { type: String, trim: true, default: '' },
  createdAt: { type: Date, default: Date.now },
});

const recipeSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  image: { type: String, default: '' },
  cuisine: { type: String, default: 'General', trim: true },
  dietary: [{
    type: String,
    enum: ['Vegetarian', 'Vegan', 'Gluten-Free', 'Keto', 'Dairy-Free', 'Low-Carb', 'Nut-Free', 'Paleo'],
  }],
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Medium',
  },
  calories: { type: Number, default: 0 },
  servings: { type: Number, default: 4, min: 1 },
  prepTime: { type: String, default: '' },
  cookTime: { type: String, default: '' },
  ingredients: [{ type: String, trim: true }],
  steps: [{ type: String, trim: true }],
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Community Ratings & Reviews
  ratings: [reviewSchema],
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
  numReviews: { type: Number, default: 0 },

  // Favorites / Bookmarks count
  favoritesCount: { type: Number, default: 0 },
}, { timestamps: true });

// Compound and Search Indexes for Performance Optimization
recipeSchema.index({ title: 'text', cuisine: 'text', ingredients: 'text' });
recipeSchema.index({ author: 1, createdAt: -1 });
recipeSchema.index({ cuisine: 1, averageRating: -1 });
recipeSchema.index({ dietary: 1, createdAt: -1 });
recipeSchema.index({ createdAt: -1 });
recipeSchema.index({ averageRating: -1 });

module.exports = mongoose.model('Recipe', recipeSchema);
