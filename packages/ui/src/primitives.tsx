import * as React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Popover as FloatingPopover, Select as Choice, Tooltip } from 'radix-ui';
import { Button, type ButtonProps } from './components/button';
import { Input } from './components/input';
import { TextArea } from './components/textarea';
import { cn } from './lib/utils';

export { Button, Input, TextArea };
export type { ButtonProps };

export type IconButtonProps = ButtonProps & { label: string };

export function UIProvider({ children }: React.PropsWithChildren) {
  return <Tooltip.Provider delayDuration={450}>{children}</Tooltip.Provider>;
}

export type PopoverProps = React.PropsWithChildren<{
  label: string;
  trigger: React.ReactElement;
  className?: string;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
}>;

export function Popover({
  label,
  trigger,
  children,
  className,
  align = 'end',
  side = 'bottom'
}: PopoverProps) {
  return (
    <FloatingPopover.Root>
      <FloatingPopover.Trigger asChild>{trigger}</FloatingPopover.Trigger>
      <FloatingPopover.Portal>
        <FloatingPopover.Content
          aria-label={label}
          align={align}
          side={side}
          sideOffset={6}
          collisionPadding={12}
          className={cn(
            'z-50 max-h-[min(70vh,520px)] min-w-64 overflow-auto rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-xl outline-none',
            className
          )}
        >
          {children}
        </FloatingPopover.Content>
      </FloatingPopover.Portal>
    </FloatingPopover.Root>
  );
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({ label, className, children, ...props }, ref) {
    return (
      <UIProvider>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <Button {...props} variant={props.variant ?? 'ghost'} size={props.size ?? 'icon'} ref={ref} aria-label={label} className={className}>{children}</Button>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content className="z-50 max-w-60 rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md" sideOffset={6} collisionPadding={12}>{label}</Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </UIProvider>
    );
  }
);

export type FieldProps = React.PropsWithChildren<{ label: string }>;

export function Field({ label, children }: FieldProps) {
  return <label className="grid min-w-0 gap-2 text-sm font-medium text-foreground"><span>{label}</span>{children}</label>;
}

export type Option = { value: string; label: string; disabled?: boolean };
export type SelectProps = {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  className?: string;
};

export function Select({ label, value, options, onChange, disabled, required, name, className }: SelectProps) {
  return (
    <Choice.Root value={value} onValueChange={onChange} disabled={disabled} required={required} name={name}>
      <Choice.Trigger className={cn('flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50', className)} aria-label={label}>
        <Choice.Value />
        <Choice.Icon><ChevronDown className="h-4 w-4 opacity-60" aria-hidden="true" /></Choice.Icon>
      </Choice.Trigger>
      <Choice.Portal>
        <Choice.Content className="z-50 max-h-[var(--radix-select-content-available-height)] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md" position="popper" sideOffset={5} collisionPadding={12}>
          <Choice.Viewport>
            {options.map(option => (
              <Choice.Item className="relative flex min-h-9 cursor-default select-none items-center rounded-sm py-2 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50" value={option.value} key={option.value} disabled={option.disabled}>
                <Choice.ItemText>{option.label}</Choice.ItemText>
                <Choice.ItemIndicator className="absolute left-2"><Check className="h-4 w-4" aria-hidden="true" /></Choice.ItemIndicator>
              </Choice.Item>
            ))}
          </Choice.Viewport>
        </Choice.Content>
      </Choice.Portal>
    </Choice.Root>
  );
}
