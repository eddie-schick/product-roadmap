import type { TabStatus } from '@/types/database';
import { Button } from '@/components/ui/button';

interface TabNavigationProps {
  activeTab: TabStatus;
  onTabChange: (tab: TabStatus) => void;
  counts?: Record<TabStatus, number>;
}

export function TabNavigation({ activeTab, onTabChange, counts }: TabNavigationProps) {
  const tabs: TabStatus[] = ['Active', 'Backlog', 'Completed', 'All'];

  return (
    <div className="border-b border-border bg-background">
      <div className="max-w-[1600px] mx-auto px-6">
        <nav className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`relative px-1 py-4 text-sm font-medium transition-colors duration-200 ${
                activeTab === tab
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
              {counts && counts[tab] !== undefined && (
                <span className={`ml-2 text-xs ${
                  activeTab === tab ? 'opacity-80' : 'opacity-60'
                }`}>
                  ({counts[tab]})
                </span>
              )}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
