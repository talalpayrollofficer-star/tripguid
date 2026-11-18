# Wanderly: AI tour guide (Gemini + Netlify)

1. Get a free key: https://aistudio.google.com/apikey
2. Put this folder on GitHub, then in Netlify choose "Add new site > Import from Git"
   (Netlify needs the functions folder built, so drag-and-drop of just index.html will NOT run the AI).
3. Site settings > Environment variables > add GEMINI_API_KEY = your key
4. Deploy. Open the site and search a city.

Notes
- If the model name stops working, check AI Studio and edit it in netlify/functions/guide.mjs.
- Results are cached in each visitor's browser to save your free quota.
- If Gemini fails, the app falls back to built-in guides for Madurai, Kochi, Munnar and Chennai.
