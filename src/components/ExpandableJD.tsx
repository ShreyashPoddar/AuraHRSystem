'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ExpandableJD({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col items-start gap-2">
      <motion.div 
        animate={{ height: expanded ? 'auto' : '4.5rem' }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="relative overflow-hidden w-full"
      >
        <div 
          className={`text-sm text-ink/70 prose prose-sm max-w-none leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}
          dangerouslySetInnerHTML={{ __html: content || 'No description provided.' }}
        />
        {!expanded && (
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-cream to-transparent pointer-events-none" />
        )}
      </motion.div>
      <button 
        onClick={() => setExpanded(!expanded)}
        className="text-xs font-bold text-sage hover:underline transition-colors"
      >
        {expanded ? 'Show Less' : 'Read More'}
      </button>
    </div>
  );
}
