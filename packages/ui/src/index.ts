/** Shared shadcn primitives plus the explicit FRAMEFORGE icon surface. */

export { Button, IconButton, Input, TextArea, Field, Select, UIProvider } from './primitives';
export type { ButtonProps, IconButtonProps, FieldProps, Option, SelectProps } from './primitives';
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction } from './components/card';
export { Badge, badgeVariants } from './components/badge';
export { Checkbox } from './components/checkbox';
export { NativeSelect } from './components/native-select';
export {
  Dialog, DialogTrigger, DialogClose, DialogPortal, DialogOverlay, DialogContent,
  DialogHeader, DialogFooter, DialogTitle, DialogDescription
} from './components/dialog';
export {
  Popover, PopoverTrigger, PopoverAnchor, PopoverClose, PopoverContent, PopoverHeader, PopoverTitle, PopoverDescription
} from './components/popover';
export {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuGroup, DropdownMenuPortal,
  DropdownMenuSub, DropdownMenuRadioGroup, DropdownMenuSubTrigger,
  DropdownMenuSubContent, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuCheckboxItem, DropdownMenuRadioItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuShortcut
} from './components/dropdown-menu';
export { buttonVariants } from './components/button';
export { cn } from './lib/utils';
import {
  AlertTriangle, Archive, ChartNoAxesCombined, ArrowRight, ArrowUpDown, Check, ChevronLeft, ChevronRight,
  CircleUserRound, Clapperboard, Clock, Clock3, Columns3, Copy, Scissors, ClipboardPaste, Download, Filter,
  Eye, EyeOff, FileDown, Film, GripVertical, Image, Images, Layers, LayoutGrid, Lightbulb, ListVideo,
  Lock, LockOpen, MessageSquare, Mic, Minus, Moon, Palette, PanelRightOpen, Pause, Pencil, Play, Plus, Redo2,
  RefreshCw, Search, Settings, SlidersHorizontal, Sun, Table2, Trash2, TriangleAlert, Undo2, X, ZoomIn, ZoomOut
} from 'lucide-react';

// Keep the shared icon surface explicit so a consumer does not bundle all of Lucide.
export const Icons = {
  AlertTriangle, Archive, ChartNoAxesCombined, ArrowRight, ArrowUpDown, Check, ChevronLeft, ChevronRight,
  CircleUserRound, Clapperboard, Clock, Clock3, Columns3, Copy, Scissors, ClipboardPaste, Download, Filter,
  Eye, EyeOff, FileDown, Film, GripVertical, Image, Images, Layers, LayoutGrid, Lightbulb, ListVideo,
  Lock, LockOpen, MessageSquare, Mic, Minus, Moon, Palette, PanelRightOpen, Pause, Pencil, Play, Plus, Redo2,
  RefreshCw, Search, Settings, SlidersHorizontal, Sun, Table2, Trash2, TriangleAlert, Undo2, X, ZoomIn, ZoomOut
};

export { Textarea } from './components/textarea';
export { Select as SelectRoot, SelectTrigger, SelectContent, SelectValue, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectScrollUpButton, SelectScrollDownButton } from './components/select';
export { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from './components/tooltip';
