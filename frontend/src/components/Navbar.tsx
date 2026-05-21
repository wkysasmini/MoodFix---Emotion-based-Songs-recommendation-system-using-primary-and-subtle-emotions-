import { Link } from "@tanstack/react-router";
import logoImg from "@/assets/moodfix-logo.png";

// Navbar component
export function Navbar() {
  return (
    // Fixed navigation bar at the top with blur background and bottom border
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      
      {/* Container for navbar content */}
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        
        {/* Logo and brand name link that navigates to /home */}
        <Link
          to="/home"
          className="flex items-center gap-2 text-foreground hover:opacity-80 transition-opacity"
        >
          {/* Logo image */}
          <img
            src={logoImg}
            alt="MoodFix logo"
            className="h-8 w-8 object-contain"
          />

          {/* Brand name */}
          <span className="text-lg font-bold tracking-tight">MoodFix</span>
        </Link>
      </div>
    </nav>
  );
}