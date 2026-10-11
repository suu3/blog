"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { css, cx } from "@/styled-system/css";

type Props = {
	text: string;
	className?: string;
};

const EASE = [0.22, 1, 0.36, 1] as const;

const charVariants: Variants = {
	hidden: { opacity: 0, y: "0.45em", filter: "blur(6px)" },
	visible: (index: number) => ({
		opacity: 1,
		y: 0,
		filter: "blur(0px)",
		transition: { duration: 0.6, delay: index * 0.045, ease: EASE },
	}),
	hover: (index: number) => ({
		y: [0, -3, 0],
		transition: { duration: 0.45, delay: index * 0.03, ease: "easeInOut" },
	}),
};

const dotVariants: Variants = {
	hidden: { opacity: 0, scale: 0 },
	visible: (index: number) => ({
		opacity: 1,
		scale: 1,
		transition: {
			type: "spring",
			stiffness: 420,
			damping: 14,
			delay: index * 0.045 + 0.25,
		},
	}),
	hover: (index: number) => ({
		scale: [1, 1.5, 1],
		transition: { duration: 0.45, delay: index * 0.03, ease: "easeInOut" },
	}),
};

export default function SplitText({ text, className }: Props) {
	const reduceMotion = useReducedMotion();

	return (
		<motion.span
			initial={reduceMotion ? false : "hidden"}
			animate="visible"
			whileHover={reduceMotion ? undefined : "hover"}
			className={cx(
				css({
					position: "relative",
					display: "inline-flex",
					alignItems: "center",
					py: "0.125rem",
					color: "var(--text)",
					fontFamily: "var(--y2k-display)",
					fontWeight: "900",
					lineHeight: "1.1",
				}),
				className,
			)}
		>
			<span className={css({ srOnly: true })}>{text}</span>
			{text.split("").map((char, index) => {
				const isDot = char === ".";

				return (
					<motion.span
						key={`${char}-${index}`}
						aria-hidden
						custom={index}
						variants={isDot ? dotVariants : charVariants}
						className={css({
							display: "inline-block",
							willChange: "transform, opacity, filter",
							transformOrigin: "50% 80%",
						})}
						style={{
							color: isDot ? "var(--theme)" : undefined,
							marginLeft: char === " " ? "0.25rem" : undefined,
						}}
					>
						{char}
					</motion.span>
				);
			})}
		</motion.span>
	);
}
