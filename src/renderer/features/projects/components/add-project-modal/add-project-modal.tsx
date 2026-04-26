import { House as Home, HardDrives as Server } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { observer } from 'mobx-react-lite';
import { useMemo, useState } from 'react';
import { SshConnectionSelector } from '@renderer/features/projects/components/add-project-modal/ssh-connection-selector';
import { getProjectManagerStore } from '@renderer/features/projects/stores/project-selectors';
import { useAppSettingsKey } from '@renderer/features/settings/use-app-settings-key';
import { rpc } from '@renderer/lib/ipc';
import { useNavigate } from '@renderer/lib/layout/navigation-provider';
import { useShowModal, type BaseModalProps } from '@renderer/lib/modal/modal-provider';
import { useGithubContext } from '@renderer/lib/providers/github-context-provider';
import { appState } from '@renderer/lib/stores/app-state';
import { ConfirmButton } from '@renderer/lib/ui/confirm-button';
import {
  DialogContentArea,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@renderer/lib/ui/dialog';
import { Field, FieldLabel } from '@renderer/lib/ui/field';
import { ModalLayout } from '@renderer/lib/ui/modal-layout';
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/lib/ui/tooltip';
import { log } from '@renderer/utils/logger';
import { cn } from '@renderer/utils/utils';
import { ClonePanel, CreateNewPanel, PickExistingPanel } from './content';
import { useCloneMode, useNewMode, usePickMode } from './modes';

export type Strategy = 'local' | 'ssh';

export type Mode = 'pick' | 'new' | 'clone';

export interface BaseModeData {
  name: string;
  path: string;
  initGitRepository?: boolean;
}

export interface NewModeData extends BaseModeData {
  repositoryName: string;
  repositoryOwner: string;
  repositoryVisibility: 'public' | 'private';
}

export interface CloneModeData extends BaseModeData {
  repositoryUrl: string;
}

export type ModeData = BaseModeData | NewModeData | CloneModeData;

export interface AddProjectModalProps extends BaseModalProps<void> {
  strategy?: Strategy;
  mode?: Mode;
  connectionId?: string;
}

export const AddProjectModal = observer(function AddProjectModal({
  strategy: strategyProp,
  mode: modeProp,
  onClose,
  connectionId: connectionIdProp,
}: AddProjectModalProps) {
  const [strategy, setStrategy] = useState<Strategy>(strategyProp ?? 'local');
  const [mode, setMode] = useState<Mode>(modeProp ?? 'pick');
  const [connectionId, setConnectionId] = useState<string | undefined>(connectionIdProp);
  const { connections } = appState.sshConnections;
  const availableConnectionIds = useMemo(
    () =>
      connections.map((connection) => connection.id).filter((id): id is string => id !== undefined),
    [connections]
  );
  const selectedConnectionId =
    strategy === 'ssh' ? (connectionId ?? availableConnectionIds[0]) : connectionId;

  const { navigate } = useNavigate();
  const { isInitialized, needsGhAuth } = useGithubContext();

  const showSshConnModal = useShowModal('addSshConnModal');
  const showAddProjectModal = useShowModal('addProjectModal');

  const handleAddConnection = () => {
    showSshConnModal({
      onSuccess: ({ connectionId: newId }) =>
        showAddProjectModal({
          strategy: 'ssh',
          mode,
          connectionId: newId,
        }),
      onClose: () =>
        showAddProjectModal({
          strategy: 'ssh',
          mode,
        }),
    });
  };

  const { value: localProjectSettings } = useAppSettingsKey('localProject');
  const defaultPath =
    strategy === 'local' ? (localProjectSettings?.defaultProjectsDirectory ?? '') : '';

  const pickState = usePickMode();
  const newState = useNewMode(defaultPath);
  const cloneState = useCloneMode(defaultPath);
  const showGithubAuthDisclaimer = mode === 'new' && isInitialized && needsGhAuth;

  const activeMode = { pick: pickState, new: newState, clone: cloneState }[mode];
  const shouldCheckPickPathStatus =
    mode === 'pick' &&
    pickState.path.trim().length > 0 &&
    (strategy === 'local' || !!selectedConnectionId);
  const pickPathStatusQuery = useQuery({
    queryKey: ['projectPathStatus', strategy, selectedConnectionId, pickState.path],
    queryFn: () =>
      strategy === 'ssh'
        ? rpc.projects.getSshProjectPathStatus(pickState.path, selectedConnectionId!)
        : rpc.projects.getLocalProjectPathStatus(pickState.path),
    enabled: shouldCheckPickPathStatus,
  });
  const requiresGitInitialization =
    mode === 'pick' &&
    pickPathStatusQuery.data?.isDirectory === true &&
    pickPathStatusQuery.data.isGitRepo === false;
  const isCheckingPickPathStatus = shouldCheckPickPathStatus && pickPathStatusQuery.isPending;

  const canCreate =
    activeMode.isValid &&
    (strategy === 'local' || !!selectedConnectionId) &&
    !isCheckingPickPathStatus &&
    (!requiresGitInitialization || pickState.initGitRepository);

  const handleSubmit = async () => {
    try {
      if (strategy === 'local') {
        const project = await rpc.projects.getLocalProjectByPath(pickState.path);
        if (project) {
          navigate('project', { projectId: project.id });
          onClose();
          return;
        }
      }
      if (strategy === 'ssh') {
        const project = await rpc.projects.getSshProjectByPath(
          pickState.path,
          selectedConnectionId!
        );
        if (project) {
          navigate('project', { projectId: project.id });
          onClose();
          return;
        }
      }
    } catch (e) {
      log.error(e);
    }

    const id = crypto.randomUUID();
    const projectType =
      strategy === 'ssh' && selectedConnectionId
        ? { type: 'ssh' as const, connectionId: selectedConnectionId }
        : { type: 'local' as const };

    switch (mode) {
      case 'pick':
        void getProjectManagerStore().createProject(
          projectType,
          {
            mode: 'pick',
            name: pickState.name,
            path: pickState.path,
            initGitRepository: pickState.initGitRepository,
          },
          id
        );
        break;
      case 'new':
        void getProjectManagerStore().createProject(
          projectType,
          {
            mode: 'new',
            name: newState.name,
            path: newState.path,
            repositoryName: newState.repositoryName,
            repositoryOwner: newState.repositoryOwner?.value ?? '',
            repositoryVisibility: newState.repositoryVisibility,
          },
          id
        );
        break;
      case 'clone':
        void getProjectManagerStore().createProject(
          projectType,
          {
            mode: 'clone',
            name: cloneState.name,
            path: cloneState.path,
            repositoryUrl: cloneState.repositoryUrl,
          },
          id
        );
        break;
    }
    onClose();
    navigate('project', { projectId: id });
  };

  const onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canCreate) return;
    void handleSubmit();
  };

  return (
    <ModalLayout
      header={
        <DialogHeader>
          <DialogTitle>Add Project</DialogTitle>
        </DialogHeader>
      }
      footer={
        <DialogFooter>
          <ConfirmButton type="submit" form="add-project-form" disabled={!canCreate}>
            Create
          </ConfirmButton>
        </DialogFooter>
      }
    >
      <form id="add-project-form" onSubmit={onFormSubmit}>
        <div className="flex items-center justify-between border-b border-border px-6">
          <div className="flex items-center gap-1">
            <UnderlineTab active={mode === 'pick'} onClick={() => setMode('pick')}>
              Pick
            </UnderlineTab>
            <UnderlineTab active={mode === 'new'} onClick={() => setMode('new')}>
              New
            </UnderlineTab>
            <UnderlineTab active={mode === 'clone'} onClick={() => setMode('clone')}>
              Clone
            </UnderlineTab>
          </div>
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger
                render={
                  <SourceIconButton
                    active={strategy === 'local'}
                    onClick={() => setStrategy('local')}
                    aria-label="Local"
                  >
                    <Home className="size-3.5" />
                  </SourceIconButton>
                }
              />
              <TooltipContent>Local</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <SourceIconButton
                    active={strategy === 'ssh'}
                    onClick={() => setStrategy('ssh')}
                    aria-label="SSH"
                  >
                    <Server className="size-3.5" />
                  </SourceIconButton>
                }
              />
              <TooltipContent>SSH</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <DialogContentArea className="gap-4 pt-5">
          {strategy === 'ssh' && !showGithubAuthDisclaimer && (
            <Field>
              <FieldLabel>SSH Connection</FieldLabel>
              <SshConnectionSelector
                connectionId={selectedConnectionId}
                onConnectionIdChange={setConnectionId}
                onAddConnection={handleAddConnection}
              />
            </Field>
          )}
          {mode === 'pick' && (
            <PickExistingPanel
              strategy={strategy}
              connectionId={selectedConnectionId}
              state={pickState}
              showInitializeGitPrompt={requiresGitInitialization}
            />
          )}
          {mode === 'new' && (
            <CreateNewPanel
              strategy={strategy}
              connectionId={selectedConnectionId}
              state={newState}
              showGithubAuthDisclaimer={showGithubAuthDisclaimer}
              onOpenAccountSettings={() => navigate('settings', { tab: 'account' })}
            />
          )}
          {mode === 'clone' && (
            <ClonePanel
              strategy={strategy}
              connectionId={selectedConnectionId}
              state={cloneState}
            />
          )}
        </DialogContentArea>
      </form>
    </ModalLayout>
  );
});

function UnderlineTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'relative -mb-px px-3 py-2.5 text-sm outline-none transition-colors',
        'focus-visible:text-foreground',
        active
          ? 'text-foreground after:absolute after:inset-x-3 after:bottom-0 after:h-px after:bg-foreground'
          : 'text-foreground-muted hover:text-foreground'
      )}
    >
      {children}
    </button>
  );
}

const SourceIconButton = ({
  active,
  onClick,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={cn(
      'flex size-7 items-center justify-center rounded-md outline-none transition-colors',
      'focus-visible:ring-2 focus-visible:ring-ring/50',
      active
        ? 'bg-muted text-foreground'
        : 'text-foreground-tertiary-muted hover:bg-muted/40 hover:text-foreground-muted'
    )}
    {...props}
  >
    {children}
  </button>
);
