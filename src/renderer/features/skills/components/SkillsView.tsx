import {
  CircleNotch as Loader2,
  Plus,
  ArrowsClockwise as RefreshCw,
  MagnifyingGlass as Search,
} from '@phosphor-icons/react';
import React from 'react';
import { rpc } from '@renderer/lib/ipc';
import { useShowModal } from '@renderer/lib/modal/modal-provider';
import { Button } from '@renderer/lib/ui/button';
import { Input } from '@renderer/lib/ui/input';
import { Separator } from '@renderer/lib/ui/separator';
import SkillCard from './SkillCard';
import SkillDetailModal from './SkillDetailModal';
import { useSkills } from './useSkills';

const SkillsView: React.FC = () => {
  const {
    isLoading,
    isRefreshing,
    searchQuery,
    setSearchQuery,
    selectedSkill,
    showDetailModal,
    installedSkills,
    recommendedSkills,
    refresh,
    install,
    uninstall,
    openDetail,
    closeDetail,
  } = useSkills();
  const showCreateSkillModal = useShowModal('createSkillModal');

  const handleOpenTerminal = (skillPath: string) => {
    rpc.app.openIn({ app: 'terminal', path: skillPath });
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-background text-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-foreground-muted" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-background text-foreground">
      <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl space-y-8 px-10 py-10">
          <div className="flex flex-col gap-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-xl">Skills</h2>
                <p className="text-sm text-foreground-muted">
                  Reusable agent capabilities from the{' '}
                  <a
                    href="https://agentskills.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground underline decoration-foreground-muted/40 underline-offset-2 hover:decoration-foreground"
                  >
                    Agent Skills
                  </a>{' '}
                  standard.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => showCreateSkillModal({})}
                className="shrink-0"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                New skill
              </Button>
            </div>
            <Separator />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
              <Input
                placeholder="Search skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={refresh}
              disabled={isRefreshing}
              aria-label="Refresh catalog"
            >
              <RefreshCw
                className={`h-4 w-4 text-foreground-muted ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </Button>
          </div>

          {installedSkills.length > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="px-2 text-xs font-medium uppercase tracking-wider text-foreground-muted">
                Installed
              </h3>
              <div className="flex flex-col">
                {installedSkills.map((skill) => (
                  <SkillCard
                    key={skill.id}
                    skill={skill}
                    onSelect={openDetail}
                    onInstall={install}
                  />
                ))}
              </div>
            </section>
          )}

          {recommendedSkills.length > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="px-2 text-xs font-medium uppercase tracking-wider text-foreground-muted">
                Catalog
              </h3>
              <div className="flex flex-col">
                {recommendedSkills.map((skill) => (
                  <SkillCard
                    key={skill.id}
                    skill={skill}
                    onSelect={openDetail}
                    onInstall={install}
                  />
                ))}
              </div>
            </section>
          )}

          {installedSkills.length === 0 && recommendedSkills.length === 0 && (
            <p className="px-2 text-sm text-foreground-muted">
              {searchQuery ? 'No skills match your search.' : 'No skills available.'}
            </p>
          )}
        </div>
      </div>

      <SkillDetailModal
        skill={selectedSkill}
        isOpen={showDetailModal}
        onClose={closeDetail}
        onInstall={install}
        onUninstall={uninstall}
        onOpenTerminal={handleOpenTerminal}
      />
    </div>
  );
};

export default SkillsView;
