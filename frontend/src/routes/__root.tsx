import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";

// Component shown when user visits a page that does not exist
function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        {/* Error code */}
        <h1 className="text-7xl font-bold text-foreground">404</h1>

        {/* Error title */}
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>

        {/* Error description */}
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>

        {/* Button to go back to home page */}
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

// Root route configuration
export const Route = createRootRoute({
  head: () => ({
    // Meta information for the page
    meta: [
      { charSet: "utf-8" }, // Character encoding
      { name: "viewport", content: "width=device-width, initial-scale=1" }, // Responsive layout
      { title: "MoodFix — Emotion-Based Music Recommendations" }, // Page title
      {
        name: "description",
        content: "MoodFix detects your emotions and recommends music to uplift your mood.",
      }, // Page description
    ],

    // External links for the page
    links: [
      {
        rel: "stylesheet",
        href: appCss, // Main CSS file
      },
    ],
  }),

  shellComponent: RootShell, // Main HTML shell
  component: RootComponent, // Main route content
  notFoundComponent: NotFoundComponent, // 404 page
});

// Root shell that wraps the whole app
function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Inserts page head content like title, meta tags, links */}
        <HeadContent />
      </head>
      <body>
        {/* Main app content */}
        {children}

        {/* Injects required scripts */}
        <Scripts />
      </body>
    </html>
  );
}

// Main route component
function RootComponent() {
  // Renders child routes here
  return <Outlet />;
}