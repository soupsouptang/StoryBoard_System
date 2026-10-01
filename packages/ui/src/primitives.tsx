import * as React from 'react';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from './components/tooltip';
import { Select as Choice, SelectTrigger, SelectContent, SelectValue, SelectItem } from './components/select';
import { Button, type ButtonProps } from './components/button';
import { Input } from './components/input';
import { TextArea } from './components/textarea';
import { cn } from './lib/utils';

export { Button, Input, TextArea };
export type { ButtonProps };

export type IconButtonProps = ButtonProps & { label: string };

export function UIProvider({ children }: React.PropsWithChildren) {
  return <TooltipProvider>{children}</TooltipProvider>;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({ label, className, children, ...props }, ref) {
    return (
      <UIProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button {...props} variant={props.variant ?? 'ghost'} size={props.size ?? 'icon'} ref={ref} aria-label={label} className={className}>{children}</Button>
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
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
  // Radix reserves an empty value for clearing; domain forms still accept empty options.
  let emptyOptionValue = '__frameforge_empty_option__';
  const optionValues = new Set(options.map(option => option.value));
  while (optionValues.has(emptyOptionValue)) emptyOptionValue += '_';

  return (
    <Choice value={value} onValueChange={nextValue => onChange(nextValue === emptyOptionValue ? '' : nextValue)} disabled={disabled} required={required} name={name}>
      <SelectTrigger className={cn('w-full min-w-0', className)} aria-label={label}>
        <SelectValue placeholder={options.find(option => option.value === '')?.label} />
      </SelectTrigger>
      <SelectContent position="popper" collisionPadding={12}>
        {options.map(option => <SelectItem value={option.value || emptyOptionValue} key={option.value} disabled={option.disabled}>{option.label}</SelectItem>)}
      </SelectContent>
    </Choice>
  );
}
