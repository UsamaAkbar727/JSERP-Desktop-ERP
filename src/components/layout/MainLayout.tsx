import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { Topbar } from './Topbar';
import { useSidebar } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
}

export function MainLayout({ children, title }: MainLayoutProps) {
  const { collapsed } = useSidebar();

  return (
    <div className="h-screen w-full bg-background">
      <AppSidebar />
      <div className={cn(
        'flex flex-col h-screen overflow-hidden transition-all duration-300 ease-in-out',
        collapsed ? 'ml-[68px]' : 'ml-64'
      )}>
        <Topbar title={title} />
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
