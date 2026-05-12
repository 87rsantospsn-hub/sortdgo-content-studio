# SORTD GO Content Studio

SORTD GO Content Studio is a full-stack tattoo studio content creation app with a Flask backend and a dark editorial frontend. It generates tattoo art using OpenAI GPT-4o Vision + DALL-E 3 and captions using Anthropic Claude.

## Features

- Theme suggestions and seasonal / trending theme chips
- Image analysis and art generation via OpenAI GPT-4o + DALL-E 3
- Caption generation via Anthropic Claude
- Refinement workflow for regenerated art
- LocalStorage persistence for studio settings and save history

## Project structure

```
sortdgo-content-studio/
├── app.py
├── requirements.txt
├── Procfile
├── README.md
├── templates/
│   └── index.html
└── static/
    ├── css/style.css
    └── js/script.js
```

## Environment variables

- `ANTHROPIC_API_KEY` — required for Claude theme suggestion and caption generation

## Deployment

### Railway

1. Create a new Railway project and connect the repository.
2. Set environment variable `ANTHROPIC_API_KEY` in Railway.
3. Railway will detect `requirements.txt` and install dependencies.
4. Railway uses the `Procfile` to run `gunicorn app:app`.

### Netlify

1. Deploy the frontend as static assets. If you want to host only the UI on Netlify, configure a wrapper that loads the static `templates/index.html` and `static/` files.
2. Set `window.API_BASE_URL` on your Netlify site (for example, via script injection or a custom HTML file) to the Railway backend URL, such as `https://your-railway-app.up.railway.app`.
3. The frontend JavaScript will call `${API_BASE_URL}/api/...` when the variable is defined, or use the same origin if the app is served from the backend.

### Environment variables

- `ANTHROPIC_API_KEY` — required for Claude theme suggestion and caption generation in the backend.
- `API_BASE_URL` — optional frontend variable when deploying the UI separately from the backend.

## Running locally

```bash
python -m venv venv
source venv/bin/activate   # macOS/Linux
venv\Scripts\activate    # Windows
pip install -r requirements.txt
set ANTHROPIC_API_KEY=your_key_here
python app.py
```
