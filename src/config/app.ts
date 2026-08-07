export const appConfig = {
  name: "OURS",
  defaultLanguage: "zh-CN",
  thumbnailMaxEdge: 1200,
  /** Client-side compress before upload (avoids platform 413 body limits). */
  uploadMaxEdge: 2560,
  uploadTargetBytes: 3.5 * 1024 * 1024,
  signedUrlTtlSeconds: 3600,
  uploadConcurrency: 3,
} as const;
