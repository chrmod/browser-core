import platform from 'platform/platform';

export function notImplemented() {
  throw new Error('Not implemented');
}

export let isFirefox = platform.isFirefox;
export let isMobile = platform.isMobile;
export let platformName = platform.platformName;