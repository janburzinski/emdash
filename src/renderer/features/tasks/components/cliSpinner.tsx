import { useEffect, useState } from 'react';

const FRAMES_1 = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

const FRAMES_2 = [
  '⠈',
  '⠉',
  '⠋',
  '⠓',
  '⠒',
  '⠐',
  '⠐',
  '⠒',
  '⠖',
  '⠦',
  '⠤',
  '⠠',
  '⠠',
  '⠤',
  '⠦',
  '⠖',
  '⠒',
  '⠐',
  '⠐',
  '⠒',
  '⠓',
  '⠋',
  '⠉',
  '⠈',
];

const FRAMES_3 = ['⠋', '⠙', '⠚', '⠞', '⠖', '⠦', '⠴', '⠲', '⠳', '⠓'];

const FRAMES_4 = ['⠄', '⠆', '⠇', '⠋', '⠙', '⠸', '⠰', '⠠', '⠰', '⠸', '⠙', '⠋', '⠇', '⠆'];

const VARIANTS = {
  '1': FRAMES_1,
  '2': FRAMES_2,
  '3': FRAMES_3,
  '4': FRAMES_4,
} as const;

type VariantKey = keyof typeof VARIANTS;
type Variant = VariantKey | 'random';

const RANDOM_POOL: VariantKey[] = ['1', '3', '4'];

export function CLISpinner({ variant = '1' }: { variant?: Variant }) {
  const [frames] = useState<readonly string[]>(() => {
    const key: VariantKey =
      variant === 'random' ? RANDOM_POOL[Math.floor(Math.random() * RANDOM_POOL.length)] : variant;
    return VARIANTS[key];
  });
  const [intervalMs] = useState(() => 70 + Math.floor(Math.random() * 50));
  const [index, setIndex] = useState(() => Math.floor(Math.random() * frames.length));

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % frames.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [frames, intervalMs]);

  return <span className="text-foreground/60">{frames[index]}</span>;
}
