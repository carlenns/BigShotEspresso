import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Shared "couldn't load" state for list pages (PL-2). Uses an icon + text, not
 * colour alone, so it reads for colour-blind users too.
 */
export function QueryErrorState({
  what,
  error,
  onRetry,
}: {
  what: string;
  error?: unknown;
  onRetry?: () => void;
}) {
  const detail = error instanceof Error && error.message ? error.message : null;
  return (
    <div
      role="alert"
      className="col-span-full flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center"
    >
      <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
      <div>
        <p className="font-medium">Couldn't load {what}.</p>
        <p className="text-sm text-muted-foreground">
          {detail ?? "The server didn't respond as expected."} Your saved data is unchanged.
        </p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5">
          <RotateCw className="h-3.5 w-3.5" /> Try again
        </Button>
      )}
    </div>
  );
}
