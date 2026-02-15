"use client";

export function EditorLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="h-10 w-10 rounded-full border-2 border-muted-foreground/10 border-t-foreground/60 animate-spin" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-medium text-foreground/70 font-serif italic">
            Clarify
          </span>
          <span className="text-xs text-muted-foreground">
            Preparing your editor...
          </span>
        </div>
      </div>
    </div>
  );
}
