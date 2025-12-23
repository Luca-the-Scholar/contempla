import React from "react";

type AuthDebugPanelProps = {
  href: string;
  hash: string;
  hasAccessToken: boolean;
  isLoggedIn: boolean;
  userEmail: string | null;
  isNative: boolean;
  lastCheckedAt: string;
  lastError: string | null;
};

export function AuthDebugPanel({
  href,
  hash,
  hasAccessToken,
  isLoggedIn,
  userEmail,
  isNative,
  lastCheckedAt,
  lastError,
}: AuthDebugPanelProps) {
  return (
    <aside
      aria-label="Auth debug panel"
      className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-foreground/95 text-background backdrop-blur"
    >
      <div className="mx-auto w-full max-w-4xl p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="text-xs font-semibold tracking-wide">Auth Debug</div>
          <div className="text-[11px] font-mono opacity-80">{lastCheckedAt}</div>
        </div>

        <div className="mt-2 grid gap-2 text-[11px] leading-snug">
          <div className="grid grid-cols-[140px_1fr] gap-2">
            <div className="font-medium opacity-80">URL</div>
            <div className="font-mono break-all">{href || "(empty)"}</div>
          </div>

          <div className="grid grid-cols-[140px_1fr] gap-2">
            <div className="font-medium opacity-80">URL hash</div>
            <div className="font-mono break-all">{hash || "(empty)"}</div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="grid grid-cols-[140px_1fr] gap-2">
              <div className="font-medium opacity-80">access_token</div>
              <div className="font-mono">{hasAccessToken ? "yes" : "no"}</div>
            </div>

            <div className="grid grid-cols-[140px_1fr] gap-2">
              <div className="font-medium opacity-80">native</div>
              <div className="font-mono">{isNative ? "yes" : "no"}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="grid grid-cols-[140px_1fr] gap-2">
              <div className="font-medium opacity-80">logged in</div>
              <div className="font-mono">{isLoggedIn ? "yes" : "no"}</div>
            </div>

            <div className="grid grid-cols-[140px_1fr] gap-2">
              <div className="font-medium opacity-80">user email</div>
              <div className="font-mono break-all">{userEmail ?? "(none)"}</div>
            </div>
          </div>

          <div className="grid grid-cols-[140px_1fr] gap-2">
            <div className="font-medium opacity-80">last error</div>
            <div className="font-mono break-words">{lastError ?? "(none)"}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
