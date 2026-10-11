"use client";

import { useState } from "react";

type Props = {
	language: string;
	code: string;
	highlightedHtml: string;
};

export default function CodeBlock({ language, code, highlightedHtml }: Props) {
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(code);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error("Failed to copy text: ", err);
		}
	};

	return (
		<div className="code-block">
			<div className="code-block__header">
				<span className="code-block__language">{language}</span>
				<button
					type="button"
					onClick={handleCopy}
					className="code-block__copy"
					aria-label={copied ? "코드 복사 완료" : "코드 복사"}
				>
					<span aria-live="polite">{copied ? "Copied!" : "Copy"}</span>
				</button>
			</div>
			<pre
				className="code-block__pre"
				tabIndex={0}
				role="region"
				aria-label={`${language} 코드`}
			>
				<code dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
			</pre>
		</div>
	);
}
