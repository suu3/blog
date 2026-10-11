import { css } from "@/styled-system/css";
import PostSearch from "@/components/post-search";
import { getAllPosts } from "@/lib/posts";

export default function HomePage() {
	const posts = getAllPosts();

	return (
		<section
			className={css({
				mx: "auto",
				w: "full",
				maxW: "64rem",
				display: "flex",
				flexDir: "column",
				gap: "1.5rem",
			})}
		>
			<PostSearch posts={posts} />
		</section>
	);
}
