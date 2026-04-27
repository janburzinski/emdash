import { observer } from 'mobx-react-lite';
import { asMounted, getProjectStore } from '@renderer/features/projects/stores/project-selectors';
import { getTaskStore, taskDisplayName } from '@renderer/features/tasks/stores/task-selectors';
import { BaseModalProps } from '@renderer/lib/modal/modal-provider';
import {
  DialogContentArea,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@renderer/lib/ui/dialog';

export const SplitTaskPickerModal = observer(function SplitTaskPickerModal({
  projectId,
  onSuccess,
}: BaseModalProps<{ taskId: string }> & {
  projectId: string;
}) {
  const project = asMounted(getProjectStore(projectId));
  const taskMgr = project?.taskManager;
  const tasks = taskMgr ? Array.from(taskMgr.tasks.values()) : [];

  return (
    <>
      <DialogHeader>
        <DialogTitle>Open task in split</DialogTitle>
      </DialogHeader>
      <DialogContentArea>
        <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
          {tasks.length === 0 ? (
            <p className="py-8 text-center text-xs text-foreground-passive">
              No tasks in this project yet.
            </p>
          ) : (
            tasks.map((task) => {
              const taskId = task.data.id;
              return (
                <button
                  key={taskId}
                  onClick={() => onSuccess({ taskId })}
                  className="flex w-full flex-col rounded-md px-3 py-2 text-left hover:bg-foreground/5"
                >
                  <span className="truncate text-sm text-foreground">
                    {taskDisplayName(getTaskStore(projectId, taskId))}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </DialogContentArea>
      <DialogFooter>
        <p className="text-xs text-foreground-passive">Pick an existing task for this split.</p>
      </DialogFooter>
    </>
  );
});
