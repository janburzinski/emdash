import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Loader2, Plus } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Automation, CreateAutomationInput } from '@shared/automations/types';
import { useToast } from '@renderer/lib/hooks/use-toast';
import { rpc } from '@renderer/lib/ipc';
import { useShowModal } from '@renderer/lib/modal/modal-provider';
import { Button } from '@renderer/lib/ui/button';
import { TooltipProvider } from '@renderer/lib/ui/tooltip';
import { AutomationEditor } from './AutomationEditor';
import { AutomationRow } from './AutomationRow';
import { AutomationTemplates, type AutomationTemplate } from './AutomationTemplates';
import { useAutomations } from './useAutomations';

export const AutomationsView: React.FC = () => {
  const {
    automations,
    isLoading,
    createAutomation,
    updateAutomation,
    deleteAutomation,
    toggleAutomation,
    triggerNow,
    isCreating,
  } = useAutomations();
  const { toast } = useToast();
  const { data: projects = [], isPending: isLoadingProjects } = useQuery({
    queryKey: ['projects', 'list'],
    queryFn: async () => rpc.projects.getProjects(),
  });
  const showRunLogsModal = useShowModal('runLogsModal');
  const showConfirmModal = useShowModal('confirmActionModal');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const newAutomationButtonRef = useRef<HTMLButtonElement | null>(null);
  const pendingFocusAfterDeleteRef = useRef(false);

  const startNewAutomation = async (template?: AutomationTemplate) => {
    if (isCreating || isLoadingProjects) return;
    if (projects.length === 0) {
      toast({
        title: 'No projects available',
        description: 'Create a project first, then add an automation for it.',
        variant: 'destructive',
      });
      return;
    }
    const seed = template?.seed;
    const input: CreateAutomationInput = {
      name: seed?.name ?? '',
      projectId: projects[0].id,
      prompt: seed?.prompt ?? '',
      agentId: seed?.agentId ?? 'claude',
      mode: seed?.mode ?? 'schedule',
      useWorktree: seed?.useWorktree ?? true,
      status: 'paused',
      ...(seed?.schedule
        ? { schedule: seed.schedule }
        : seed?.mode === 'trigger'
          ? {}
          : { schedule: { type: 'daily', hour: 9, minute: 0 } }),
      ...(seed?.triggerType ? { triggerType: seed.triggerType } : {}),
      ...(seed?.triggerConfig ? { triggerConfig: seed.triggerConfig } : {}),
    };
    try {
      const created = await createAutomation(input);
      setEditingId(created.id);
    } catch {
      // toast already shown by the mutation
    }
  };

  const openEditor = (automation: Automation) => {
    setEditingId(automation.id);
  };

  const handlePickTemplate = (template: AutomationTemplate) => {
    void startNewAutomation(template);
  };

  const withBusy = async (id: string, fn: () => Promise<unknown>) => {
    setBusyId(id);
    try {
      await fn();
    } finally {
      setBusyId(null);
    }
  };

  useEffect(() => {
    if (editingId && !automations.some((a) => a.id === editingId)) setEditingId(null);
  }, [editingId, automations]);

  useEffect(() => {
    if (!editingId && pendingFocusAfterDeleteRef.current) {
      pendingFocusAfterDeleteRef.current = false;
      newAutomationButtonRef.current?.focus();
    }
  }, [editingId]);

  const { activeAutomations, pausedAutomations } = useMemo(() => {
    const active = automations.filter((a) => a.status !== 'paused');
    const paused = automations.filter((a) => a.status === 'paused');
    return { activeAutomations: active, pausedAutomations: paused };
  }, [automations]);

  const shouldReduceMotion = useReducedMotion();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-background text-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const editingAutomation = editingId ? automations.find((a) => a.id === editingId) : undefined;

  const easeOut = [0.23, 1, 0.32, 1] as const;
  const enterTransition = { duration: 0.2, ease: easeOut };
  const exitTransition = { duration: 0.12, ease: easeOut };
  const enterX = shouldReduceMotion ? 0 : '3%';
  const exitX = shouldReduceMotion ? 0 : '3%';

  let content: React.ReactNode;
  if (editingAutomation) {
    content = (
      <motion.div
        key={`edit-${editingAutomation.id}`}
        initial={{ opacity: 0, x: enterX }}
        animate={{ opacity: 1, x: 0, transition: enterTransition }}
        exit={{ opacity: 0, x: exitX, transition: exitTransition }}
        className="h-full"
      >
        <AutomationEditor
          automation={editingAutomation}
          onBack={() => setEditingId(null)}
          onUpdate={(input) => updateAutomation(input)}
          onToggle={() =>
            withBusy(editingAutomation.id, () => toggleAutomation(editingAutomation.id))
          }
          onTriggerNow={() =>
            withBusy(editingAutomation.id, () => triggerNow(editingAutomation.id))
          }
          onDelete={() =>
            showConfirmModal({
              title: 'Delete automation?',
              description: `"${editingAutomation.name}" will be removed along with its run history. This cannot be undone.`,
              confirmLabel: 'Delete',
              variant: 'destructive',
              onSuccess: () => {
                pendingFocusAfterDeleteRef.current = true;
                setEditingId(null);
                void withBusy(editingAutomation.id, () => deleteAutomation(editingAutomation.id));
              },
            })
          }
          onDiscardEmptyDraft={() => {
            const id = editingAutomation.id;
            pendingFocusAfterDeleteRef.current = true;
            setEditingId(null);
            void deleteAutomation(id);
          }}
          isBusy={busyId === editingAutomation.id}
        />
      </motion.div>
    );
  } else {
    content = (
      <motion.div
        key="list"
        initial={{ opacity: 0, x: shouldReduceMotion ? 0 : '-3%' }}
        animate={{ opacity: 1, x: 0, transition: enterTransition }}
        exit={{ opacity: 0, x: shouldReduceMotion ? 0 : '-3%', transition: exitTransition }}
        className="flex h-full flex-col overflow-y-auto bg-background text-foreground"
        style={{ scrollbarGutter: 'stable' }}
      >
        <div className="mx-auto w-full max-w-3xl px-8 py-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-lg font-semibold text-balance">Automations</h1>
              <p className="mt-1 text-xs text-muted-foreground text-pretty">
                Run agents on a schedule or in response to GitHub, Linear, Jira and other
                integration events.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                ref={newAutomationButtonRef}
                variant="outline"
                size="sm"
                onClick={() => void startNewAutomation()}
                disabled={isCreating || isLoadingProjects}
                className="active:scale-[0.97]"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                New Automation
              </Button>
            </div>
          </div>

          {automations.length === 0 ? (
            <AutomationTemplates onPick={handlePickTemplate} />
          ) : (
            <div className="space-y-6">
              {activeAutomations.length > 0 && (
                <Section label="Active" count={activeAutomations.length}>
                  {activeAutomations.map((automation, i) => (
                    <StaggeredRow
                      key={automation.id}
                      index={i}
                      shouldReduceMotion={shouldReduceMotion ?? false}
                    >
                      <AutomationRow
                        automation={automation}
                        busy={busyId === automation.id}
                        onToggle={() =>
                          withBusy(automation.id, () => toggleAutomation(automation.id))
                        }
                        onDelete={() =>
                          showConfirmModal({
                            title: 'Delete automation?',
                            description: `"${automation.name}" will be removed along with its run history. This cannot be undone.`,
                            confirmLabel: 'Delete',
                            variant: 'destructive',
                            onSuccess: () =>
                              void withBusy(automation.id, () => deleteAutomation(automation.id)),
                          })
                        }
                        onTriggerNow={() =>
                          withBusy(automation.id, () => triggerNow(automation.id))
                        }
                        onShowLogs={() =>
                          showRunLogsModal({
                            automationId: automation.id,
                            automationName: automation.name,
                          })
                        }
                        onEdit={() => openEditor(automation)}
                      />
                    </StaggeredRow>
                  ))}
                </Section>
              )}

              {pausedAutomations.length > 0 && (
                <Section label="Paused" count={pausedAutomations.length}>
                  {pausedAutomations.map((automation, i) => (
                    <StaggeredRow
                      key={automation.id}
                      index={i}
                      shouldReduceMotion={shouldReduceMotion ?? false}
                    >
                      <AutomationRow
                        automation={automation}
                        busy={busyId === automation.id}
                        onToggle={() =>
                          withBusy(automation.id, () => toggleAutomation(automation.id))
                        }
                        onDelete={() =>
                          showConfirmModal({
                            title: 'Delete automation?',
                            description: `"${automation.name}" will be removed along with its run history. This cannot be undone.`,
                            confirmLabel: 'Delete',
                            variant: 'destructive',
                            onSuccess: () =>
                              void withBusy(automation.id, () => deleteAutomation(automation.id)),
                          })
                        }
                        onTriggerNow={() =>
                          withBusy(automation.id, () => triggerNow(automation.id))
                        }
                        onShowLogs={() =>
                          showRunLogsModal({
                            automationId: automation.id,
                            automationName: automation.name,
                          })
                        }
                        onEdit={() => openEditor(automation)}
                      />
                    </StaggeredRow>
                  ))}
                </Section>
              )}
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <TooltipProvider delay={200}>
      <AnimatePresence mode="wait" initial={false}>
        {content}
      </AnimatePresence>
    </TooltipProvider>
  );
};

function Section({
  label,
  count,
  children,
}: {
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums text-muted-foreground/60">{count}</span>
      </h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function StaggeredRow({
  index,
  shouldReduceMotion,
  children,
}: {
  index: number;
  shouldReduceMotion: boolean;
  children: React.ReactNode;
}) {
  if (shouldReduceMotion) return <>{children}</>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.04, 0.32), ease: [0.23, 1, 0.32, 1] }}
    >
      {children}
    </motion.div>
  );
}
