import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { cn } from '@/lib/utils';

import type { ReactNode } from 'react';

const heading =
  (Tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6', size: string) =>
  ({ children }: { children?: ReactNode }) => (
    <Tag className={cn('pt-2 text-foreground', size)}>{children}</Tag>
  );

const components: Components = {
  h1: heading('h1', 'text-head2'),
  h2: heading('h2', 'text-head3'),
  h3: heading('h3', 'text-title'),
  h4: heading('h4', 'text-title'),
  h5: heading('h5', 'text-title'),
  h6: heading('h6', 'text-title'),
  ul: ({ children }) => <ul className="flex list-disc flex-col gap-1.5 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="flex list-decimal flex-col gap-1.5 pl-5">{children}</ol>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-attention hover:underline"
    >
      {children}
    </a>
  ),
  code: ({ children }) => <code className="font-mono text-[0.92em]">{children}</code>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  table: ({ children }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-body">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="text-foreground">{children}</thead>,
  tbody: ({ children }) => <tbody className="*:odd:bg-muted">{children}</tbody>,
  th: ({ children }) => <th className="px-2 py-1.5 font-semibold">{children}</th>,
  td: ({ children }) => <td className="px-2 py-1.5 align-top">{children}</td>,
};

export const Markdown = ({ source, className }: { source: string; className?: string }) => (
  <div className={cn('flex flex-col gap-3 text-subtitle text-muted-foreground', className)}>
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {source}
    </ReactMarkdown>
  </div>
);
