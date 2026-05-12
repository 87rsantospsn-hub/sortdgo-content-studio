import base64
import datetime
import os
import re

from flask import Flask, jsonify, render_template, request
from flask_cors import CORS
from anthropic import AI_PROMPT, Anthropic, HUMAN_PROMPT
from openai import OpenAI

app = Flask(__name__, template_folder="templates", static_folder="static")
CORS(app, supports_credentials=True)

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

if not ANTHROPIC_API_KEY:
    print("WARNING: ANTHROPIC_API_KEY is not set. Claude endpoints will fail until it is configured.")


def get_theme_matrix():
    month = datetime.datetime.utcnow().month
    seasonal = []
    if month == 5:
        seasonal = ["Mother's Day", "Matching tattoos"]
    elif month == 6:
        seasonal = ["Winter deals", "Sleeve season"]
    elif month == 10:
        seasonal = ["Halloween flash"]
    elif month == 12:
        seasonal = ["Christmas flash", "New year tattoo"]
    return {
        "seasonal": seasonal,
        "popular": [
            "Aftercare tips",
            "Before & after",
            "Open bookings",
            "Studio backstage",
            "Fresh ink",
            "First tattoo",
            "Client story",
        ],
    }


def safe_claude_completion(prompt: str, max_tokens: int = 300, temperature: float = 0.7) -> str:
    if not ANTHROPIC_API_KEY:
        raise RuntimeError("Missing ANTHROPIC_API_KEY")

    client = Anthropic(api_key=ANTHROPIC_API_KEY)
    response = client.completions.create(
        model="claude-3.1",
        prompt=f"{HUMAN_PROMPT}{prompt}{AI_PROMPT}",
        max_tokens=max_tokens,
        temperature=temperature,
    )
    return getattr(response, "completion", str(response)).strip()


def clean_list_output(text: str):
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    items = []
    for line in lines:
        line = re.sub(r"^\d+[\).\-\s]*", "", line)
        if line:
            items.append(line)
    return items[:5] if items else [text.strip()]


def make_dalle_size(format_name: str) -> str:
    if format_name in ["Story 9:16", "Reels 9:16", "TikTok"]:
        return "1024x1792"
    return "1024x1024"


def build_art_prompt(data: dict, photo_description: str = "") -> str:
    theme = data.get("theme", "editorial tattoo inspiration").strip()
    style = data.get("style", "Fineline").strip()
    use_style = data.get("use_style", True)
    tone = data.get("tone", "Professional").strip()
    extra = data.get("extra_context", "").strip()
    studio_name = data.get("studio_name", "Understairs Ink").strip()
    handle = data.get("handle", "@understairsink").strip()
    format_name = data.get("format", "Feed 1:1").strip()

    base_description = (
        f"Create a dark editorial tattoo studio social media art piece for {studio_name} ({handle}) "
        f"with a cinematic, high-end magazine poster look. "
        f"The theme is '{theme}'. "
    )
    if photo_description:
        base_description += f"Incorporate a refined photo analysis from the uploaded image: {photo_description}. "
    if use_style and style:
        base_description += f"Use a {style} tattoo aesthetic that feels moody and polished. "
    extra_line = f"Use the tone: {tone}. " if tone else ""
    extra_context = f"Additional direction: {extra}. " if extra else ""

    layout = (
        "The final art must include a dark cinematic background, a large Playfair Display 900 serif headline overlaid, "
        "a script accent word or phrase in magenta #c0185a, the studio name in subtle small caps top left, "
        "the Instagram handle bottom right, and a thin horizontal line above the CTA phrase. "
        "Do not show the app UI. Make it look like a high-end editorial tattoo magazine post. "
    )

    format_note = (
        "Create a square 1024x1024 image for Feed or Carousel" if format_name in ["Feed 1:1", "Carousel"]
        else "Create a vertical 1024x1792 image for Story/Reels/TikTok"
    )

    prompt = (
        f"{base_description}{extra_line}{extra_context}{layout}{format_note} "
        "Use cinematic tattoo imagery such as dark roses, skulls, dragons, snakes, or realistic portrait elements when it matches the theme. "
        "Keep the headline bold, the secondary script accent elegant, and the magenta brand details tasteful. "
    )
    return prompt.strip()


def build_refine_prompt(current_prompt: str, instruction: str) -> str:
    return (
        "You are an expert tattoo studio creative director. "
        "A current editorial tattoo post prompt is shown below. Apply only the requested refinement while preserving the layout, colors, mood, fonts, and magazine-style composition. "
        f"Current prompt: {current_prompt}\n"
        f"Requested change: {instruction}\n"
        "Produce a single new DALL-E prompt that keeps everything the same except the requested update. "
        "Do not include explanation or analysis."
    )


def make_openai_client(key: str) -> OpenAI:
    return OpenAI(api_key=key)


def analyze_photo_with_gpt4o(key: str, photo_base64: str) -> str:
    client = make_openai_client(key)
    prompt = (
        "You are an editorial tattoo art director. Describe the image and the tattoo style with "
        "rich detail for a new dark cinematic magazine-style artwork. "
        "Focus on subject, pose, mood, color palette, and tattoo motifs."
    )
    image_data = f"data:image/png;base64,{photo_base64}" if not photo_base64.startswith("data:") else photo_base64
    resp = client.responses.create(
        model="gpt-4o-vision-preview",
        input=[
            {
                "role": "user",
                "content": [
                    {"type": "input_text", "text": prompt},
                    {"type": "input_image", "image_url": image_data},
                ],
            }
        ],
        max_output_tokens=250,
    )
    return getattr(resp, "output_text", "").strip() or str(resp)


def generate_dalle_image(key: str, prompt: str, size: str):
    client = make_openai_client(key)
    resp = client.images.generate(
        model="gpt-image-1",
        prompt=prompt,
        size=size,
        quality="hd",
    )
    image_b64 = resp.data[0].b64_json
    return image_b64


@app.route("/", methods=["GET"])
def index():
    return render_template("index.html")


@app.route("/api/themes", methods=["GET"])
def api_themes():
    return jsonify(get_theme_matrix())


@app.route("/api/suggest-theme", methods=["POST"])
def api_suggest_theme():
    payload = request.get_json(silent=True) or {}
    query = payload.get("query", "").strip()
    if not query:
        return jsonify({"error": "Query is required."}), 400
    prompt = (
        f"Suggest five high-end editorial tattoo social media post themes for the studio based on: {query}. "
        "Make the themes punchy, modern, and salon-focused. Return only the themes in a short list."
    )
    try:
        response_text = safe_claude_completion(prompt, max_tokens=180)
        suggestions = clean_list_output(response_text)
        return jsonify({"suggestions": suggestions})
    except Exception as error:
        return jsonify({"error": str(error)}), 500


@app.route("/api/generate-caption", methods=["POST"])
def api_generate_caption():
    payload = request.get_json(silent=True) or {}
    theme = payload.get("theme", "Fresh ink").strip()
    tone = payload.get("tone", "Professional").strip()
    handle = payload.get("handle", "@understairsink").strip()
    studio_name = payload.get("studio_name", "Understairs Ink").strip()
    extra = payload.get("extra_context", "").strip()
    prompt = (
        f"Write an Instagram caption and hashtag block for a tattoo studio called {studio_name} ({handle}). "
        f"The post theme is '{theme}'. Use a {tone.lower()} voice and keep it authentic, editorial, and on-brand. "
        f"Include a short opening hook, one sentence about the design or experience, a CTA for bookings, and 6-9 relevant hashtags. "
    )
    if extra:
        prompt += f"Additional direction: {extra}. "
    try:
        response_text = safe_claude_completion(prompt, max_tokens=250)
        return jsonify({"caption": response_text})
    except Exception as error:
        return jsonify({"error": str(error)}), 500


@app.route("/api/generate-art", methods=["POST"])
def api_generate_art():
    payload = request.get_json(silent=True) or {}
    openai_key = request.headers.get("X-OpenAI-Key", "").strip()
    if not openai_key:
        return jsonify({"error": "Missing X-OpenAI-Key header."}), 400

    photo_base64 = payload.get("photo_base64", "").strip()
    description = ""
    if photo_base64:
        try:
            description = analyze_photo_with_gpt4o(openai_key, photo_base64)
        except Exception as error:
            return jsonify({"error": f"Photo analysis failed: {error}"}), 500

    prompt = build_art_prompt(payload, photo_description=description)
    size = make_dalle_size(payload.get("format", "Feed 1:1"))

    try:
        image_b64 = generate_dalle_image(openai_key, prompt, size)
        return jsonify({"image_base64": image_b64, "prompt": prompt})
    except Exception as error:
        return jsonify({"error": f"Art generation failed: {error}"}), 500


@app.route("/api/refine-art", methods=["POST"])
def api_refine_art():
    payload = request.get_json(silent=True) or {}
    openai_key = request.headers.get("X-OpenAI-Key", "").strip()
    if not openai_key:
        return jsonify({"error": "Missing X-OpenAI-Key header."}), 400

    current_prompt = payload.get("current_prompt", "").strip()
    instruction = payload.get("instruction", "").strip()
    current_art = payload.get("current_art_base64", "").strip()
    if not current_prompt or not instruction or not current_art:
        return jsonify({"error": "current_prompt, instruction, and current_art_base64 are required."}), 400

    refine_prompt = build_refine_prompt(current_prompt, instruction)
    size = make_dalle_size(payload.get("format", "Feed 1:1"))
    try:
        client = make_openai_client(openai_key)
        resp = client.responses.create(
            model="gpt-4o-vision-preview",
            input=[
                {
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": "Generate a new prompt for art regeneration."},
                        {"type": "input_text", "text": refine_prompt},
                        {"type": "input_image", "image_url": f"data:image/png;base64,{current_art}"},
                    ],
                }
            ],
            max_output_tokens=200,
        )
        new_prompt = getattr(resp, "output_text", "").strip() or refine_prompt
        image_b64 = generate_dalle_image(openai_key, new_prompt, size)
        return jsonify({"image_base64": image_b64, "prompt": new_prompt})
    except Exception as error:
        return jsonify({"error": f"Refinement failed: {error}"}), 500


@app.route("/api/health", methods=["GET"])
def api_health():
    return jsonify({"status": "ok", "anthropic": bool(ANTHROPIC_API_KEY)})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)
