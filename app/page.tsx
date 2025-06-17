"use client";

import { motion } from "framer-motion";
import { colors } from "./colors";

export default function Home() {
  const currentYear = new Date().getFullYear();

  return (
    <div style={{ backgroundColor: colors.darkprimary }} className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col  row-start-2 items-center leading-[30px]">
        <motion.h1 style={{ color: colors.whightprimary }} className="font-bold"
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Welcome to the Momentum Automated Control Center
        </motion.h1>
        <motion.h2 style={{ color: colors.whightprimary }} className=""
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          Made To Extract As Much Wealth As Possible From The Market
        </motion.h2>
      </main>
      <motion.footer 
        style={{ color: colors.whightprimary }} 
        className="row-start-3 text-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        Built by Twezo x Caveman Creative © {currentYear}
      </motion.footer>
    </div>
  );
  
}
