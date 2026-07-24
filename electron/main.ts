import { app, BrowserWindow, Menu, dialog } from 'electron';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { initializeDatabase, closeDatabase, registerDatabaseHandlers, getDatabase } from './database';
import { initializeIPCHandlers, cleanupIPCHandlers } from './ipc';
import { startBackupScheduler } from './ipc/handlers/backup.js';

const isDev = !app.isPackaged;

// Suppress deprecation warnings from axios (harmless url.parse warning)
process.noDeprecation = true;

// Setup logging for production
const logFilePath = isDev ? null : join(app.getPath('userData'), 'app.log');

function log(message: string, ...args: any[]) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message} ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}`;
  
  console.log(logMessage);
  
  if (logFilePath && !isDev) {
    try {
      const logDir = join(app.getPath('userData'));
      if (!existsSync(logDir)) {
        mkdirSync(logDir, { recursive: true });
      }
      writeFileSync(logFilePath, logMessage + '\n', { flag: 'a' });
    } catch (err) {
      console.error('Failed to write log:', err);
    }
  }
}

function showErrorDialog(title: string, message: string) {
  dialog.showErrorBox(title, message);
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  log('Uncaught Exception:', error);
  
  // Check if it's a native module loading error
  const errorMsg = error.message || '';
  if (errorMsg.includes('better-sqlite3') || errorMsg.includes('.node')) {
    showErrorDialog(
      'Native Module Error', 
      `Failed to load native modules:\n\n${error.message}\n\nThis usually happens when the application was not built correctly.\n\nLog file: ${logFilePath || 'N/A'}\n\nPlease reinstall the application.`
    );
  } else {
    showErrorDialog('Application Error', `An unexpected error occurred:\n\n${error.message}\n\nPlease check the log file at:\n${logFilePath || 'N/A'}`);
  }
  
  app.quit();
});

process.on('unhandledRejection', (reason) => {
  log('Unhandled Rejection:', reason);
});

// Force a consistent userData location in dev/prod
if (process.platform === 'win32') {
  const appData = process.env.APPDATA || join(process.env.USERPROFILE || '', 'AppData', 'Roaming');
  app.setName('JSERP');
  app.setPath('userData', join(appData, 'JSERP'));
}


// Helper function to get the correct path for resources
function getResourcePath(relativePath: string): string {
  if (isDev) {
    return join(__dirname, relativePath);
  }
  // In production, app.getAppPath() returns the path to the resources directory
  return join(process.resourcesPath, 'app.asar', relativePath);
}

function createWindow(): void {
  // Create the browser window
  const mainWindow = new BrowserWindow({
    title: 'JSERP',
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    icon: isDev 
      ? join(__dirname, '../public/favicon.ico')
      : join(process.resourcesPath, 'app.asar', 'dist/favicon.ico'),
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  });

  // Add error logging for production debugging
  if (isDev) {
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('Failed to load:', errorCode, errorDescription);
    });
  }

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:8080');
    // Open the DevTools in development
    mainWindow.webContents.openDevTools();

    // Enable live reload for Electron in development
    if (process.env.NODE_ENV === 'development') {
      mainWindow.webContents.on('did-frame-finish-load', () => {
        if (isDev && mainWindow.webContents.getURL().includes('localhost')) {
          mainWindow.webContents.once('dom-ready', () => {
            // Dev reload tracking
          });
        }
      });
    }
  } else {
    // Production: Load from packaged files
    // Use process.resourcesPath for correct asar handling with spaces in path
    const indexPath = join(process.resourcesPath, 'app.asar', 'dist', 'index.html');
    mainWindow.loadFile(indexPath).catch(err => {
      // Log to file in production
      if (isDev) console.error('Failed to load index.html:', err);
    });
  }


// if (isDev) {
//   // DEV MODE
//   mainWindow.loadURL('http://localhost:8080');
//   mainWindow.webContents.openDevTools();
// } else {
//   // PACKAGED APP ONLY
//   const indexPath = join(
//     process.resourcesPath,
//     'app.asar',
//     'dist',
//     'index.html'
//   );

//   mainWindow.loadFile(indexPath).catch(err => {
//     console.error('❌ Failed to load index.html:', err);
//   });
// }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();

    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Set up the menu
  if (process.platform === 'darwin') {
    // macOS menu
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'JSERP',
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectAll' }
        ]
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      },
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' },
          { role: 'close' }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  } else {
    // Windows/Linux menu
    Menu.setApplicationMenu(null);
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows
app.whenReady().then(async () => {
  log('App is ready, starting initialization...');
  log('Environment:', isDev ? 'development' : 'production');
  log('App path:', app.getAppPath());
  log('User data path:', app.getPath('userData'));
  log('Resources path:', process.resourcesPath);
  
  try {
    log('Initializing database...');
    // Initialize database
    await initializeDatabase({
      verbose: isDev, // Enable verbose logging in development
      version: 25, // Latest migration version (invoice number formats)
    });
    log('Database initialized successfully');

    // Register database IPC handlers
    log('Registering database handlers...');
    registerDatabaseHandlers();

    // Initialize IPC handlers for repositories
    const dbManager = getDatabase();
    const db = dbManager.getDatabase();
    const dbPath = dbManager.getPath();
    log('Database path:', dbPath);
    
    // Database initialization successful
    log('Initializing IPC handlers...');
    await initializeIPCHandlers(db, dbPath);

    // Seed default data if needed
    log('Seeding database...');
    const { seedDatabase } = await import('./database/seed');
    const { createRepositories } = await import('./database/repositories');
    const repos = createRepositories(db);
    await seedDatabase(db, repos);
    log('Database seeding complete');

    // Start backup scheduler
    log('Starting backup scheduler...');
    await startBackupScheduler();
    log('Backup scheduler started');

    // Create main window
    log('Creating main window...');
    createWindow();
    log('Main window created successfully');

    app.on('activate', () => {
      // On macOS, re-create a window when the dock icon is clicked
      if (BrowserWindow.getAllWindows().length === 0) {
        log('Reactivating app, creating window...');
        createWindow();
      }
    });
  } catch (error) {
    log('FATAL: Failed to initialize application:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : '';
    log('Error stack:', stack);
    
    showErrorDialog(
      'Application Initialization Failed',
      `JSERP failed to start:\n\n${errorMessage}\n\nLog file: ${logFilePath || 'N/A'}\n\nIf the problem persists, try reinstalling the application.`
    );
    
    app.quit();
  }
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Clean up IPC handlers
    cleanupIPCHandlers();
    // Close database before quitting
    closeDatabase();
    app.quit();
  }
});

// Clean up database on app quit
app.on('before-quit', () => {
  cleanupIPCHandlers();
  closeDatabase();
});

// Security: Prevent new window creation
app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
});