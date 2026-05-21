export function Footer() {
  return (
    // Footer section with top border and padding
    <footer className="border-t border-border py-8 px-4 sm:px-6">
      
      {/* Container to center content and control layout */}
      <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Copyright text with current year */}
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} MoodFix. All rights reserved.
        </p>

        {/* Project description text */}
        <p className="text-xs text-muted-foreground font-bold">
          Emotion-Based Music Recommendation System
        </p>
      </div>
    </footer>
  );
}