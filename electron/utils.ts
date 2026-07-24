export const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';
export const isE2E = process.env.E2E === 'true';