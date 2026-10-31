// backend/seed.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Recipe = require('./models/Recipe');

const sampleRecipes = [
  {
    title: 'Fluffy Buttermilk Pancakes',
    image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600',
    cuisine: 'Breakfast',
    servings: 4,
    prepTime: '10 Minutes',
    cookTime: '15 Minutes',
    ingredients: [
      '2 cups all-purpose flour',
      '2 tbsp sugar',
      '2 tsp baking powder',
      '1/2 tsp salt',
      '2 cups buttermilk',
      '2 large eggs',
      '4 tbsp melted butter',
    ],
    steps: [
      'Whisk together flour, sugar, baking powder, and salt in a large bowl.',
      'In another bowl, whisk buttermilk, eggs, and melted butter.',
      'Combine wet and dry ingredients until just mixed - do not overmix.',
      'Pour 1/4 cup batter onto a hot greased griddle per pancake.',
      'Cook until bubbles form on top, then flip and cook until golden.',
    ],
  },
  {
    title: 'Classic Margherita Pizza',
    image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600',
    cuisine: 'Italian',
    servings: 4,
    prepTime: '20 Minutes',
    cookTime: '12 Minutes',
    ingredients: [
      '1 pizza dough ball',
      '1/2 cup tomato sauce',
      '8 oz fresh mozzarella, sliced',
      'Fresh basil leaves',
      '2 tbsp olive oil',
      'Salt to taste',
    ],
    steps: [
      'Preheat oven to 475°F (245°C) with a pizza stone if available.',
      'Roll out the dough on a floured surface into a 12-inch circle.',
      'Spread tomato sauce evenly, leaving a border for the crust.',
      'Arrange mozzarella slices on top, drizzle with olive oil.',
      'Bake 10-12 minutes until crust is golden and cheese is bubbly.',
      'Top with fresh basil leaves before serving.',
    ],
  },
  {
    title: 'Spicy Ground Beef Tacos',
    image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600',
    cuisine: 'Mexican',
    servings: 4,
    prepTime: '15 Minutes',
    cookTime: '10 Minutes',
    ingredients: [
      '1 lb ground beef',
      '2 tbsp olive oil',
      '1 tsp smoked paprika',
      '1 tsp cumin',
      '1/2 tsp cayenne pepper',
      '8 small flour tortillas',
      '1 cup shredded lettuce',
      '1 cup diced tomatoes',
      '1/2 cup chopped red onion',
      '1 avocado, sliced',
    ],
    steps: [
      'Heat olive oil in a skillet over medium-high heat.',
      'Add ground beef, breaking it apart, and season with paprika, cumin, and cayenne.',
      'Cook until browned, about 6-8 minutes.',
      'Warm tortillas in a dry pan for 30 seconds per side.',
      'Assemble tacos with beef, lettuce, tomatoes, onion, and avocado.',
      'Squeeze fresh lime over each taco before serving.',
    ],
  },
  {
    title: 'Creamy Butter Chicken',
    image: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=600',
    cuisine: 'Indian',
    servings: 4,
    prepTime: '20 Minutes',
    cookTime: '30 Minutes',
    ingredients: [
      '1.5 lb chicken thighs, cubed',
      '1 cup plain yogurt',
      '2 tbsp butter',
      '1 onion, diced',
      '3 garlic cloves, minced',
      '1 tbsp ginger, minced',
      '1 cup tomato puree',
      '1/2 cup heavy cream',
      '2 tsp garam masala',
      '1 tsp turmeric',
    ],
    steps: [
      'Marinate chicken in yogurt and half the spices for at least 30 minutes.',
      'Melt butter in a pan, sauté onion, garlic, and ginger until fragrant.',
      'Add marinated chicken and cook until browned.',
      'Stir in tomato puree and remaining spices, simmer 15 minutes.',
      'Add heavy cream and simmer another 5 minutes until thickened.',
      'Serve hot with rice or naan bread.',
    ],
  },
  {
    title: 'Kung Pao Chicken',
    image: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=600',
    cuisine: 'Chinese',
    servings: 3,
    prepTime: '15 Minutes',
    cookTime: '15 Minutes',
    ingredients: [
      '1 lb chicken breast, cubed',
      '1/2 cup roasted peanuts',
      '4 dried red chilies',
      '2 tbsp soy sauce',
      '1 tbsp rice vinegar',
      '1 tbsp cornstarch',
      '2 garlic cloves, minced',
      '1 tbsp ginger, minced',
      '3 green onions, chopped',
    ],
    steps: [
      'Toss chicken cubes with cornstarch and a splash of soy sauce.',
      'Heat oil in a wok over high heat, stir-fry chicken until cooked, set aside.',
      'Add dried chilies, garlic, and ginger to the wok, stir-fry briefly.',
      'Return chicken to wok, add remaining soy sauce and rice vinegar.',
      'Toss in peanuts and green onions, stir-fry 2 more minutes.',
      'Serve immediately over steamed rice.',
    ],
  },
  {
    title: 'Classic American Cheeseburger',
    image: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=600',
    cuisine: 'American',
    servings: 4,
    prepTime: '10 Minutes',
    cookTime: '10 Minutes',
    ingredients: [
      '1.5 lb ground beef (80/20)',
      '4 slices cheddar cheese',
      '4 burger buns',
      'Lettuce, tomato, onion slices',
      'Salt and pepper to taste',
      'Ketchup and mustard',
    ],
    steps: [
      'Divide beef into 4 equal patties, season generously with salt and pepper.',
      'Heat a grill or skillet over medium-high heat.',
      'Cook patties 3-4 minutes per side for medium doneness.',
      'Add cheese slice in the last minute to melt.',
      'Toast buns lightly, then assemble with lettuce, tomato, onion.',
      'Add condiments of choice and serve immediately.',
    ],
  },
  {
    title: 'Rich Chocolate Lava Cake',
    image: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=600',
    cuisine: 'Desserts',
    servings: 2,
    prepTime: '15 Minutes',
    cookTime: '12 Minutes',
    ingredients: [
      '4 oz dark chocolate',
      '1/2 cup butter',
      '1 cup powdered sugar',
      '2 whole eggs',
      '2 egg yolks',
      '1/2 cup all-purpose flour',
    ],
    steps: [
      'Preheat oven to 425°F (220°C) and grease two ramekins.',
      'Melt chocolate and butter together until smooth.',
      'Whisk in powdered sugar, then eggs and egg yolks.',
      'Fold in flour until just combined.',
      'Divide batter between ramekins and bake 12-14 minutes.',
      'Let cool 1 minute, then invert onto plates and serve warm.',
    ],
  },
  {
    title: 'Refreshing Cucumber Mint Cooler',
    image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600',
    cuisine: 'Beverages',
    servings: 2,
    prepTime: '10 Minutes',
    cookTime: '0 Minutes',
    ingredients: [
      '1 cucumber, chopped',
      '1/4 cup fresh mint leaves',
      '2 tbsp lime juice',
      '2 tbsp honey',
      '2 cups cold water',
      'Ice cubes',
    ],
    steps: [
      'Blend cucumber, mint, lime juice, and honey until smooth.',
      'Strain the mixture through a fine sieve into a pitcher.',
      'Add cold water and stir well.',
      'Pour over ice cubes and garnish with a mint sprig.',
      'Serve immediately for best freshness.',
    ],
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected for seeding');

    // Find or create a demo author account
    let demoUser = await User.findOne({ email: 'team@flavoriz.com' });

    if (!demoUser) {
      const hashedPassword = await bcrypt.hash('flavoriz123', 10);
      demoUser = await User.create({
        username: 'Flavoriz Team',
        email: 'team@flavoriz.com',
        password: hashedPassword,
        bio: 'Official recipes from the Flavoriz team',
      });
      console.log('Created demo author account');
    }

    // Clear existing recipes from this demo author to avoid duplicates on re-run
    await Recipe.deleteMany({ author: demoUser._id });

    // Insert all sample recipes tied to the demo author
    const recipesWithAuthor = sampleRecipes.map(r => ({ ...r, author: demoUser._id }));
    await Recipe.insertMany(recipesWithAuthor);

    console.log(`Successfully seeded ${sampleRecipes.length} recipes!`);
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seed();