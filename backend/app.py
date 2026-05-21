from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import base64
from PIL import Image
from io import BytesIO
import time
import random

from pipeline import run_pipeline, clean_songs

# Create Flask application
app = Flask(__name__)

# Enable CORS so frontend can communicate with backend
CORS(app)

# Folder path to store uploaded images
UPLOAD_FOLDER = "static/uploads"

# Create upload folder if it does not exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Save upload folder path in app config
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER


# Home route to check whether backend is running
@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "MoodFix backend is running"})


# Route to return random songs
@app.route("/songs/random", methods=["GET"])
def random_songs():
    try:
        # Get limit from query parameter, default is 12
        limit = int(request.args.get("limit", 12))
    except ValueError:
        limit = 12

    # Keep limit between 1 and 15
    limit = max(1, min(limit, 15))

    # If song list is smaller than limit, return all songs
    if len(clean_songs) <= limit:
        results = clean_songs
    else:
        # Otherwise return random sample
        results = random.sample(clean_songs, limit)

    return jsonify({"results": results})


# Route to predict emotion from uploaded image file
@app.route("/predict", methods=["POST"])
def predict():
    # Check whether image file exists in request
    if "image" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["image"]

    # Check whether file is selected
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    # Create unique filename using current timestamp
    filename = str(int(time.time())) + "_" + file.filename
    filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)

    # Save uploaded file
    file.save(filepath)

    # Run emotion detection and recommendation pipeline
    result = run_pipeline(filepath)

    return jsonify(result)


# Route to predict emotion from webcam image
@app.route("/predict_webcam", methods=["POST"])
def predict_webcam():
    # Get image data either from JSON body or form data
    data = request.json.get("image_data") if request.is_json else request.form.get("image_data")

    # Check if image data exists
    if not data:
        return jsonify({"error": "No webcam image received"}), 400

    try:
        # Split base64 image string into header and actual encoded image
        header, encoded = data.split(",", 1)

        # Decode base64 image into bytes
        img_bytes = base64.b64decode(encoded)
    except Exception:
        return jsonify({"error": "Invalid webcam image data"}), 400

    # Create file path for webcam image
    filename = f"webcam_{int(time.time())}.jpg"
    filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)

    try:
        # Open image from bytes, convert to RGB, and save as JPEG
        image = Image.open(BytesIO(img_bytes)).convert("RGB")
        image.save(filepath, "JPEG", quality=95)
    except Exception as e:
        return jsonify({"error": f"Failed to process webcam image: {str(e)}"}), 500

    # Run emotion detection and recommendation pipeline
    result = run_pipeline(filepath)
    return jsonify(result)


# Route to search songs by name, artist, or genre
@app.route("/search", methods=["GET"])
def search():
    # Get and clean search query
    query = request.args.get("query", "").strip().lower()

    # Return error if query is empty
    if not query:
        return jsonify({"error": "Type something to search!"}), 400

    results = []

    # Search through cleaned song list
    for s in clean_songs:
        song_name = (s.get("song") or "").lower()
        artist = (s.get("Artist(s)") or "").lower()
        genre = (s.get("Genre") or "").lower()

        # Match query against song name, artist, or genre
        if query in song_name or query in artist or query in genre:
            results.append(s)

        # Stop after 20 matching results
        if len(results) >= 20:
            break

    return jsonify({"query": query, "results": results})


# Run Flask app directly
if __name__ == "__main__":
    app.run(debug=True)