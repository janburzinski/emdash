import React from 'react';
import { AccountTab } from './AccountTab';
import { CliAgentsList } from './CliAgentsList';
import DefaultAgentSettingsCard from './DefaultAgentSettingsCard';
import { FeedbackCard } from './FeedbackCard';
import { GlassSidebarRow } from './GlassSidebarRow';
import HiddenToolsSettingsCard from './HiddenToolsSettingsCard';
import IntegrationsCard from './IntegrationsCard';
import KeyboardSettingsCard from './KeyboardSettingsCard';
import NotificationSettingsCard from './NotificationSettingsCard';
import RepositorySettingsCard from './RepositorySettingsCard';
import { ReviewPromptResetButton, ReviewPromptSettingsCard } from './ReviewPromptSettingsCard';
import { SettingsCard } from './SettingsCard';
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

interface SettingsTabContent {
  title: string;
  description: string;
  content: React.ReactNode;
}

const TAB_CONTENT: Record<Exclude<SettingsPageTab, 'docs'>, SettingsTabContent> = {
  general: {
    title: 'General',
    description: 'Manage your privacy settings, notifications, and app updates.',
    content: (
      <>
        <SettingsCard title="Privacy">
          <TelemetryCard />
        </SettingsCard>
        <SettingsCard title="Tasks">
          <AutoGenerateTaskNamesRow />
          <AutoTrustWorktreesRow />
        </SettingsCard>
        <SettingsCard title="Notifications">
          <NotificationSettingsCard />
        </SettingsCard>
        <SettingsCard title="Updates">
          <UpdateCard />
        </SettingsCard>
        <FeedbackCard />
      </>
    ),
  },
  account: {
    title: 'Account',
    description: 'Manage your Emdash account.',
    content: <AccountTab />,
  },
  'clis-models': {
    title: 'Agents',
    description: 'Manage CLI agents and model configurations.',
    content: (
      <>
        <SettingsCard title="Default agent">
          <DefaultAgentSettingsCard />
        </SettingsCard>
        <SettingsCard title="Review prompt" action={<ReviewPromptResetButton />}>
          <div className="px-4 py-3">
            <ReviewPromptSettingsCard />
          </div>
        </SettingsCard>
        <SettingsCard title="CLI agents" flush>
          <CliAgentsList />
        </SettingsCard>
      </>
    ),
  },
  integrations: {
    title: 'Integrations',
    description: 'Connect external services and tools.',
    content: <IntegrationsCard />,
  },
  repository: {
    title: 'Repository',
    description: 'Configure repository and branch settings.',
    content: (
      <SettingsCard title="Branch settings">
        <RepositorySettingsCard />
      </SettingsCard>
    ),
  },
  interface: {
    title: 'Interface',
    description: 'Customize the appearance and behavior of the app.',
    content: (
      <>
        <SettingsCard title="Appearance">
          <ThemeCard />
          <GlassSidebarRow />
        </SettingsCard>
        <SettingsCard title="Terminal">
          <TerminalSettingsCard />
        </SettingsCard>
        <SettingsCard title="Keyboard shortcuts" flush>
          <KeyboardSettingsCard />
        </SettingsCard>
        <SettingsCard title="Open in" flush>
          <HiddenToolsSettingsCard />
        </SettingsCard>
      </>
    ),
  },
};

export function SettingsPage({ tab: activeTab }: { tab: SettingsPageTab }) {
  if (activeTab === 'docs') return null;
  const current = TAB_CONTENT[activeTab];
  if (!current) return null;

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-8 py-10">
          <header className="mb-6 flex flex-col gap-1">
            <h2 className="text-xl tracking-tight">{current.title}</h2>
            <p className="text-sm text-foreground-passive">{current.description}</p>
          </header>
          <div className="flex flex-col gap-4">{current.content}</div>
        </div>
      </div>
    </div>
  );
}
