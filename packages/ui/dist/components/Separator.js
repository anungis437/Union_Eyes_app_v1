import { jsx as _jsx } from "react/jsx-runtime";
/**
 * @fileoverview Separator component based on Radix UI
 */
import React from 'react';
import * as SeparatorPrimitive from '@radix-ui/react-separator';
import { cn } from '../utils/cn';
const Separator = React.forwardRef(({ className, orientation = 'horizontal', decorative = true, ...props }, ref) => (_jsx(SeparatorPrimitive.Root, { ref: ref, decorative: decorative, orientation: orientation, className: cn('shrink-0 bg-gray-200', orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]', className), ...props })));
Separator.displayName = SeparatorPrimitive.Root.displayName;
export { Separator };
//# sourceMappingURL=Separator.js.map