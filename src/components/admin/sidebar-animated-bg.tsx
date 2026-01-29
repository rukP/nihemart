 
'use client';
import { cn } from '@/lib/utils';
import { AnimatePresence, Transition, motion } from 'framer-motion';
import {
    Children,
    cloneElement,
    ReactElement,
    useId,
} from 'react';

type SidebarAnimatedBackgroundProps = {
    children:
    | ReactElement<{ 'data-id': string }>[]
    | ReactElement<{ 'data-id': string }>;
    activeId?: string | null;
    className?: string;
    transition?: Transition;
    ChildClasses?: string
};

export default function SidebarAnimatedBackground({
    children,
    activeId,
    className,
    ChildClasses,
    transition,
}: SidebarAnimatedBackgroundProps) {
    const uniqueId = useId();

    return Children.map(children, (child: any, index) => {
        const id = child.props['data-id'];

        return cloneElement(
            child,
            {
                key: index,
                className: cn('relative inline-flex', child.props.className),
                'aria-selected': activeId === id,
                'data-checked': activeId === id ? 'true' : 'false',
            },
            <>
                <AnimatePresence initial={false}>
                    {activeId === id && (
                        <div className="w-full pl-2 absolute inset-0 top-0 h-10">
                            <motion.div
                                layoutId={`background-${uniqueId}`}
                                className={cn('h-full relative w-full after:content-[""] after:absolute after:h-full after:w-1 after:left-0 after:top-0 after:z-50 after:rounded-md after:bg-orange-500', className)}
                                transition={transition ?? { type: 'spring', stiffness: 300, damping: 30 }}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <div className="w-full bg-zinc-100 lg:bg-white h-full rounded-lg" />
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
                <div className={cn('z-10', ChildClasses, { "text-dumbOrange": activeId === id })}>
                    {child.props.children}
                </div>
            </>
        );
    });
}