import React from 'react';
import { motion } from 'framer-motion';
import { LayerBack, TreeLeft, TreeRight, GroundFront } from './PlaceholderAssets';

/**
 * BackgroundElements Component
 * Shared background elements for consistent positioning across pages
 * 
 * @param {boolean} animate - Whether to show initial entrance animations (default: true)
 * @param {boolean} showGround - Whether to show the ground element (default: true)
 */
export default function BackgroundElements({ animate = true, showGround = true }) {
    if (animate) {
        // With initial entrance animations (for first page load)
        return (
            <>
                {/* Background Layer */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1.5 }}
                    className="fixed inset-0 z-0 opacity-80 pointer-events-none"
                >
                    <LayerBack />
                </motion.div>

                {/* Left Tree */}
                <motion.div
                    initial={{ x: "-100%", opacity: 0 }}
                    animate={{ x: "0%", opacity: 1, rotate: [0, -1.5, 0, 1.5, 0] }}
                    style={{ transformOrigin: "bottom left" }}
                    transition={{
                        x: { delay: 0.3, duration: 1.2, ease: "easeOut" },
                        opacity: { delay: 0.3, duration: 1.2 },
                        rotate: { duration: 6, repeat: Infinity, ease: "easeInOut" }
                    }}
                    className="fixed top-[-10%] left-[-10%] w-[50%] h-[60%] z-10 pointer-events-none overflow-hidden"
                >
                    <TreeLeft />
                </motion.div>

                {/* Right Tree */}
                <motion.div
                    initial={{ x: "100%", opacity: 0 }}
                    animate={{ x: "0%", opacity: 1, rotate: [0, 1.5, 0, -1.5, 0] }}
                    style={{ transformOrigin: "bottom right" }}
                    transition={{
                        x: { delay: 0.4, duration: 1.2, ease: "easeOut" },
                        opacity: { delay: 0.4, duration: 1.2 },
                        rotate: { duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }
                    }}
                    className="fixed top-[-10%] right-[-10%] w-[50%] h-[60%] z-10 pointer-events-none overflow-hidden"
                >
                    <TreeRight />
                </motion.div>

                {/* Ground */}
                {showGround && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4, duration: 2.5, ease: "easeInOut" }}
                        className="fixed bottom-[-10%] w-full h-[30%] z-0 pointer-events-none"
                    >
                        <GroundFront />
                    </motion.div>
                )}
            </>
        );
    }

    // Without initial animations (for page transitions)
    return (
        <>
            {/* Background Layer */}
            <div className="fixed inset-0 z-0 opacity-80">
                <LayerBack />
            </div>

            {/* Left Tree - Only sway animation */}
            <motion.div
                animate={{ rotate: [0, -1.5, 0, 1.5, 0] }}
                style={{ transformOrigin: "bottom left" }}
                transition={{ rotate: { duration: 6, repeat: Infinity, ease: "easeInOut" } }}
                className="fixed top-[-10%] left-[-10%] w-[50%] h-[60%] z-10 pointer-events-none overflow-hidden"
            >
                <TreeLeft />
            </motion.div>

            {/* Right Tree - Only sway animation */}
            <motion.div
                animate={{ rotate: [0, 1.5, 0, -1.5, 0] }}
                style={{ transformOrigin: "bottom right" }}
                transition={{ rotate: { duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 } }}
                className="fixed top-[-10%] right-[-10%] w-[50%] h-[60%] z-10 pointer-events-none overflow-hidden"
            >
                <TreeRight />
            </motion.div>

            {/* Ground */}
            {showGround && (
                <div className="fixed bottom-[-10%] w-full h-[30%] z-0 pointer-events-none">
                    <GroundFront />
                </div>
            )}
        </>
    );
}
