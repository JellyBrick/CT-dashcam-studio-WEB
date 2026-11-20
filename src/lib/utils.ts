import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['fineprint', 'body', 'subtitle', 'title', 'head1', 'head2', 'head3'],
      blur: ['regular', 'large'],
      shadow: ['regular'],
      ease: ['fade', 'fill', 'spring'],
    },
  },
});

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
