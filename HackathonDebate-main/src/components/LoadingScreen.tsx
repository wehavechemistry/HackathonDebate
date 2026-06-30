import { motion } from 'framer-motion';
import CoachCrab from './CoachCrab';

export default function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <CoachCrab size={80} animate={true} />
      <motion.div
        className="mt-6 flex gap-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-orange-400 rounded-full"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </motion.div>
    </div>
  );
}
