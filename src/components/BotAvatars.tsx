interface AvatarProps {
  size?: number;
}

export function DuyAvatar({ size = 60 }: AvatarProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="48" fill="#8B6914"/>
      <circle cx="50" cy="42" r="22" fill="#3d2b1f"/>
      {/* Messy hair */}
      <path d="M28 35 Q32 18 42 22 Q38 12 50 15 Q55 8 62 18 Q70 12 72 25 Q78 20 74 35" fill="#1a1a1a" stroke="#111" strokeWidth="1"/>
      {/* Face */}
      <circle cx="50" cy="45" r="18" fill="#5c3d2e"/>
      {/* Eyes */}
      <circle cx="42" cy="42" r="3" fill="white"/>
      <circle cx="58" cy="42" r="3" fill="white"/>
      <circle cx="43" cy="42" r="1.5" fill="#1e293b"/>
      <circle cx="59" cy="42" r="1.5" fill="#1e293b"/>
      {/* Mouth - slight awkward smile */}
      <path d="M44 52 Q50 55 56 51" stroke="#2d1810" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      {/* Body */}
      <rect x="35" y="62" width="30" height="20" rx="4" fill="#334155"/>
      {/* Code symbol on shirt */}
      <text x="50" y="76" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="monospace">&lt;/&gt;</text>
    </svg>
  );
}

export function ThaiAvatar({ size = 60 }: AvatarProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="48" fill="#1e293b"/>
      {/* Spiky hair */}
      <path d="M30 38 L35 12 L40 32 L45 8 L50 28 L55 10 L60 30 L65 14 L70 38" fill="#1a1a1a" stroke="#111" strokeWidth="1"/>
      {/* Face */}
      <circle cx="50" cy="45" r="18" fill="#f5d5b8"/>
      {/* Eyes - confident */}
      <ellipse cx="42" cy="42" rx="3.5" ry="3" fill="white"/>
      <ellipse cx="58" cy="42" rx="3.5" ry="3" fill="white"/>
      <circle cx="43" cy="42" r="2" fill="#1e293b"/>
      <circle cx="59" cy="42" r="2" fill="#1e293b"/>
      {/* Eyebrows - aggressive */}
      <line x1="38" y1="37" x2="46" y2="38" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round"/>
      <line x1="62" y1="37" x2="54" y2="38" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round"/>
      {/* Smirk */}
      <path d="M44 52 Q50 58 58 52" stroke="#c5846d" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      {/* Body - hoodie */}
      <rect x="33" y="62" width="34" height="20" rx="4" fill="#ef4444"/>
    </svg>
  );
}

export function HanAvatar({ size = 60 }: AvatarProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="48" fill="#fce7f3"/>
      {/* Long hair */}
      <path d="M28 35 Q30 15 50 12 Q70 15 72 35 L75 75 Q72 80 65 78 L65 50 L35 50 L35 78 Q28 80 25 75 Z" fill="#2d1810"/>
      {/* Face */}
      <circle cx="50" cy="42" r="17" fill="#fde4cf"/>
      {/* Eyes - big curious */}
      <circle cx="43" cy="40" r="4" fill="white"/>
      <circle cx="57" cy="40" r="4" fill="white"/>
      <circle cx="44" cy="40" r="2" fill="#4a3020"/>
      <circle cx="58" cy="40" r="2" fill="#4a3020"/>
      <circle cx="45" cy="39" r="0.8" fill="white"/>
      <circle cx="59" cy="39" r="0.8" fill="white"/>
      {/* Small smile */}
      <path d="M46 49 Q50 52 54 49" stroke="#c5846d" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      {/* Blush */}
      <circle cx="38" cy="46" r="3" fill="#fda4af" opacity="0.4"/>
      <circle cx="62" cy="46" r="3" fill="#fda4af" opacity="0.4"/>
      {/* Body */}
      <rect x="36" y="58" width="28" height="20" rx="4" fill="#c084fc"/>
    </svg>
  );
}

export function BachAvatar({ size = 60 }: AvatarProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="48" fill="#0f172a"/>
      {/* Robot head */}
      <rect x="32" y="22" width="36" height="30" rx="6" fill="#64748b" stroke="#94a3b8" strokeWidth="1.5"/>
      {/* Antenna */}
      <line x1="50" y1="22" x2="50" y2="12" stroke="#94a3b8" strokeWidth="2"/>
      <circle cx="50" cy="10" r="3" fill="#f97316"/>
      {/* Eyes - laser */}
      <rect x="38" y="32" width="8" height="6" rx="1" fill="#0ea5e9"/>
      <rect x="54" y="32" width="8" height="6" rx="1" fill="#0ea5e9"/>
      {/* Laser glow */}
      <rect x="39" y="33" width="3" height="2" rx="0.5" fill="white" opacity="0.6"/>
      <rect x="55" y="33" width="3" height="2" rx="0.5" fill="white" opacity="0.6"/>
      {/* Mouth - digital */}
      <rect x="40" y="44" width="20" height="3" rx="1" fill="#0ea5e9" opacity="0.7"/>
      {/* Body */}
      <rect x="34" y="55" width="32" height="24" rx="4" fill="#475569" stroke="#94a3b8" strokeWidth="1"/>
      {/* Chest light */}
      <circle cx="50" cy="67" r="4" fill="#f97316" opacity="0.8"/>
    </svg>
  );
}

export function DungAvatar({ size = 60 }: AvatarProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="48" fill="#1e3a5f"/>
      {/* Cap */}
      <ellipse cx="50" cy="25" rx="22" ry="8" fill="#1e293b"/>
      <rect x="30" y="18" width="40" height="10" rx="2" fill="#1e293b"/>
      <rect x="50" y="18" width="20" height="3" fill="#334155"/>
      {/* Face */}
      <circle cx="50" cy="42" r="18" fill="#f5d5b8"/>
      {/* Glasses */}
      <rect x="34" y="36" width="12" height="10" rx="2" fill="none" stroke="#1e293b" strokeWidth="2"/>
      <rect x="54" y="36" width="12" height="10" rx="2" fill="none" stroke="#1e293b" strokeWidth="2"/>
      <line x1="46" y1="41" x2="54" y2="41" stroke="#1e293b" strokeWidth="2"/>
      {/* Eyes behind glasses */}
      <circle cx="40" cy="41" r="2" fill="#1e293b"/>
      <circle cx="60" cy="41" r="2" fill="#1e293b"/>
      {/* Determined mouth */}
      <line x1="44" y1="52" x2="56" y2="52" stroke="#c5846d" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Body - formal */}
      <rect x="34" y="60" width="32" height="22" rx="4" fill="#1e40af"/>
      {/* Tie */}
      <polygon points="50,62 47,70 50,80 53,70" fill="#ef4444"/>
    </svg>
  );
}

export function TomAvatar({ size = 60 }: AvatarProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="48" fill="#0c4a6e"/>
      {/* Tail */}
      <path d="M50 80 Q45 90 35 88 Q25 85 20 78" stroke="#fb923c" strokeWidth="3" fill="none" strokeLinecap="round"/>
      {/* Body */}
      <ellipse cx="50" cy="55" rx="18" ry="24" fill="#fdba74" stroke="#f97316" strokeWidth="1.5"/>
      {/* Shell segments */}
      <path d="M32 50 Q50 45 68 50" stroke="#f97316" strokeWidth="1" opacity="0.5"/>
      <path d="M33 58 Q50 53 67 58" stroke="#f97316" strokeWidth="1" opacity="0.5"/>
      <path d="M34 66 Q50 61 66 66" stroke="#f97316" strokeWidth="1" opacity="0.5"/>
      {/* Eyes on stalks */}
      <line x1="42" y1="35" x2="38" y2="24" stroke="#f97316" strokeWidth="2"/>
      <line x1="58" y1="35" x2="62" y2="24" stroke="#f97316" strokeWidth="2"/>
      <circle cx="38" cy="22" r="4" fill="white" stroke="#f97316" strokeWidth="1"/>
      <circle cx="62" cy="22" r="4" fill="white" stroke="#f97316" strokeWidth="1"/>
      <circle cx="39" cy="22" r="2" fill="#1e293b"/>
      <circle cx="63" cy="22" r="2" fill="#1e293b"/>
      {/* Little legs */}
      <line x1="38" y1="70" x2="30" y2="82" stroke="#f97316" strokeWidth="2" strokeLinecap="round"/>
      <line x1="44" y1="74" x2="38" y2="86" stroke="#f97316" strokeWidth="2" strokeLinecap="round"/>
      <line x1="62" y1="70" x2="70" y2="82" stroke="#f97316" strokeWidth="2" strokeLinecap="round"/>
      <line x1="56" y1="74" x2="62" y2="86" stroke="#f97316" strokeWidth="2" strokeLinecap="round"/>
      {/* Happy face */}
      <path d="M45 40 Q50 44 55 40" stroke="#7c2d12" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

export function EngineAvatar({ size = 60 }: AvatarProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="48" fill="#0f172a"/>
      {/* CPU outline */}
      <rect x="25" y="25" width="50" height="50" rx="4" fill="#1e293b" stroke="#f97316" strokeWidth="2"/>
      {/* CPU pins */}
      <line x1="35" y1="25" x2="35" y2="18" stroke="#94a3b8" strokeWidth="2"/>
      <line x1="50" y1="25" x2="50" y2="18" stroke="#94a3b8" strokeWidth="2"/>
      <line x1="65" y1="25" x2="65" y2="18" stroke="#94a3b8" strokeWidth="2"/>
      <line x1="35" y1="75" x2="35" y2="82" stroke="#94a3b8" strokeWidth="2"/>
      <line x1="50" y1="75" x2="50" y2="82" stroke="#94a3b8" strokeWidth="2"/>
      <line x1="65" y1="75" x2="65" y2="82" stroke="#94a3b8" strokeWidth="2"/>
      <line x1="25" y1="35" x2="18" y2="35" stroke="#94a3b8" strokeWidth="2"/>
      <line x1="25" y1="50" x2="18" y2="50" stroke="#94a3b8" strokeWidth="2"/>
      <line x1="25" y1="65" x2="18" y2="65" stroke="#94a3b8" strokeWidth="2"/>
      <line x1="75" y1="35" x2="82" y2="35" stroke="#94a3b8" strokeWidth="2"/>
      <line x1="75" y1="50" x2="82" y2="50" stroke="#94a3b8" strokeWidth="2"/>
      <line x1="75" y1="65" x2="82" y2="65" stroke="#94a3b8" strokeWidth="2"/>
      {/* Inner die */}
      <rect x="35" y="35" width="30" height="30" rx="2" fill="#334155"/>
      {/* Circuit lines */}
      <path d="M40 50 L45 50 L48 45 L52 55 L55 50 L60 50" stroke="#f97316" strokeWidth="1.5" fill="none"/>
      {/* AI text */}
      <text x="50" y="68" textAnchor="middle" fill="#f97316" fontSize="8" fontWeight="bold" fontFamily="monospace">ENGINE</text>
    </svg>
  );
}

export function getBotAvatar(avatarId: string, size?: number) {
  const s = size || 60;
  switch (avatarId) {
    case 'duy': return <DuyAvatar size={s} />;
    case 'thai': return <ThaiAvatar size={s} />;
    case 'han': return <HanAvatar size={s} />;
    case 'bach': return <BachAvatar size={s} />;
    case 'dung': return <DungAvatar size={s} />;
    case 'tom': return <TomAvatar size={s} />;
    case 'engine': return <EngineAvatar size={s} />;
    default: return <EngineAvatar size={s} />;
  }
}
