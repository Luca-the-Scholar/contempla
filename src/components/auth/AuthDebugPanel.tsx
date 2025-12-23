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
  // New bounce debug props
  showReturnToApp?: boolean;
  bounceDeepLink?: string | null;
};

// Compute Safari bounce eligibility
function computeBounceInfo() {
  const hostname = window.location.hostname;
  const hash = window.location.hash;
  const hasTokens = hash.includes("access_token") && hash.includes("refresh_token");
  const isPublishedDomain = hostname.includes("lovable.app");
  const isPreviewDomain = hostname.includes("lovableproject.com");
  
  // We can't reliably check Capacitor.isNativePlatform() here in Safari
  // because Safari won't have Capacitor. So we infer: if we're on a web domain
  // and NOT in a native context, the isNative would be false.
  // For debug purposes, we show what the logic WOULD compute.
  
  return {
    hostname,
    hasTokens,
    isPublishedDomain,
    isPreviewDomain,
    shouldBounce: hasTokens && (isPublishedDomain || isPreviewDomain),
  };
}

export function AuthDebugPanel({
  href,
  hash,
  hasAccessToken,
  isLoggedIn,
  userEmail,
  isNative,
  lastCheckedAt,
  lastError,
  showReturnToApp,
  bounceDeepLink,
}: AuthDebugPanelProps) {
  const bounceInfo = computeBounceInfo();
  const hashPreview = hash ? (hash.length > 60 ? hash.substring(0, 60) + "..." : hash) : "(empty)";

  return (
    <aside
      aria-label="Auth debug panel"
      className="fixed inset-x-0 top-0 z-50 border-b-2 border-yellow-500 bg-black text-white"
      style={{ maxHeight: "50vh", overflowY: "auto" }}
    >
      <div className="mx-auto w-full max-w-4xl p-3">
        <div className="flex items-start justify-between gap-3 border-b border-yellow-500/50 pb-2 mb-2">
          <div className="text-sm font-bold text-yellow-400">🔧 AUTH DEBUG PANEL</div>
          <div className="text-[10px] font-mono text-yellow-300">{lastCheckedAt}</div>
        </div>

        <div className="grid gap-1.5 text-[11px] leading-snug">
          {/* BIG BOUNCE READY INDICATOR */}
          <div className={`rounded p-3 border-2 ${
            bounceInfo.shouldBounce && !isNative 
              ? "bg-green-900 border-green-400" 
              : "bg-red-900 border-red-400"
          }`}>
            <div className={`text-center text-lg font-bold ${
              bounceInfo.shouldBounce && !isNative ? "text-green-400" : "text-red-400"
            }`}>
              {bounceInfo.shouldBounce && !isNative 
                ? "🟢 READY TO BOUNCE: YES" 
                : "🔴 READY TO BOUNCE: NO"}
            </div>
          </div>

          {/* Bounce Detection Section */}
          <div className="bg-yellow-900/30 rounded p-2 border border-yellow-600/50">
            <div className="font-bold text-yellow-400 mb-1">Safari Bounce Detection</div>
            <div className="grid gap-1">
              <div className="flex justify-between">
                <span className="text-yellow-200">hostname:</span>
                <span className="font-mono text-white">{bounceInfo.hostname}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-yellow-200">tokens in hash:</span>
                <span className={`font-mono ${bounceInfo.hasTokens ? "text-green-400" : "text-red-400"}`}>
                  {bounceInfo.hasTokens ? "YES ✓" : "NO ✗"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-yellow-200">isPublishedDomain (lovable.app):</span>
                <span className={`font-mono ${bounceInfo.isPublishedDomain ? "text-green-400" : "text-gray-400"}`}>
                  {bounceInfo.isPublishedDomain ? "YES ✓" : "no"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-yellow-200">isPreviewDomain (lovableproject.com):</span>
                <span className={`font-mono ${bounceInfo.isPreviewDomain ? "text-green-400" : "text-gray-400"}`}>
                  {bounceInfo.isPreviewDomain ? "YES ✓" : "no"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-yellow-200">isNative (Capacitor):</span>
                <span className={`font-mono ${isNative ? "text-blue-400" : "text-green-400"}`}>
                  {isNative ? "YES (native app)" : "NO (Safari/browser)"}
                </span>
              </div>
              <div className="flex justify-between border-t border-yellow-600/50 pt-1 mt-1">
                <span className="text-yellow-200 font-bold">→ SHOULD SHOW BOUNCE:</span>
                <span className={`font-mono font-bold ${bounceInfo.shouldBounce && !isNative ? "text-green-400" : "text-red-400"}`}>
                  {bounceInfo.shouldBounce && !isNative ? "YES ✓" : "NO ✗"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-yellow-200">showReturnToApp state:</span>
                <span className={`font-mono ${showReturnToApp ? "text-green-400" : "text-red-400"}`}>
                  {showReturnToApp ? "TRUE ✓" : "FALSE ✗"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-yellow-200">bounceDeepLink set:</span>
                <span className={`font-mono ${bounceDeepLink ? "text-green-400" : "text-gray-400"}`}>
                  {bounceDeepLink ? `YES (${bounceDeepLink.length} chars)` : "no"}
                </span>
              </div>
              {/* Show deep link preview */}
              {bounceDeepLink && (
                <div className="border-t border-yellow-600/50 pt-1 mt-1">
                  <span className="text-yellow-200">Deep link preview:</span>
                  <div className="font-mono text-[9px] text-white break-all mt-1">
                    {bounceDeepLink.substring(0, 60)}...
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* URL Info */}
          <div className="bg-gray-800/50 rounded p-2">
            <div className="font-bold text-gray-300 mb-1">URL Info</div>
            <div className="grid gap-1">
              <div>
                <span className="text-gray-400">hash (first 60):</span>
                <div className="font-mono text-xs break-all text-white">{hashPreview}</div>
              </div>
            </div>
          </div>

          {/* Auth State */}
          <div className="bg-blue-900/30 rounded p-2">
            <div className="font-bold text-blue-300 mb-1">Auth State</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex justify-between">
                <span className="text-blue-200">logged in:</span>
                <span className={`font-mono ${isLoggedIn ? "text-green-400" : "text-gray-400"}`}>
                  {isLoggedIn ? "yes" : "no"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-200">email:</span>
                <span className="font-mono text-white text-[10px]">{userEmail ?? "(none)"}</span>
              </div>
            </div>
          </div>

          {/* Errors */}
          {lastError && (
            <div className="bg-red-900/30 rounded p-2 border border-red-600/50">
              <div className="font-bold text-red-400 mb-1">Last Error</div>
              <div className="font-mono text-xs text-red-200 break-words">{lastError}</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
