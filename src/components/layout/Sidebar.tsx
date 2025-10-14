'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  MessageSquare, 
  Send, 
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  User,
  LogOut,
  MessageCircle,
  Bot
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarProps {
  children: React.ReactNode;
}

const navigation = [
  {
    name: 'Templates',
    href: '/',
    icon: MessageSquare,
    description: 'Manage WhatsApp templates'
  },
  {
    name: 'Campaigns',
    href: '/campaigns',
    icon: Send,
    description: 'Create and manage campaigns'
  },
  {
    name: 'Messages',
    href: '/messages',
    icon: MessageCircle,
    description: 'View message history'
  },
  {
    name: 'Prompts',
    href: '/prompts',
    icon: Bot,
    description: 'Manage GPT prompts'
  }
];

function UserInfo({ collapsed }: { collapsed: boolean }) {
  const { user, signOut } = useAuth();

  const getUserDisplayName = () => {
    if (!user?.email) return 'User';
    const name = user.user_metadata?.full_name || 
                 user.user_metadata?.first_name || 
                 user.email.split('@')[0];
    return name;
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (collapsed) {
    return (
      <div className="p-4 border-t border-border">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-primary-foreground" />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="p-2"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border-t border-border">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
          <User className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{getUserDisplayName()}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleSignOut}
        className="w-full gap-2"
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </Button>
    </div>
  );
}

export default function Sidebar({ children }: SidebarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-gray-900 border-r border-border transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Header */}
        <div className={cn(
          "flex items-center p-4 border-b border-border",
          collapsed ? "justify-center" : "justify-between"
        )}>
          {collapsed ? (
            <MessageSquare className="h-8 w-8 text-green-600" />
          ) : (
            <div className="flex items-center gap-2">
              <MessageSquare className="h-8 w-8 text-green-600" />
              <h1 className="text-xl font-bold">WhatsApp Scheduler</h1>
            </div>
          )}
          
          {/* Collapse toggle - desktop only */}
          {!collapsed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}

          {/* Expand toggle when collapsed - desktop only */}
          {collapsed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex absolute top-4 right-2"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}

          {/* Close button - mobile only */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center rounded-md text-sm font-medium transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  collapsed ? "justify-center px-3 py-3" : "gap-3 px-3 py-2",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground"
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && (
                  <div className="flex flex-col">
                    <span>{item.name}</span>
                    <span className="text-xs opacity-70">{item.description}</span>
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer - User Info */}
        <UserInfo collapsed={collapsed} />
      </div>

      {/* Main content */}
      <div className={cn(
        "transition-all duration-300 ease-in-out",
        collapsed ? "lg:ml-16" : "lg:ml-64"
      )}>
        {/* Mobile header */}
        <div className="lg:hidden bg-white dark:bg-gray-900 border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-green-600" />
              <h1 className="text-lg font-semibold">WhatsApp Scheduler</h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Page content */}
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}