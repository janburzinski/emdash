import { Paperclip } from '@phosphor-icons/react';
import React, { useState } from 'react';
import { useToast } from '@renderer/lib/hooks/use-toast';
import { Button } from '@renderer/lib/ui/button';
import { Kbd, KbdGroup } from '@renderer/lib/ui/kbd';
import { Textarea } from '@renderer/lib/ui/textarea';

const SUPPORT_EMAIL = 'support@emdash.sh';

export function FeedbackCard() {
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSend = message.trim().length > 0 && !submitting;

  const handleSend = async () => {
    if (!canSend) return;
    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    setSubmitting(false);
    setMessage('');
    toast({
      title: 'Feedback sent',
      description: 'Thanks — we appreciate it.',
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      void handleSend();
    }
  };

  const handleAttach = () => {
    toast({
      title: 'Attachments coming soon',
      description: 'Image attachments are not wired up yet.',
    });
  };

  return (
    <section className="overflow-hidden rounded-xl border border-border/60 bg-muted/10">
      <div className="flex flex-col gap-1 px-4 pt-4 pb-3">
        <h3 className="text-base text-foreground">Feedback</h3>
        <p className="text-sm text-foreground-passive">
          You can also reach us at{' '}
          <a className="text-foreground-muted hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
        </p>
      </div>
      <div className="flex flex-col gap-2 px-4 pb-3">
        <label htmlFor="feedback-message" className="text-sm text-foreground">
          Message
        </label>
        <Textarea
          id="feedback-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tell us about your experience, bugs you've found, or features you'd like to see…"
          className="min-h-32 resize-none"
          disabled={submitting}
        />
      </div>
      <div className="flex items-center justify-between border-t border-border/60 px-3 py-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleAttach}
          disabled={submitting}
        >
          <Paperclip className="h-4 w-4" aria-hidden="true" />
          Attach images
        </Button>
        <Button type="button" size="sm" onClick={handleSend} disabled={!canSend}>
          <span>Send feedback</span>
          <KbdGroup className="ml-1">
            <Kbd>⌘</Kbd>
            <Kbd>↵</Kbd>
          </KbdGroup>
        </Button>
      </div>
    </section>
  );
}
