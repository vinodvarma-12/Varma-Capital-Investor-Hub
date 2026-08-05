/** YouTube video ID (the part after watch?v=) for investor portal onboarding */
export const INVESTOR_ONBOARDING_YOUTUBE_ID = "04Z0Q4ZAJhE";

/** Portal is ready once staff has added at least one holding/investment for the investor. */
export function isInvestorPortalReady(investments) {
  return Array.isArray(investments) && investments.length > 0;
}

export function getYouTubeEmbedUrl(videoId) {
  if (!videoId) return null;
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;
}
