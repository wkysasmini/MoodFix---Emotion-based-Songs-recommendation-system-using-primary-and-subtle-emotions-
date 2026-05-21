import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useCallback, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SongCard } from "@/components/SongCard";
import WebcamCapture from "@/components/WebcamCapture";

// Define the /home route
export const Route = createFileRoute("/home")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "Home — MoodFix" },
      {
        name: "description",
        content:
          "Upload your photo or use your webcam to detect emotions and get personalized music recommendations.",
      },
    ],
  }),
});

// Tab options for switching between upload and webcam
type Tab = "upload" | "webcam";

// Song data type
type Song = {
  song: string;
  "Artist(s)": string;
  Genre: string;
  emotion: string;
};

// Detected emotion data type
type DetectedEmotion = {
  main: string;
  secondary: string | null;
  confidence: number;
};

// API response type for prediction
type PredictResponse = {
  main_emotion?: string;
  secondary_emotion?: string | null;
  confidence?: number;
  final_emotion_used?: string;
  recommended_songs?: Song[];
  error?: string;
};

// API response type for search
type SearchResponse = {
  query?: string;
  results?: Song[];
  error?: string;
};

// API response type for random songs
type RandomSongsResponse = {
  results?: Song[];
  error?: string;
};

// Base URL for backend API from environment variable
const API_BASE = import.meta.env.VITE_API_BASE;

// Main home page component
function HomePage() {
  // State for active tab
  const [activeTab, setActiveTab] = useState<Tab>("upload");

  // State for displayed songs
  const [songs, setSongs] = useState<Song[]>([]);

  // State for search input
  const [searchQuery, setSearchQuery] = useState("");

  // State for detected emotion result
  const [detectedEmotion, setDetectedEmotion] = useState<DetectedEmotion | null>(null);

  // State for uploaded image preview
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  // State for webcam captured image preview
  const [webcamImage, setWebcamImage] = useState<string | null>(null);

  // State for loading while analyzing image
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // State for song section title
  const [songListTitle, setSongListTitle] = useState("Trending Now");

  // Reference to hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load random songs from backend
  const loadRandomSongs = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/songs/random?limit=12`);
      const data: RandomSongsResponse = await res.json();

      // Throw error if response is not successful
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to load songs");
      }

      // Save songs and update title
      setSongs(data.results || []);
      setSongListTitle("Trending Now");
    } catch (error) {
      console.error("Random songs load error:", error);
    }
  }, []);

  // Load random songs when page first opens
  useEffect(() => {
    void loadRandomSongs();
  }, [loadRandomSongs]);

  // Analyze uploaded image file
  const analyzeUploadedFile = useCallback(async (file: File, previewImage: string) => {
    setUploadedImage(previewImage);
    setWebcamImage(null);
    setIsAnalyzing(true);
    setDetectedEmotion(null);

    try {
      // Create form data for file upload
      const formData = new FormData();
      formData.append("image", file);

      // Send uploaded file to backend
      const res = await fetch(`${API_BASE}/predict`, {
        method: "POST",
        body: formData,
      });

      const data: PredictResponse = await res.json();

      // Throw error if prediction failed
      if (!res.ok || data.error) {
        throw new Error(data.error || "Prediction failed");
      }

      // Save detected emotion
      setDetectedEmotion({
        main: data.main_emotion || "Unknown",
        secondary: data.secondary_emotion ?? null,
        confidence: data.confidence ?? 0,
      });

      // Save recommended songs
      setSongs(data.recommended_songs || []);

      // Update song section title
      setSongListTitle(
        `Recommended for ${data.main_emotion}${
          data.secondary_emotion ? ` — ${data.secondary_emotion}` : ""
        }`
      );
    } catch (error) {
      console.error("Upload prediction error:", error);
      alert(error instanceof Error ? error.message : "Could not connect to backend");
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // Handle file input change
  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();

      // Read file as base64 for preview
      reader.onload = async (ev) => {
        const data = ev.target?.result as string;
        await analyzeUploadedFile(file, data);
      };

      reader.readAsDataURL(file);
    },
    [analyzeUploadedFile]
  );

  // Analyze webcam captured image
  const analyzeWebcamImage = useCallback(async (imageData: string) => {
    setWebcamImage(imageData);
    setUploadedImage(null);
    setIsAnalyzing(true);
    setDetectedEmotion(null);

    try {
      // Send webcam image data to backend
      const res = await fetch(`${API_BASE}/predict_webcam`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image_data: imageData }),
      });

      const data: PredictResponse = await res.json();

      // Throw error if prediction failed
      if (!res.ok || data.error) {
        throw new Error(data.error || "Prediction failed");
      }

      // Save detected emotion
      setDetectedEmotion({
        main: data.main_emotion || "Unknown",
        secondary: data.secondary_emotion ?? null,
        confidence: data.confidence ?? 0,
      });

      // Save recommended songs
      setSongs(data.recommended_songs || []);

      // Update song section title
      setSongListTitle(
        `Recommended for ${data.main_emotion}${
          data.secondary_emotion ? ` — ${data.secondary_emotion}` : ""
        }`
      );
    } catch (error) {
      console.error("Webcam prediction error:", error);
      alert(error instanceof Error ? error.message : "Could not connect to backend");
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // Handle song search
  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const trimmedQuery = searchQuery.trim();

      // If search box is empty, reload default songs
      if (!trimmedQuery) {
        void loadRandomSongs();
        return;
      }

      try {
        // Search songs from backend
        const res = await fetch(
          `${API_BASE}/search?query=${encodeURIComponent(trimmedQuery)}`
        );

        const data: SearchResponse = await res.json();

        // Throw error if search failed
        if (!res.ok || data.error) {
          throw new Error(data.error || "Search failed");
        }

        // Save search results
        setSongs(data.results || []);
        setSongListTitle(`Search results for "${trimmedQuery}"`);
      } catch (error) {
        console.error("Search error:", error);
        alert(error instanceof Error ? error.message : "Could not connect to backend");
      }
    },
    [searchQuery, loadRandomSongs]
  );

  // Reset page back to default state
  const resetToDefault = useCallback(() => {
    setDetectedEmotion(null);
    setUploadedImage(null);
    setWebcamImage(null);
    setSearchQuery("");
    setIsAnalyzing(false);

    // Clear selected file from input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    // Reload random songs
    void loadRandomSongs();
  }, [loadRandomSongs]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top navigation bar */}
      <Navbar />

      <main className="flex-1 pt-16">
        {/* Hero section */}
        <section className="border-b border-border py-6 sm:py-8 px-4 sm:px-6">
          <div className="mx-auto max-w-4xl text-center">
            <h1
              className="text-3xl font-bold tracking-tight sm:text-4xl mb-2 fade-in"
              style={{ opacity: 0 }}
            >
              How are you feeling?
            </h1>
            <p
              className="text-muted-foreground text-sm sm:text-base fade-in stagger-1 font-semibold"
              style={{ opacity: 0 }}
            >
              Upload a photo or use your webcam — we'll find the perfect music for your mood.
            </p>
          </div>
        </section>

        {/* Main content area */}
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
          <div className="grid gap-8 lg:grid-cols-5">
            {/* Left panel */}
            <div className="lg:col-span-2 space-y-6">
              {/* Upload/Webcam tab buttons */}
              <div className="flex rounded-xl border border-border bg-surface overflow-hidden">
                <button
                  onClick={() => setActiveTab("upload")}
                  className={`flex-1 py-2.5 text-sm font-medium transition-all cursor-pointer ${
                    activeTab === "upload"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground font-semibold"
                  }`}
                >
                  Upload Image
                </button>
                <button
                  onClick={() => setActiveTab("webcam")}
                  className={`flex-1 py-2.5 text-sm font-medium transition-all cursor-pointer ${
                    activeTab === "webcam"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground font-semibold"
                  }`}
                >
                  Webcam
                </button>
              </div>

              {/* Upload or webcam card */}
              <div className="glass-card p-6">
                {activeTab === "upload" ? (
                  <div className="flex flex-col items-center gap-4">
                    {uploadedImage ? (
                      // Show uploaded image preview
                      <div className="relative w-full max-w-xs aspect-square rounded-xl overflow-hidden border border-border">
                        <img
                          src={uploadedImage}
                          alt="Uploaded face"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      // Upload button area
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex w-full max-w-xs aspect-square flex-col items-center justify-center rounded-xl border-2 border-dashed border-border hover:border-muted-foreground transition-colors cursor-pointer"
                      >
                        <svg
                          className="mb-3 text-muted-foreground"
                          width="48"
                          height="48"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17,8 12,3 7,8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <span className="text-sm text-muted-foreground font-bold">
                          Click to upload
                        </span>
                        <span className="text-xs text-muted-foreground/60 mt-1 font-semibold">
                          JPG, PNG supported
                        </span>
                      </button>
                    )}

                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    {/* Button to upload another image */}
                    {uploadedImage && (
                      <button
                        onClick={resetToDefault}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer font-bold"
                      >
                        Upload another image
                      </button>
                    )}
                  </div>
                ) : (
                  // Webcam capture component
                  <WebcamCapture onCapture={analyzeWebcamImage} capturedImage={webcamImage} />
                )}
              </div>

              {/* Emotion detection result or loading */}
              {(isAnalyzing || detectedEmotion) && (
                <div className="glass-card p-6 fade-in" style={{ opacity: 0 }}>
                  {isAnalyzing ? (
                    <div className="flex flex-col items-center gap-3 py-4">
                      <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      <p className="text-sm text-muted-foreground font-bold">
                        Analyzing your expression...
                      </p>
                    </div>
                  ) : detectedEmotion ? (
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground font-bold">
                        Detected Emotion
                      </h3>

                      <div className="flex items-center gap-3">
                        {/* Emotion emoji */}
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-2xl">
                          {getEmoji(detectedEmotion.main)}
                        </div>

                        {/* Emotion labels */}
                        <div>
                          <p className="text-xl font-bold text-foreground">
                            {detectedEmotion.main}
                          </p>
                          {detectedEmotion.secondary && (
                            <p className="text-sm text-muted-foreground font-bold">
                              Secondary:{" "}
                              <span className="text-foreground">
                                {detectedEmotion.secondary}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Confidence progress bar */}
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-foreground transition-all duration-700"
                            style={{ width: `${detectedEmotion.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">
                          {(detectedEmotion.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Right panel */}
            <div className="lg:col-span-3 space-y-6">
              {/* Search form */}
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>

                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search songs, artists, or genres..."
                    className="h-10 w-full rounded-xl border border-border bg-surface pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>

                <button
                  type="submit"
                  className="h-10 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer"
                >
                  Search
                </button>
              </form>

              {/* Song list section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-foreground">{songListTitle}</h2>

                  {/* Clear button */}
                  {(detectedEmotion || searchQuery || uploadedImage || webcamImage || songs.length > 0) && (
                    <button
                      onClick={resetToDefault}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer font-bold"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Song results */}
                {songs.length > 0 ? (
                  <div className="space-y-2">
                    {songs.map((song, i) => (
                      <SongCard
                        key={`${song.song}-${song["Artist(s)"]}-${i}`}
                        song={song}
                        index={i}
                      />
                    ))}
                  </div>
                ) : (
                  // Empty state
                  <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
                    <p className="text-muted-foreground text-sm font-bold">No songs to show yet</p>
                    <p className="mt-1 text-xs text-muted-foreground/70 font-bold">
                      Upload an image, use your webcam, or search for songs.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer section */}
      <Footer />
    </div>
  );
}

// Return emoji based on detected emotion
function getEmoji(emotion: string): string {
  const map: Record<string, string> = {
    happy: "😊",
    happiness: "😊",
    joy: "😊",
    sad: "😢",
    sadness: "😢",
    angry: "😠",
    anger: "😠",
    fear: "😨",
    surprise: "😲",
    disgust: "🤢",
    neutral: "😐",
  };

  return map[emotion.toLowerCase()] || "🎵";
}