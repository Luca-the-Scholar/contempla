import { Capacitor } from '@capacitor/core';
import { RateApp } from 'capacitor-rate-app';

const REVIEW_STORAGE_KEY = 'contempla_review_state';
const SESSIONS_THRESHOLD = 50;

interface ReviewState {
  sessionCount: number;
  hasPrompted: boolean;
  lastPromptDate?: string;
}

function getReviewState(): ReviewState {
  try {
    const stored = localStorage.getItem(REVIEW_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (err) {
    console.warn('Failed to get review state:', err);
  }
  return { sessionCount: 0, hasPrompted: false };
}

function saveReviewState(state: ReviewState): void {
  try {
    localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Failed to save review state:', err);
  }
}

/**
 * Increment the session counter and check if we should prompt for review
 * Call this after each completed meditation session
 */
export async function incrementSessionAndCheckReview(): Promise<void> {
  // Only prompt on native platforms
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  const state = getReviewState();
  state.sessionCount++;
  
  // Check if we should prompt
  if (state.sessionCount >= SESSIONS_THRESHOLD && !state.hasPrompted) {
    await promptForReview();
    state.hasPrompted = true;
    state.lastPromptDate = new Date().toISOString();
  }
  
  saveReviewState(state);
}

/**
 * Prompt the user to rate the app
 * Uses native App Store / Play Store review prompt
 */
async function promptForReview(): Promise<void> {
  try {
    await RateApp.requestReview();
  } catch (err) {
    console.warn('Failed to request app review:', err);
  }
}

/**
 * Manually request a review (e.g., from settings)
 * Only works on native platforms
 */
export async function requestAppReview(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }
  
  try {
    await RateApp.requestReview();
    return true;
  } catch (err) {
    console.warn('Failed to request app review:', err);
    return false;
  }
}

/**
 * Check if we're running on a native platform
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Get current session count (for debugging/display)
 */
export function getSessionCount(): number {
  return getReviewState().sessionCount;
}
