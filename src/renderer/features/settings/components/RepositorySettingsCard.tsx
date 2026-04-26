import React, { useMemo } from 'react';
import { useAppSettingsKey } from '@renderer/features/settings/use-app-settings-key';
import { Input } from '@renderer/lib/ui/input';
import { Switch } from '@renderer/lib/ui/switch';
import { ResetToDefaultButton } from './ResetToDefaultButton';
import { SettingRow } from './SettingRow';

const RepositorySettingsCard: React.FC = () => {
  const {
    value: localProject,
    update,
    isLoading: loading,
    isSaving: saving,
    isFieldOverridden,
    resetField,
  } = useAppSettingsKey('localProject');

  const branchPrefix = localProject?.branchPrefix ?? '';
  const pushOnCreate = localProject?.pushOnCreate ?? true;
  const writeAgentConfigToGitIgnore = localProject?.writeAgentConfigToGitIgnore ?? true;

  const example = useMemo(() => `${branchPrefix}/my-feature-a3f`, [branchPrefix]);

  return (
    <>
      <SettingRow
        title="Branch prefix"
        description={
          <>
            Used when creating worktree branches. Example:{' '}
            <code className="rounded bg-muted/60 px-1 py-0.5 font-mono text-[11px]">{example}</code>
          </>
        }
        control={
          <>
            <ResetToDefaultButton
              visible={isFieldOverridden('branchPrefix')}
              defaultLabel="emdash"
              onReset={() => resetField('branchPrefix')}
              disabled={loading || saving}
            />
            <Input
              key={branchPrefix}
              defaultValue={branchPrefix}
              onBlur={(e) => {
                const next = e.target.value.trim();
                if (next !== branchPrefix) {
                  update({ branchPrefix: next });
                }
              }}
              placeholder="emdash"
              aria-label="Branch prefix"
              disabled={loading}
              className="h-8 w-44"
            />
          </>
        }
      />
      <SettingRow
        title="Auto-push on create"
        description="Push the new branch to the project remote and set upstream after creation."
        control={
          <>
            <ResetToDefaultButton
              visible={isFieldOverridden('pushOnCreate')}
              defaultLabel="on"
              onReset={() => resetField('pushOnCreate')}
              disabled={loading || saving}
            />
            <Switch
              checked={pushOnCreate}
              onCheckedChange={(checked) => update({ pushOnCreate: checked })}
              disabled={loading || saving}
              aria-label="Enable automatic push on create"
            />
          </>
        }
      />
      <SettingRow
        title="Auto-update .gitignore"
        description="When Emdash writes CLI hook configs, also add their paths to .gitignore."
        control={
          <>
            <ResetToDefaultButton
              visible={isFieldOverridden('writeAgentConfigToGitIgnore')}
              defaultLabel="on"
              onReset={() => resetField('writeAgentConfigToGitIgnore')}
              disabled={loading || saving}
            />
            <Switch
              checked={writeAgentConfigToGitIgnore}
              onCheckedChange={(checked) => update({ writeAgentConfigToGitIgnore: checked })}
              disabled={loading || saving}
              aria-label="Enable .gitignore updates for CLI hook configs"
            />
          </>
        }
      />
    </>
  );
};

export default RepositorySettingsCard;
