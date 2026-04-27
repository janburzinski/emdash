import { useCallback } from 'react';
import { useShowModal } from '@renderer/lib/modal/modal-provider';
import type { FilePickerMode } from './file-picker-modal';

interface PickOptions {
  title?: string;
  initialPath?: string;
  showHidden?: boolean;
}

interface PickFileOptions extends PickOptions {
  extensions?: string[];
}

export function useFilePicker() {
  const showFilePicker = useShowModal('filePickerModal');

  const pick = useCallback(
    (mode: FilePickerMode, options: PickFileOptions): Promise<string | null> =>
      new Promise<string | null>((resolve) => {
        let settled = false;
        showFilePicker({
          mode,
          title: options.title,
          initialPath: options.initialPath,
          showHidden: options.showHidden,
          extensions: options.extensions,
          onSuccess: (result) => {
            if (settled) return;
            settled = true;
            resolve(typeof result === 'string' ? result : null);
          },
          onClose: () => {
            if (settled) return;
            settled = true;
            resolve(null);
          },
        });
      }),
    [showFilePicker]
  );

  const pickDirectory = useCallback(
    (options: PickOptions = {}) => pick('directory', options),
    [pick]
  );

  const pickFile = useCallback((options: PickFileOptions = {}) => pick('file', options), [pick]);

  return { pickDirectory, pickFile };
}
