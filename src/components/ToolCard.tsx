import React from 'react';
import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface ToolCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  color: 'blue' | 'purple' | 'pink' | 'emerald';
  onClick: () => void;
  className?: string;
}

const colorMap = {
  blue: 'from-blue-500 to-cyan-500',
  purple: 'from-purple-500 to-indigo-500',
  pink: 'from-pink-500 to-rose-500',
  emerald: 'from-emerald-500 to-teal-500',
};

const shadowMap = {
  blue: 'shadow-blue-500/20',
  purple: 'shadow-purple-500/20',
  pink: 'shadow-pink-500/20',
  emerald: 'shadow-emerald-500/20',
};

export const ToolCard: React.FC<ToolCardProps> = ({
  title,
  description,
  icon: Icon,
  color,
  onClick,
  className
}) => {
  return (
    <motion.button
      whileHover={{ y: -5, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "glass-card p-6 text-left group relative overflow-hidden",
        shadowMap[color],
        className
      )}
    >
      <div className={cn(
        "absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 bg-gradient-to-br opacity-10 blur-3xl rounded-full transition-opacity group-hover:opacity-20",
        colorMap[color]
      )} />
      
      <div className={cn(
        "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4 shadow-lg",
        colorMap[color]
      )}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      
      <h3 className="text-lg font-display font-bold mb-2 group-hover:text-white transition-colors">
        {title}
      </h3>
      <p className="text-sm text-crystal-400 leading-relaxed">
        {description}
      </p>
    </motion.button>
  );
};
