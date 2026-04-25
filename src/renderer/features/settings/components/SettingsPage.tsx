import React from 'react';
import { Separator } from '@renderer/lib/ui/separator';
import { AccountTab } from './AccountTab';
import { CliAgentsList } from './CliAgentsList';
import DefaultAgentSettingsCard from './DefaultAgentSettingsCard';
import { GlassSidebarRow } from './GlassSidebarRow';
import HiddenToolsSettingsCard from './HiddenToolsSettingsCard';
import IntegrationsCard from './IntegrationsCard';
import KeyboardSettingsCard from './KeyboardSettingsCard';
import NotificationSettingsCard from './NotificationSettingsCard';
import RepositorySettingsCard from './RepositorySettingsCard';
import { ReviewPromptResetButton, ReviewPromptSettingsCard } from './ReviewPromptSettingsCard';
import { AutoGenerateTaskNamesRow, AutoTrustWorktreesRow } from './TaskSettingsRows';
import TelemetryCard from './TelemetryCard';
import TerminalSettingsCard from './TerminalSettingsCard';
import ThemeCard from './ThemeCard';
import { UpdateCard } from './UpdateCard';

export type SettingsPageTab =
  | 'general'
  | 'account'
  | 'clis-models'
  | 'integrations'
  | 'repository'
  | 'interface'
  | 'docs';

interface SectionConfig {
  title?: string;
  action?: React.ReactNode;
  component: React.ReactNode;
}

export function SettingsPage({ tab: activeTab }: { tab: SettingsPageTab }) {
  const tabContent: Record<
    string,
    { title: string; description: string; sections: SectionConfig[] }
  > = {
    general: {
      title: 'General',
      description: 'Manage your account, privacy settings, notifications, and app updates.',
      sections: [
        {
          component: <TelemetryCard />,
        },
        {
          component: <AutoGenerateTaskNamesRow />,
        },
        {
          component: <AutoTrustWorktreesRow />,
        },
        {
          component: <NotificationSettingsCard />,
        },
        {
          component: <UpdateCard />,
        },
      ],
    },
    account: {
      title: 'Account',
      description: 'Manage your Emdash account.',
      sections: [{ component: <AccountTab /> }],
    },
    'clis-models': {
      title: 'Agents',
      description: 'Manage CLI agents and model configurations.',
      sections: [
        { component: <DefaultAgentSettingsCard /> },
        {
          title: 'Review Prompt',
          action: <ReviewPromptResetButton />,
          component: <ReviewPromptSettingsCard />,
        },
        {
          title: 'CLI agents',
          component: (
            <div className="rounded-xl border border-border/60 bg-muted/10 p-2">
              <CliAgentsList />
            </div>
          ),
        },
      ],
    },
    integrations: {
      title: 'Integrations',
      description: 'Connect external services and tools.',
      sections: [{ title: 'Integrations', component: <IntegrationsCard /> }],
    },
    repository: {
      title: 'Repository',
      description: 'Configure repository and branch settings.',
      sections: [{ title: 'Branch prefix', component: <RepositorySettingsCard /> }],
    },
    interface: {
      title: 'Interface',
      description: 'Customize the appearance and behavior of the app.',
      sections: [
        { component: <ThemeCard /> },
        { component: <GlassSidebarRow /> },
        { component: <TerminalSettingsCard /> },
        { title: 'Keyboard shortcuts', component: <KeyboardSettingsCard /> },
        {
          title: 'Tools',
          component: <HiddenToolsSettingsCard />,
        },
      ],
    },
  };

  const currentContent = tabContent[activeTab as keyof typeof tabContent];

  if (!currentContent) {
    return null;
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl space-y-8 px-10 py-10">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-xl">{currentContent.title}</h2>
              <p className="text-sm text-foreground-muted">{currentContent.description}</p>
            </div>
            <Separator />
          </div>
          {currentContent.sections.map((section) => (
            <div key={section.title} className="flex flex-col gap-3">
              {section.title && (
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-normal text-foreground">{section.title}</h3>
                  {section.action && <div>{section.action}</div>}
                </div>
              )}
              {section.component}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
