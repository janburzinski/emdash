import { MagnifyingGlass as Search } from '@phosphor-icons/react';
import { useHotkey } from '@tanstack/react-hotkeys';
import * as React from 'react';
import { Input } from '@renderer/lib/ui/input';
import { cn } from '@renderer/utils/utils';

function SearchInput({ className, ...props }: React.ComponentProps<'input'>) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  useHotkey(
    'Mod+F',
    () => {
      inputRef.current?.focus();
    },
    { enabled: true }
  );
  return (
    <div className="relative flex items-center">
      <Search className="absolute left-2.5 size-3.5 shrink-0 text-foreground-muted pointer-events-none" />
      <Input className={cn('pl-8', className)} {...props} ref={inputRef} />
    </div>
  );
}

export { SearchInput };
