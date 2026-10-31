// routes/ai.js
console.log('>>> ai.js loaded from:', __filename);
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // your existing JWT middleware

router.post('/generate-recipe', auth, async (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ message: 'Recipe title is required' });
  }

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Generate a recipe for "${title}". Respond with JSON only, in this exact shape: {"title":"","cuisine":"","servings":4,"prepTime":15,"cookTime":30,"ingredients":["..."],"instructions":["..."]}`
            }]
          }],
          generationConfig: {
            responseMimeType: 'application/json' // forces Gemini to return valid JSON, no markdown fences
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API error:', data);
      throw new Error(data.error?.message || 'Gemini API request failed');
    }

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const recipe = JSON.parse(raw);

    res.json(recipe);
  } catch (err) {
    console.error('AI recipe generation failed:', err);
    res.status(500).json({ message: 'Could not generate recipe' });
  }
});

// Translates arbitrary text into the requested language, used by the
// frontend to speak bot replies in the user's chosen voice language.
router.post('/translate', auth, async (req, res) => {
  const { text, targetLangName } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ message: 'Text is required' });
  }
  if (!targetLangName) {
    return res.status(400).json({ message: 'targetLangName is required' });
  }

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Translate the following text into ${targetLangName}. Respond with ONLY the translated text — no quotes, no explanation, no extra formatting:\n\n"""${text}"""`
            }]
          }]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini translate error:', data);
      throw new Error(data.error?.message || 'Translation request failed');
    }

    const translated = (data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
    res.json({ translated: translated || text });
  } catch (err) {
    console.error('Translation failed:', err);
    res.status(500).json({ message: 'Could not translate text' });
  }
});

module.exports = router;