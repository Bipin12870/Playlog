export function isModerationError(error: unknown) {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  return message.includes('CONTENT_BLOCKED_BY_MODERATION');
}

export function getFriendlyModerationMessage(error: unknown, fallback?: string) {
  const defaultFallback = fallback ?? 'Unable to process this request right now.';
  if (isModerationError(error)) {
    return 'This submission was blocked by our moderation filters. Please adjust the wording and try again.';
  }
  if (error instanceof Error) {
    return error.message || defaultFallback;
  }
  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }
  return defaultFallback;
}
