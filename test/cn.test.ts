import { expect, it } from 'vitest';

import { cn } from '../src/lib/utils';

it('keeps design-token text sizes alongside text colors', () => {
  expect(cn('text-fineprint text-muted-foreground')).toBe('text-fineprint text-muted-foreground');
  expect(cn('text-body', 'text-title')).toBe('text-title');
  expect(cn('shadow-md', 'shadow-regular')).toBe('shadow-regular');
});
