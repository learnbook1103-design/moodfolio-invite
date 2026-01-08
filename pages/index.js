import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';

import { supabase } from '../lib/supabase';
import { getPortfolios } from '../lib/db';

export default function Home() {
    const router = useRouter();
    const [isOn, setIsOn] = useState(false);

    // 스위치를 켜면 실행되는 함수
    const toggleSwitch = async () => {
        if (!isOn) {
            setIsOn(true);
            // "Mood On" 클릭 시 온보딩 페이지로 이동
            router.push('/onboarding');
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center relative overflow-hidden">

            {/* Notice Banner Removed */}

            {/* 우측 상단 로그인 */}
            <div className="absolute top-6 right-6 z-50">
                <Link
                    href="/login"
                    className="group flex items-center gap-1 text-xs font-medium tracking-[0.3em] text-gray-500 hover:text-white transition-colors duration-500 uppercase"
                    aria-label="로그인 페이지로 이동"
                >
                    LOG IN
                    <span className="text-emerald-500 group-hover:text-emerald-400 transition-colors duration-300 text-lg leading-none" aria-hidden="true">.</span>
                </Link>
            </div>

            {/* 중앙 타이틀 */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="text-center mb-20 flex flex-col items-center"
            >
                <h1 className="text-6xl md:text-8xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-linear-to-r from-gray-100 via-white to-gray-400 mb-6 drop-shadow-2xl">
                    MoodFolio
                </h1>
                <p className="text-xl md:text-3xl font-light text-gray-400 tracking-[0.3em] uppercase">
                    커리어에 Mood를 켜다
                </p>
            </motion.div>

            {/* 스위치 버튼 (캡슐형) */}
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="flex flex-col items-center gap-4"
            >
                <div
                    onClick={toggleSwitch}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleSwitch();
                        }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={isOn ? "무드 켜짐" : "무드 켜기"}
                    aria-pressed={isOn}
                    className={`
            w-24 h-12 flex items-center p-1 cursor-pointer transition-all duration-500
            rounded-full border
            ${isOn
                            ? "bg-emerald-900/30 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                            : "bg-white/10 border-white/20 hover:bg-white/20"
                        }
          `}
                >
                    <motion.div
                        className={`
              w-10 h-9 shadow-md flex items-center justify-center
              rounded-full transition-colors duration-300
              ${isOn ? "bg-emerald-400" : "bg-gray-300"}
            `}
                        layout
                        transition={{ type: "spring", stiffness: 600, damping: 25 }}
                        style={{
                            marginLeft: isOn ? "auto" : "0"
                        }}
                    >
                        {isOn && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-1.5 h-4 bg-white/80 rounded-full blur-[1px]" />
                        )}
                    </motion.div>
                </div>

                <p className={`text-xs uppercase tracking-widest font-medium transition-colors duration-300 ${isOn ? "text-emerald-400" : "text-gray-600"}`}>
                    {isOn ? "On" : "무드 켜기"}
                </p>
            </motion.div>

            {/* 개발자 도구 */}


        </div>
    );
}