type Song = {
  song: string;
  "Artist(s)": string;
  Genre: string;
  spotify_url?: string;
};

interface SongCardProps {
  song: Song;
  index: number;
}

// SongCard component displays one song item
export function SongCard({ song, index }: SongCardProps) {
  // Create a Spotify search URL using song name and artist name
  const spotifySearchUrl = `https://open.spotify.com/search/${encodeURIComponent(
    `${song.song} ${song["Artist(s)"]}`
  )}`;

  // Use direct Spotify URL if available, otherwise use search URL
  const playUrl = song.spotify_url || spotifySearchUrl;

  return (
    // Main card container with hover effect and fade-in animation
    <div
      className="glass-card flex items-center gap-4 p-4 hover:bg-accent/50 transition-all duration-200 group fade-in"
      style={{ animationDelay: `${index * 0.05}s`, opacity: 0 }}
    >
      {/* Song number */}
      <span className="w-6 text-center text-xs text-muted-foreground font-mono font-semibold">
        {index + 1}
      </span>

      {/* Song details section */}
      <div className="flex-1 min-w-0">
        {/* Song title */}
        <h3 className="text-sm font-bold text-foreground truncate">
          {song.song}
        </h3>

        {/* Artist name and genre */}
        <p className="text-xs text-foreground/90 truncate">
          {song["Artist(s)"]} • {song.Genre}
        </p>
      </div>

      {/* Spotify play/open button */}
      <a
        href={playUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 group-hover:opacity-100 hover:scale-110 transition-all duration-200 cursor-pointer"
        aria-label={`Play ${song.song} on Spotify`}
        title="Open in Spotify"
      >
        {/* Play icon */}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <path d="M3 1.5v11l9-5.5L3 1.5z" />
        </svg>
      </a>
    </div>
  );
}