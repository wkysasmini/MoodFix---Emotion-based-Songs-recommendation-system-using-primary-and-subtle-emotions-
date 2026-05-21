"""# **Imports**"""

import torch
import torch.nn as nn
import torchvision.models as models
from torchvision import transforms
from PIL import Image
import json
import numpy as np
import cv2
from facenet_pytorch import MTCNN
import torch.nn.functional as F
import random

# Path to FER class labels
FER_CLASSES_PATH = "models/fer_classes1.json"

# Path to trained FER model
FER_MODEL_PATH = "models/fer_resnet18_1.pth"

# Path to Emo135 class labels
EMO_CLASSES_PATH = "models/emo135_classes.json"

# Path to trained Emo135 model
EMO_MODEL_PATH = "models/emo135_resnet18.pth"

# Path to processed Spotify songs dataset
SONG_DATA_PATH = "data/spotify_songs_processed.json"

# Use GPU if available, otherwise use CPU
device = "cuda" if torch.cuda.is_available() else "cpu"

"""# **Face Detector (MTCNN)**"""

# Initialize MTCNN face detector
mtcnn = MTCNN(
    image_size=224,        # output face image size
    margin=20,             # margin around detected face
    select_largest=True,   # choose largest face if multiple faces exist
    post_process=True,     # apply post-processing
    device=device          # run on selected device
)

# Detect face and preprocess image for model input
def detect_face(image_path):
    # Read image using OpenCV
    img = cv2.imread(image_path)
    if img is None:
        return None

    # Convert BGR to RGB
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    # Convert NumPy array to PIL image
    img = Image.fromarray(img)

    # Detect face using MTCNN
    face = mtcnn(img)
    if face is None:
        return None

    # Convert tensor shape from (C,H,W) to (H,W,C) NumPy format
    face = face.permute(1, 2, 0).cpu().numpy()

    # Convert face to grayscale
    face = cv2.cvtColor(face, cv2.COLOR_RGB2GRAY)
    face = (face * 255).astype(np.uint8)

    # Improve contrast for better facial feature visibility
    face = cv2.equalizeHist(face)

    # Convert grayscale back to RGB
    face = cv2.cvtColor(face, cv2.COLOR_GRAY2RGB)
    face = Image.fromarray(face)

    # Define preprocessing transforms
    transform = transforms.Compose([
        transforms.Resize((224, 224)),  # resize image to model input size
        transforms.ToTensor(),          # convert image to tensor
        transforms.Normalize(           # normalize with ImageNet stats
            mean=[0.485, 0.456, 0.406],
            std =[0.229, 0.224, 0.225]
        )
    ])

    # Add batch dimension
    face = transform(face).unsqueeze(0)
    return face

"""# **Load FER Classes & Model**"""

# Load FER emotion class labels from JSON file
with open(FER_CLASSES_PATH) as f:
    fer_classes = json.load(f)

# Create ResNet18 model for FER
fer_model = models.resnet18(weights=None)

# Replace final layer to match number of FER classes
fer_model.fc = nn.Linear(fer_model.fc.in_features, len(fer_classes))

# Load trained FER model weights
fer_model.load_state_dict(torch.load(FER_MODEL_PATH, map_location=device))

# Move model to selected device
fer_model.to(device)

# Set model to evaluation mode
fer_model.eval()


# Predict main and secondary FER emotion
def predict_fer(face):
    # Move input to device
    face = face.to(device)

    with torch.no_grad():
        # Run model prediction
        output = fer_model(face)

        # Convert outputs to probabilities
        probs = F.softmax(output, dim=1)

        # Get top 2 predictions
        top2 = torch.topk(probs, 2)
        confidence = top2.values[0][0].item()
        main_idx   = top2.indices[0][0].item()
        second_idx = top2.indices[0][1].item()

        # Convert class indices to emotion names
        main_emotion = fer_classes[main_idx]
        second_emotion = fer_classes[second_idx]

        # If confidence is too low, fallback to neutral
        if confidence < 0.45:
            return "neutral", None, confidence

    return main_emotion, second_emotion, confidence

"""# **Load Emo135 Classes and Model**"""

# Load Emo135 emotion classes from JSON file
with open(EMO_CLASSES_PATH) as f:
    emo_classes = json.load(f)

# Create ResNet18 model for Emo135
emo_model = models.resnet18(weights=None)

# Replace final layer to match number of Emo135 classes
emo_model.fc = nn.Linear(emo_model.fc.in_features, len(emo_classes))

# Load trained Emo135 model weights
emo_model.load_state_dict(torch.load(EMO_MODEL_PATH, map_location=device))

# Move model to selected device
emo_model.to(device)

# Set model to evaluation mode
emo_model.eval()

# Predict probabilities for all Emo135 classes
def predict_emo135(face):
    face = face.to(device)
    with torch.no_grad():
        output = emo_model(face)
        probs = torch.softmax(output, dim=1)[0]
    return probs.cpu().numpy()

"""# **Emotion Constraints**"""

# Allowed secondary emotions for each main FER emotion
EMOTION_CONSTRAINTS = {
    "happy": [
        "happiness", "joy", "gladness", "cheerfulness",
        "delight", "amusement", "enjoyment",
        "elation", "excitement", "enthusiasm",
        "pleasure", "satisfaction", "pride",
        "triumph", "bliss", "optimism", "love",
        "affection", "fondness","compassion",
        "desire", "passion"
    ],
    "sad": [
        "sadness", "sorrow", "grief", "melancholy",
        "loneliness", "depression", "despair",
        "disappointment", "hopelessness",
        "suffering", "distress", "hurt"
    ],
    "angry": [
        "anger", "rage", "annoyance",
        "irritation", "frustration",
        "resentment", "hate"
    ],
    "fear": [
        "fear", "anxiety", "worry", "nervousness"
    ],
    "surprise": [
        "surprise", "astonishment", "amazement", "shock"
    ],
    "disgust": [
        "disgust", "displeasure"
    ],
    "neutral": [
        "contentment", "hope"
    ]
}

"""# **Predic Final Emotion(Primary + Secondary)**"""

# Predict main and secondary emotion from an image
def predict_final_emotions(image_path):
    # Detect and preprocess face
    face = detect_face(image_path)

    if face is None:
        return {"error": "No face detected"}

    # Predict main emotion using FER model
    main_emotion, _, conf = predict_fer(face)

    # Predict subtle emotion probabilities using Emo135
    emo_probs = predict_emo135(face)

    # Get allowed secondary emotions based on main emotion
    allowed = EMOTION_CONSTRAINTS.get(main_emotion.lower(), [])

    best_secondary = None
    best_score = -1

    # Find highest scoring allowed secondary emotion
    for emo in allowed:
        if emo in emo_classes:
            idx = emo_classes.index(emo)
            if emo_probs[idx] > best_score:
                best_score = emo_probs[idx]
                best_secondary = emo

    return {
        "main_emotion": main_emotion,
        "secondary_emotion": best_secondary,
        "confidence": round(conf, 3)
    }

"""# **Load Songs Dataset**"""

# Load song dataset from JSON file
with open(SONG_DATA_PATH, "r", encoding="utf-8") as f:
    songs = json.load(f)

print("Total songs loaded:", len(songs))


# Convert a value to float safely
def to_float(x):
    try:
        return float(x)
    except:
        return None

# Clamp a value between 0 and 1
def clamp01(x):
    return max(0.0, min(1.0, x))

# Normalize values from 0–100 to 0–1 if needed
def normalize_01(val):
    v = to_float(val)
    if v is None:
        return None
    if 0.0 <= v <= 1.0:
        return v
    if 0.0 <= v <= 100.0:
        return v / 100.0
    return None

# Convert tempo to a 0–1 scale
# If already normalized, keep it
# Otherwise treat it as BPM and map 60–200 BPM into 0–1
def tempo_to_01(val):
    v = to_float(val)
    if v is None:
        return None
    if 0.0 <= v <= 1.0:
        return v
    bpm = v
    return clamp01((bpm - 60.0) / (200.0 - 60.0))

# Build cleaned song list with normalized features
clean_songs = []
for s in songs:
    emo = (s.get("emotion") or "").strip().lower()
    title = (s.get("song") or "").strip()
    artist = (s.get("Artist(s)") or "").strip()

    # Skip songs with missing important fields
    if not emo or not title or not artist:
        continue

    # Normalize audio features
    e = normalize_01(s.get("Energy"))
    d = normalize_01(s.get("Danceability"))
    p = normalize_01(s.get("Positiveness"))
    t = tempo_to_01(s.get("Tempo"))

    # Skip songs if any required feature is missing
    if None in (e, d, p, t):
        continue

    # Store cleaned and normalized song
    clean_songs.append({
        "song": title,
        "Artist(s)": artist,
        "Genre": s.get("Genre", ""),
        "emotion": emo,
        "Energy": e,
        "Danceability": d,
        "Positiveness": p,
        "Tempo": t
    })

print("Clean songs ready:", len(clean_songs))

"""# **Audio Profile Mapping**"""

# Audio profile ranges for each fine-grained emotion
EMOTION_AUDIO_MAP = {

# ---------------- HAPPY FAMILY ----------------

"happiness": {"energy": (0.70,1.00), "tempo": (0.55,0.90), "danceability": (0.60,1.00), "positiveness": (0.75,1.00)},
"joy": {"energy": (0.75,1.00), "tempo": (0.60,0.95), "danceability": (0.65,1.00), "positiveness": (0.82,1.00)},
"gladness": {"energy": (0.60,0.90), "tempo": (0.50,0.80), "danceability": (0.60,0.92), "positiveness": (0.72,0.97)},
"cheerfulness": {"energy": (0.65,0.95), "tempo": (0.55,0.88), "danceability": (0.70,1.00), "positiveness": (0.80,1.00)},
"delight": {"energy": (0.60,0.90), "tempo": (0.52,0.82), "danceability": (0.62,0.95), "positiveness": (0.80,1.00)},
"amusement": {"energy": (0.62,0.92), "tempo": (0.55,0.85), "danceability": (0.72,1.00), "positiveness": (0.82,1.00)},
"enjoyment": {"energy": (0.58,0.88), "tempo": (0.50,0.78), "danceability": (0.62,0.92), "positiveness": (0.72,0.97)},
"elation": {"energy": (0.82,1.00), "tempo": (0.65,1.00), "danceability": (0.72,1.00), "positiveness": (0.88,1.00)},
"excitement": {"energy": (0.85,1.00), "tempo": (0.70,1.00), "danceability": (0.75,1.00), "positiveness": (0.80,1.00)},
"enthusiasm": {"energy": (0.78,1.00), "tempo": (0.60,0.95), "danceability": (0.65,1.00), "positiveness": (0.70,0.98)},
"pleasure": {"energy": (0.50,0.80), "tempo": (0.40,0.70), "danceability": (0.55,0.90), "positiveness": (0.72,0.98)},
"satisfaction": {"energy": (0.45,0.75), "tempo": (0.38,0.68), "danceability": (0.50,0.85), "positiveness": (0.65,0.92)},
"pride": {"energy": (0.65,0.95), "tempo": (0.50,0.80), "danceability": (0.50,0.82), "positiveness": (0.62,0.90)},
"triumph": {"energy": (0.80,1.00), "tempo": (0.65,0.95), "danceability": (0.55,0.90), "positiveness": (0.70,0.98)},
"bliss": {"energy": (0.45,0.75), "tempo": (0.35,0.65), "danceability": (0.45,0.78), "positiveness": (0.85,1.00)},
"optimism": {"energy": (0.55,0.85), "tempo": (0.45,0.78), "danceability": (0.55,0.90), "positiveness": (0.80,1.00)},
"love": {"energy": (0.35,0.70), "tempo": (0.30,0.60), "danceability": (0.40,0.75), "positiveness": (0.75,1.00)},
"affection": {"energy": (0.30,0.65), "tempo": (0.28,0.58), "danceability": (0.38,0.72), "positiveness": (0.70,0.95)},
"fondness": {"energy": (0.30,0.60), "tempo": (0.25,0.55), "danceability": (0.35,0.70), "positiveness": (0.65,0.92)},
"compassion": {"energy": (0.25,0.55), "tempo": (0.25,0.55), "danceability": (0.25,0.60), "positiveness": (0.60,0.85)},
"desire": {"energy": (0.40,0.80), "tempo": (0.35,0.75), "danceability": (0.55,0.95), "positiveness": (0.55,0.90)},
"passion": {"energy": (0.65,1.00), "tempo": (0.55,0.90), "danceability": (0.55,0.95), "positiveness": (0.60,0.90)},

# ---------------- SAD FAMILY (uplift gently) ----------------

"sadness": {"energy": (0.45,0.75), "tempo": (0.40,0.70), "danceability": (0.40,0.75), "positiveness": (0.55,0.85)},
"sorrow": {"energy": (0.35,0.65), "tempo": (0.30,0.60), "danceability": (0.30,0.65), "positiveness": (0.50,0.80)},
"grief": {"energy": (0.30,0.60), "tempo": (0.25,0.55), "danceability": (0.25,0.60), "positiveness": (0.50,0.78)},
"melancholy": {"energy": (0.30,0.60), "tempo": (0.25,0.55), "danceability": (0.25,0.60), "positiveness": (0.52,0.82)},
"loneliness": {"energy": (0.35,0.65), "tempo": (0.30,0.62), "danceability": (0.30,0.65), "positiveness": (0.52,0.82)},
"depression": {"energy": (0.40,0.70), "tempo": (0.35,0.65), "danceability": (0.30,0.65), "positiveness": (0.55,0.85)},
"despair": {"energy": (0.45,0.75), "tempo": (0.40,0.70), "danceability": (0.35,0.70), "positiveness": (0.55,0.88)},
"disappointment": {"energy": (0.45,0.75), "tempo": (0.40,0.70), "danceability": (0.35,0.70), "positiveness": (0.55,0.85)},
"hopelessness": {"energy": (0.45,0.75), "tempo": (0.40,0.70), "danceability": (0.35,0.70), "positiveness": (0.58,0.90)},
"suffering": {"energy": (0.45,0.75), "tempo": (0.40,0.70), "danceability": (0.35,0.70), "positiveness": (0.55,0.85)},
"distress": {"energy": (0.50,0.80), "tempo": (0.45,0.75), "danceability": (0.40,0.75), "positiveness": (0.55,0.88)},
"hurt": {"energy": (0.45,0.75), "tempo": (0.40,0.70), "danceability": (0.35,0.70), "positiveness": (0.55,0.85)},

# ---------------- ANGER FAMILY (calm & uplift) ----------------

"anger": {"energy": (0.35,0.60), "tempo": (0.35,0.60), "danceability": (0.45,0.70), "positiveness": (0.65,0.90)},
"rage": {"energy": (0.30,0.55), "tempo": (0.30,0.55), "danceability": (0.40,0.65), "positiveness": (0.65,0.92)},
"annoyance": {"energy": (0.35,0.60), "tempo": (0.35,0.60), "danceability": (0.45,0.70), "positiveness": (0.68,0.92)},
"irritation": {"energy": (0.35,0.60), "tempo": (0.35,0.60), "danceability": (0.42,0.68), "positiveness": (0.65,0.90)},
"frustration": {"energy": (0.35,0.62), "tempo": (0.35,0.62), "danceability": (0.40,0.68), "positiveness": (0.65,0.90)},
"resentment": {"energy": (0.30,0.55), "tempo": (0.30,0.55), "danceability": (0.38,0.65), "positiveness": (0.65,0.90)},
"hate": {"energy": (0.28,0.52), "tempo": (0.28,0.52), "danceability": (0.35,0.62), "positiveness": (0.68,0.92)},

# ---------------- FEAR FAMILY (calm & reassure) ----------------

"fear": {"energy": (0.25,0.50), "tempo": (0.30,0.55), "danceability": (0.35,0.60), "positiveness": (0.70,0.95)},
"anxiety": {"energy": (0.20,0.45), "tempo": (0.28,0.52), "danceability": (0.30,0.55), "positiveness": (0.72,0.98)},
"worry": {"energy": (0.18,0.42), "tempo": (0.25,0.50), "danceability": (0.28,0.55), "positiveness": (0.75,1.00)},
"nervousness": {"energy": (0.22,0.48), "tempo": (0.30,0.55), "danceability": (0.32,0.58), "positiveness": (0.72,0.98)},

# ---------------- SURPRISE FAMILY ----------------

"surprise": {"energy": (0.70,1.00), "tempo": (0.60,1.00), "danceability": (0.55,0.95), "positiveness": (0.60,0.95)},
"astonishment": {"energy": (0.65,0.95), "tempo": (0.55,0.95), "danceability": (0.50,0.90), "positiveness": (0.58,0.92)},
"amazement": {"energy": (0.70,1.00), "tempo": (0.60,1.00), "danceability": (0.55,0.95), "positiveness": (0.62,0.95)},
"shock": {"energy": (0.75,1.00), "tempo": (0.65,1.00), "danceability": (0.45,0.85), "positiveness": (0.55,0.90)},

# ---------------- DISGUST FAMILY (pleasant reset) ----------------

"disgust": {"energy": (0.40,0.65), "tempo": (0.40,0.65), "danceability": (0.45,0.75), "positiveness": (0.75,1.00)},
"displeasure": {"energy": (0.35,0.60), "tempo": (0.35,0.60), "danceability": (0.40,0.70), "positiveness": (0.70,0.95)},

# ---------------- NEUTRAL / BALANCED ----------------

"neutral": {"energy": (0.40,0.65), "tempo": (0.40,0.65), "danceability": (0.45,0.75), "positiveness": (0.60,0.85)},
"contentment": {"energy": (0.35,0.60), "tempo": (0.35,0.60), "danceability": (0.40,0.70), "positiveness": (0.70,0.95)},
"hope": {"energy": (0.45,0.75), "tempo": (0.40,0.70), "danceability": (0.40,0.75), "positiveness": (0.75,1.00)},
}

# Calculate how well a single value fits inside a range
def range_fit_score(x, lo, hi):
    # Return perfect score if inside range
    if lo <= x <= hi:
        return 1.0

    # Otherwise decay score smoothly based on distance
    width = max(1e-6, hi - lo)
    dist = min(abs(x - lo), abs(x - hi))
    return max(0.0, 1.0 - dist / width)

# Score a song using weighted audio feature matching
def song_score(song, ranges):
    s1 = range_fit_score(song["Energy"], *ranges["energy"])
    s2 = range_fit_score(song["Tempo"], *ranges["tempo"])
    s3 = range_fit_score(song["Danceability"], *ranges["danceability"])
    s4 = range_fit_score(song["Positiveness"], *ranges["positiveness"])

    # Weighted final score
    return 0.30*s1 + 0.25*s2 + 0.25*s3 + 0.20*s4

"""# **Filtered The Songs**"""

# Recommend songs for a predicted emotion
def recommend_songs(predicted_emotion, songs, top_n=10, sample_size=50000):
    emo = (predicted_emotion or "neutral").lower()

    # Fallback to neutral if emotion not found in map
    if emo not in EMOTION_AUDIO_MAP:
        emo = "neutral"

    ranges = EMOTION_AUDIO_MAP[emo]

    # First filter songs by matching dataset emotion label
    pool = [s for s in songs if s["emotion"] == emo]

    # If no songs for that emotion, use all songs
    if len(pool) == 0:
        pool = songs

    # Randomly sample from very large pools for speed
    if len(pool) > sample_size:
        pool = random.sample(pool, sample_size)

    # Score all songs
    scored = [(song_score(s, ranges), s) for s in pool]
    scored.sort(key=lambda x: x[0], reverse=True)

    # Return top N songs
    top = [s for _, s in scored[:top_n]]
    return top

"""# **Run Full Pipeline**"""

# Full pipeline from image path to recommended songs
def run_pipeline(image_path):

    # Detect face
    face = detect_face(image_path)
    if face is None:
        return {"error": "No face detected"}

    # Predict main emotion
    main_emotion, _, conf = predict_fer(face)

    # Predict fine-grained emotion probabilities
    emo_probs = predict_emo135(face)

    # Get valid secondary emotions
    allowed = EMOTION_CONSTRAINTS.get(main_emotion.lower(), [])

    best_secondary = None
    best_score = -1

    # Find best secondary emotion from allowed list
    for emo in allowed:
        if emo in emo_classes:
            idx = emo_classes.index(emo)
            if emo_probs[idx] > best_score:
                best_score = emo_probs[idx]
                best_secondary = emo

    # Use secondary emotion if available, otherwise main emotion
    final_emotion = best_secondary if best_secondary else main_emotion

    # Recommend songs using final emotion
    recommended = recommend_songs(final_emotion, clean_songs, top_n=10)

    return {
        "main_emotion": main_emotion,
        "secondary_emotion": best_secondary,
        "confidence": round(conf,3),
        "final_emotion_used": final_emotion,
        "recommended_songs": recommended
    }