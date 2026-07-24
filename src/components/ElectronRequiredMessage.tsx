import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Terminal, Zap } from 'lucide-react';

export function ElectronRequiredMessage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-2xl w-full space-y-6">
        <Alert variant="destructive" className="border-2">
          <AlertTriangle className="h-6 w-6" />
          <AlertTitle className="text-xl font-bold ml-2">
            Electron Environment Required
          </AlertTitle>
          <AlertDescription className="mt-4 space-y-4">
            <p>
              This application must run inside Electron to access the database and
              system features.
            </p>

            <div className="bg-destructive/10 p-4 rounded-lg space-y-3">
              <div className="flex items-start gap-3">
                <Terminal className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div className="space-y-2 flex-1">
                  <p className="font-semibold">To run the development version:</p>
                  <div className="bg-black/30 p-3 rounded font-mono text-sm">
                    npm run electron:dev
                  </div>
                  <p className="text-xs opacity-90">
                    This starts both Vite dev server and Electron with hot reload
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Zap className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div className="space-y-2 flex-1">
                  <p className="font-semibold">Alternative (faster reload):</p>
                  <div className="bg-black/30 p-3 rounded font-mono text-sm">
                    npm run electron:dev-reload
                  </div>
                  <p className="text-xs opacity-90">
                    Auto-restarts Electron when code changes are detected
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-destructive/20 pt-3 mt-4">
              <p className="text-sm">
                <strong>Note:</strong> Do not use <code className="bg-black/20 px-2 py-0.5 rounded">npm run dev</code> 
                {' '}alone as it only starts the web server without Electron.
              </p>
            </div>
          </AlertDescription>
        </Alert>

        <div className="text-center text-sm text-muted-foreground">
          <p>Need help? Check the README.md for detailed setup instructions.</p>
        </div>
      </div>
    </div>
  );
}
