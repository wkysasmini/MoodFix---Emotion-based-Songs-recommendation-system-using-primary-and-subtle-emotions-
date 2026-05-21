import { createFileRoute, Link } from "@tanstack/react-router";
import splashBg from "@/assets/splash-bg.jpg";
import logoImg from "@/assets/moodfix-logo.png";

// Define the root route for the splash page
export const Route = createFileRoute("/")({
  component: SplashPage,
  head: () => ({
    meta: [
      { title: "MoodFix — Emotion-Based Music Recommendations" },
      {
        name: "description",
        content:
          "MoodFix detects your emotions through facial recognition and recommends music to uplift your mood.",
      },
      { property: "og:title", content: "MoodFix — Feel the Music" },
      {
        property: "og:description",
        content:
          "AI-powered emotion detection meets personalized music recommendations.",
      },
    ],
  }),
});

// Main splash page component
function SplashPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      {/* Full-page background image */}
      <div className="absolute inset-0">
        <img
          src={splashBg}
          alt="Background"
          className="h-full w-full object-cover opacity-60"
          width={1920}
          height={1080}
        />

        {/* Dark gradient overlay on top of background */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
      </div>

      {/* Main content area */}
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        {/* App logo */}
        <div className="mb-8 slide-up" style={{ opacity: 0 }}>
          <img
            src={logoImg}
            alt="MoodFix logo"
            className="h-40 w-40 object-contain sm:h-52 sm:w-52"
          />
        </div>

        {/* App title */}
        <h1
          className="mb-4 text-5xl font-bold tracking-tight text-foreground sm:text-7xl slide-up stagger-1"
          style={{ opacity: 0 }}
        >
          MoodFix
        </h1>

        {/* Short tagline */}
        <p
          className="mb-3 max-w-lg text-lg text-muted-foreground sm:text-xl slide-up stagger-2 font-bold"
          style={{ opacity: 0 }}
        >
          Your mood. Your music. Perfectly matched.
        </p>

        {/* Description text */}
        <p
          className="mb-10 max-w-md text-sm leading-relaxed text-muted-foreground/80 slide-up stagger-3 font-bold"
          style={{ opacity: 0 }}
        >
          MoodFix uses AI to detect your{" "}
          <span className="text-foreground font-medium">primary</span> and{" "}
          <span className="text-foreground font-medium">secondary emotions</span>{" "}
          through facial recognition, then curates the perfect{" "}
          <span className="text-foreground font-medium">playlist</span>{" "}to{" "}
          <span className="text-foreground font-medium">uplift mood</span>{" "}
          of yours.
        </p>

        {/* Feature highlight pills */}
        <div
          className="mb-4 flex flex-wrap items-center justify-center gap-10 slide-up stagger-4 font-bold"
          style={{ opacity: 0 }}
        >
          <FeaturePill icon="🎭" text="Emotion Detection" />
          <FeaturePill icon="🎵" text="Smart Recommendations" />
          <FeaturePill icon="✨" text="Mood Uplift" />
        </div>

        {/* Button to go to home page */}
        <Link
          to="/home"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-lg transition-all duration-300 hover:bg-primary/90 hover:shadow-xl slide-up stagger-5"
          style={{ opacity: 0 }}
        >
          Get Started

          {/* Arrow icon */}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path
              d="M6 3l5 5-5 5"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>

      {/* Footer text */}
      <div className="absolute bottom-6 z-10 text-xs text-muted-foreground/50">
        © {new Date().getFullYear()} MoodFix. All rights reserved.
      </div>
    </div>
  );
}

// Reusable feature badge component
function FeaturePill({ icon, text }: { icon: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-xs font-medium text-surface-foreground">
      {/* Feature icon */}
      <span>{icon}</span>

      {/* Feature text */}
      {text}
    </span>
  );
}