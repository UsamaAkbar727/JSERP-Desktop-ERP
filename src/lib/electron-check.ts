/**
 * Electron Environment Check
 * Ensures the application is running in Electron with proper API access
 */

export function isElectronEnvironment(): boolean {
  const isElectron = typeof window !== 'undefined' && window.api !== undefined;
    return isElectron;
}

export function requireElectronAPI(): void {
  if (!isElectronEnvironment()) {
    console.error('[Electron Check] FAILED: Electron environment not detected');
    console.error('[Electron Check] window.api:', typeof window !== 'undefined' ? window.api : 'window is undefined');
    const errorMessage = `
╔═══════════════════════════════════════════════════════════════════════╗
║                      ELECTRON ENVIRONMENT REQUIRED                     ║
╠═══════════════════════════════════════════════════════════════════════╣
║                                                                        ║
║  This application requires Electron to run properly.                  ║
║                                                                        ║
║  Please use one of these commands:                                    ║
║                                                                        ║
║    npm run electron:dev      - Development mode with hot reload       ║
║    npm run electron          - Development mode (Vite must be running)║
║    npm run dist              - Build production app                   ║
║                                                                        ║
║  Do NOT use: npm run dev (runs Vite only without Electron)           ║
║                                                                        ║
╚═══════════════════════════════════════════════════════════════════════╝
    `;
    
    console.error(errorMessage);
    throw new Error('Electron API not available. Please run the application using electron:dev or electron:dev-reload.');
  }
}

export function getElectronAPI() {
  requireElectronAPI();
    return window.api;
}
