import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface AnimatedValueProps {
  value: string | number;
  suffix?: React.ReactNode;
  className?: string;
}

export const AnimatedValue: React.FC<AnimatedValueProps> = ({
  value,
  suffix,
  className = ''
}) => {
  return (
    <span className={`inline-flex items-baseline overflow-hidden ${className}`}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={String(value)}
          initial={{ opacity: 0, y: -8, scale: 0.95, filter: 'blur(2px)' }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: 8, scale: 0.95, filter: 'blur(2px)' }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="inline-block"
        >
          {value}
        </motion.span>
      </AnimatePresence>
      {suffix && <span className="ml-1 shrink-0">{suffix}</span>}
    </span>
  );
};
