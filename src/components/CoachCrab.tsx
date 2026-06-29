import { motion } from 'framer-motion';

interface CoachCrabProps {
  size?: number;
  className?: string;
  animate?: boolean;
}

export default function CoachCrab({ size = 80, className = '', animate = true }: CoachCrabProps) {
  const crab = (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        {/* Gradient cho Thân và Chân Cua */}
        <linearGradient id="crabBodyGrad" x1="60" y1="50" x2="60" y2="92" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF6B4A" />
          <stop offset="100%" stopColor="#E03E1A" />
        </linearGradient>

        {/* Gradient cho Càng Cua Trái */}
        <linearGradient id="leftClawGrad" x1="24" y1="32" x2="20" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF7A5C" />
          <stop offset="100%" stopColor="#D6330C" />
        </linearGradient>

        {/* Gradient cho Càng Cua Phải */}
        <linearGradient id="rightClawGrad" x1="96" y1="32" x2="100" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF7A5C" />
          <stop offset="100%" stopColor="#D6330C" />
        </linearGradient>

        {/* Shadow nhẹ dưới mắt */}
        <filter id="eyeShadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1" floodColor="#0F172A" floodOpacity="0.08" />
        </filter>
      </defs>

      {/* LAYER 1: CHÂN CUA (Bo tròn tối giản, đặt phía sau thân) */}
      <g stroke="#D6330C" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round">
        {/* Chân trái */}
        <path d="M35 76 C20 81 14 93 19 101" />
        <path d="M40 81 C27 89 21 101 29 107" />
        {/* Chân phải */}
        <path d="M85 76 C100 81 106 93 101 101" />
        <path d="M80 81 C93 89 99 101 91 107" />
      </g>

      {/* LAYER 2: CÁNH TAY & CÀNG CUA MÁY */}
      {/* Tay nối */}
      <path d="M26 65 Q10 59 19 47" stroke="#C22D0A" strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d="M94 65 Q110 59 101 47" stroke="#C22D0A" strokeWidth="6" strokeLinecap="round" fill="none" />
      
      {/* Càng Cua hình khối cao cấp */}
      {/* Càng trái */}
      <path d="M24 31 C36 31 39 48 26 57 C13 63 7 50 11 39 C13 33 18 31 24 31 Z" fill="url(#leftClawGrad)" />
      <path d="M11 39 C10 30 19 25 23 32" stroke="#FFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" fill="none" />
      <path d="M13 41 C11 34 18 28 22 34" stroke="#C22D0A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      
      {/* Càng phải */}
      <path d="M96 31 C84 31 81 48 94 57 C107 63 113 50 109 39 C107 33 102 31 96 31 Z" fill="url(#rightClawGrad)" />
      <path d="M109 39 C110 30 101 25 97 32" stroke="#FFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" fill="none" />
      <path d="M107 41 C109 34 102 28 98 34" stroke="#C22D0A" strokeWidth="2.5" strokeLinecap="round" fill="none" />

      {/* LAYER 3: THÂN CHÍNH (Squircle với chuyển màu gradient tạo khối) */}
      {/* Đổ bóng phẳng phía dưới thân */}
      <rect x="28" y="55" width="64" height="42" rx="21" fill="#BC2B09" />
      {/* Thân chính */}
      <rect x="28" y="50" width="64" height="42" rx="21" fill="url(#crabBodyGrad)" />

      {/* LAYER 4: ĐÔI MẮT MASCOT (To, long lanh, hướng góc nhìn vào giữa để tạo vẻ thông minh) */}
      {/* Mắt trái */}
      <g filter="url(#eyeShadow)">
        <circle cx="47" cy="41" r="10.5" fill="white" />
        <circle cx="49" cy="41" r="5.5" fill="#0F172A" />
        <circle cx="51.5" cy="38.5" r="2" fill="white" /> {/* Điểm sáng mắt to hơn tí */}
      </g>

      {/* Mắt phải */}
      <g filter="url(#eyeShadow)">
        <circle cx="73" cy="41" r="10.5" fill="white" />
        <circle cx="71" cy="41" r="5.5" fill="#0F172A" />
        <circle cx="68.5" cy="38.5" r="2" fill="white" />
      </g>

      {/* LAYER 5: BIỂU CẢM KHUÔN MẶT */}
      {/* Má hồng dễ thương */}
      <circle cx="39" cy="63" r="3.5" fill="#C22D0A" opacity="0.4" />
      <circle cx="81" cy="63" r="3.5" fill="#C22D0A" opacity="0.4" />
      {/* Miệng cười tinh nghịch sắc nét */}
      <path d="M55 64 Q60 70 65 64" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" fill="none" />

      {/* LAYER 6: MŨ TỐT NGHIỆP CỦA "COACH" */}
      <g transform="translate(60, 25) rotate(5) translate(-60, -25)">
        {/* Chân mũ */}
        <path d="M45 21 v5 C45 29 75 29 75 26 v-5" fill="#0F172A" />
        <path d="M45 24 v2 C45 28 75 28 75 26 v-2" fill="#1E293B" /> {/* Line highlight chân mũ */}
        
        {/* Mặt mũ hình thoi */}
        <polygon points="60,9 37,19 60,29 83,19" fill="#1E293B" />
        <polygon points="60,9 41,18 60,26 79,18" fill="#0F172A" />
        
        {/* Tua mũ màu Vàng Gold sang xịn */}
        <path d="M74 19 L85 26 L83 34" stroke="#F59E0B" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="83" cy="35" r="2.5" fill="#F59E0B" />
      </g>
    </svg>
  );

  if (animate) {
    return (
      <motion.div
        animate={{ 
          y: [0, -6, 0],
          rotate: [0, 1.5, -1.5, 0]
        }}
        transition={{ 
          duration: 3.5, 
          repeat: Infinity, 
          ease: 'easeInOut' 
        }}
        style={{ display: 'inline-block' }}
      >
        {crab}
      </motion.div>
    );
  }

  return crab;
}