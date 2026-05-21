import { createRouter, useRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// Default error page component
function DefaultErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  // Access router instance
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        {/* Error icon container */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-destructive"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            {/* Warning icon path */}
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>

        {/* Error heading */}
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Something went wrong
        </h1>

        {/* Error description */}
        <p className="mt-2 text-sm text-muted-foreground">
          An unexpected error occurred. Please try again.
        </p>

        {/* Show actual error message only in development mode */}
        {import.meta.env.DEV && error.message && (
          <pre className="mt-4 max-h-40 overflow-auto rounded-md bg-muted p-3 text-left font-mono text-xs text-destructive">
            {error.message}
          </pre>
        )}

        {/* Action buttons */}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => {
              // Refresh router data and reset error boundary
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>

          {/* Link back to home page */}
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

// Function to create and return the app router
export const getRouter = () => {
  const router = createRouter({
    routeTree, // Generated route tree
    context: {}, // Router context object
    scrollRestoration: true, // Restores scroll position on navigation
    defaultPreloadStaleTime: 0, // Disable stale preload cache
    defaultErrorComponent: DefaultErrorComponent, // Global error UI
  });

  return router;
};