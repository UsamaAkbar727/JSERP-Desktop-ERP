import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, LogOut, ChevronDown, Sun, Moon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface TopbarProps {
  title?: string;
}

export function Topbar({ title }: TopbarProps) {
  const { language, setLanguage, t, isRTL } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: 'Logged Out',
        description: 'You have been successfully logged out',
      });
      navigate('/login');
    } catch (error: any) {
      toast({
        title: 'Logout Failed',
        description: error.message || 'Failed to logout',
        variant: 'destructive',
      });
    }
  };

  return (
    <header className={cn(
      "h-14 md:h-16 bg-card/80 backdrop-blur-xl border-b border-border flex items-center justify-between px-3 md:px-6 sticky top-0 z-40",
      isRTL && "flex-row-reverse"
    )}>
      {/* Page Title */}
      <div className={cn(
        "flex items-center gap-2 md:gap-4 min-w-0 flex-1",
        isRTL && "text-right"
      )}>
        {title && <h2 className="text-base md:text-lg font-semibold text-foreground truncate">{title}</h2>}
      </div>

      {/* Right side actions */}
      <div className={cn(
        "flex items-center gap-1 md:gap-2",
        isRTL && "flex-row-reverse"
      )}>
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-8 w-8 md:h-9 md:w-9 rounded-lg"
        >
          {theme === 'light' ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
        </Button>

        {/* Language Toggle */}
        <div className="hidden sm:flex items-center bg-secondary rounded-lg p-0.5">
          <Button
            variant={language === 'en' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setLanguage('en')}
            className="h-7 md:h-8 px-2 md:px-3 text-xs font-medium rounded-md"
          >
            EN
          </Button>
          <Button
            variant={language === 'ur' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setLanguage('ur')}
            className="h-7 md:h-8 px-2 md:px-3 text-xs font-medium rounded-md"
          >
            اردو
          </Button>
        </div>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-1 md:gap-2 h-8 md:h-9 px-1 md:px-2 rounded-lg">
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <User className="h-3.5 w-3.5 md:h-4 md:w-4 text-white" />
              </div>
              <span className="text-xs md:text-sm font-medium hidden md:inline">{user?.name || 'User'}</span>
              <ChevronDown className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground hidden md:inline" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="w-56 bg-popover border border-border shadow-xl z-50">
            <DropdownMenuItem disabled className="cursor-default">
              <User className="h-4 w-4 mr-2" />
              <div className="flex flex-col">
                <span className="font-medium text-sm">{user?.name}</span>
                <span className="text-xs text-muted-foreground">{user?.email}</span>
              </div>
            </DropdownMenuItem>
            {user?.role && (
              <DropdownMenuItem disabled className="cursor-default">
                <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 capitalize">
                  {user.role.replace('_', ' ')}
                </span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              {t('logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
