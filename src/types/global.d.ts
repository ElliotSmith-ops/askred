export {};

declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event',
      idOrEventName: string,
      params?: Record<string, unknown>
    ) => void;
  }
}