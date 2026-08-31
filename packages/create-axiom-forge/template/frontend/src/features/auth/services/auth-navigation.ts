import { AUTH_API_PATHS } from "@auth/constants";

export const navigateToGoogleStart = (assign: (url: string) => void = (url) => { globalThis.window.location.assign(url); }): void => {
  assign(AUTH_API_PATHS.googleStart);
};

export const navigateToMagicConsume = (token: string, assign: (url: string) => void = (url) => { globalThis.window.location.assign(url); }): void => {
  assign(`${AUTH_API_PATHS.magicLinkConsume}?token=${encodeURIComponent(token)}`);
};
