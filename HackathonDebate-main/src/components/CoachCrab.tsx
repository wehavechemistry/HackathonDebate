import { motion } from 'framer-motion';

interface CoachCrabProps {
  size?: number;
  className?: string;
  animate?: boolean;
}

export default function CoachCrab({ size = 80, className = '', animate = true }: CoachCrabProps) {
  const crab = (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Claws */}
      <ellipse cx="18" cy="52" rx="14" ry="10" fill="#f97316" stroke="#ea580c" strokeWidth="2"/>
      <ellipse cx="102" cy="52" rx="14" ry="10" fill="#f97316" stroke="#ea580c" strokeWidth="2"/>
      {/* Claw tips */}
      <path d="M8 46 Q4 42 8 38" stroke="#ea580c" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M12 46 Q8 42 12 38" stroke="#ea580c" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M112 46 Q116 42 112 38" stroke="#ea580c" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M108 46 Q112 42 108 38" stroke="#ea580c" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      {/* Legs */}
      <line x1="30" y1="72" x2="16" y2="90" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="38" y1="76" x2="26" y2="95" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="46" y1="78" x2="38" y2="98" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="90" y1="72" x2="104" y2="90" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="82" y1="76" x2="94" y2="95" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="74" y1="78" x2="82" y2="98" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Body */}
      <ellipse cx="60" cy="60" rx="32" ry="26" fill="#fb923c" stroke="#ea580c" strokeWidth="2"/>
      {/* Shell pattern */}
      <path d="M40 50 Q60 38 80 50" stroke="#f97316" strokeWidth="1.5" fill="none" opacity="0.5"/>
      <path d="M38 58 Q60 46 82 58" stroke="#f97316" strokeWidth="1.5" fill="none" opacity="0.5"/>
      {/* Eyes */}
      {/* Eye stalks */}
      <line x1="46" y1="40" x2="42" y2="28" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="74" y1="40" x2="78" y2="28" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Eye balls */}
      <circle cx="42" cy="24" r="6" fill="white" stroke="#ea580c" strokeWidth="1.5"/>
      <circle cx="78" cy="24" r="6" fill="white" stroke="#ea580c" strokeWidth="1.5"/>
      {/* Pupils */}
      <circle cx="43" cy="24" r="3" fill="#1e293b"/>
      <circle cx="79" cy="24" r="3" fill="#1e293b"/>
      {/* Eye shine */}
      <circle cx="44.5" cy="22.5" r="1" fill="white"/>
      <circle cx="80.5" cy="22.5" r="1" fill="white"/>
      {/* Smile */}
      <path d="M50 66 Q60 74 70 66" stroke="#7c2d12" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* Graduation cap */}
      <polygon points="60,12 38,22 60,28 82,22" fill="#1e293b"/>
      <rect x="56" y="8" width="8" height="6" fill="#1e293b"/>
      <line x1="82" y1="22" x2="86" y2="16" stroke="#1e293b" strokeWidth="1.5"/>
      <circle cx="86" cy="14" r="2" fill="#f97316"/>
    </svg>
  );

  if (animate) {
    return (
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        {crab}
      </motion.div>
    );
  }

  return crab;
}
