import { ArrowCounterClockwise as RotateCcw } from '@phosphor-icons/react';
import { useAppSettingsKey } from '@renderer/features/settings/use-app-settings-key';
import { Button } from '@renderer/lib/ui/button';
import { Textarea } from '@renderer/lib/ui/textarea';

export function ReviewPromptResetButton() {
  const { value, defaults, reset, isLoading, isSaving } = useAppSettingsKey('reviewPrompt');
  const canReset = (value ?? '') !== (defaults ?? '');

  if (!canReset || isLoading || isSaving) {
    return <span aria-hidden="true" className="h-7 w-7 shrink-0" />;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-foreground-muted hover:text-foreground"
      onClick={() => reset()}
      aria-label="Reset review prompt to default"
    >
      <RotateCcw className="h-3.5 w-3.5" />
    </Button>
  );
}

export function ReviewPromptSettingsCard() {
  const { value, update, isLoading, isSaving } = useAppSettingsKey('reviewPrompt');
  const reviewPrompt = value ?? '';

  return (
    <Textarea
      key={reviewPrompt}
      defaultValue={reviewPrompt}
      onBlur={(e) => {
        const next = e.target.value;
        if (next !== reviewPrompt) {
          update(next);
        }
      }}
      className="min-h-32 px-3 py-2.5 text-sm leading-relaxed"
      disabled={isLoading || isSaving}
    />
  );
}
