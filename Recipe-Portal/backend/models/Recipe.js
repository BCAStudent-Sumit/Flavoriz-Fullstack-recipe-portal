const mongoose = require('mongoose');

const recipeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  image: String,
  cuisine: String,
  servings: Number,
  prepTime: String,
  cookTime: String,
  ingredients: [String],
  steps: [String],
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Recipe', recipeSchema);