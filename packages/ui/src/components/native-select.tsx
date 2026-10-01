import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

export const NativeSelect = React.forwardRef<HTMLSelectElement, React.ComponentProps<'select'>>(
  function NativeSelect({ className, children, ...props }, ref) {
    return (
      <span className="relative inline-flex min-w-0 items-center">
        <select data-slot="native-select" ref={ref} className={cn('h-9 w-full appearance-none rounded-md border border-input bg-transparent dark:bg-input/30 pl-3 pr-9 text-sm text-foreground shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 disabled:cursor-not-allowed disabled:opacity-50', className)} {...props}>{children}</select>
        <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 opacity-60" aria-hidden="true" />
      </span>
    );
  }
);
