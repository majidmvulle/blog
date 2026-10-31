import type { Loader } from 'astro/loaders';

/**
 * Loads published posts from the shared Strapi instance (project "majid").
 * Options come from env vars in content.config.ts (see README).
 */
export type StrapiLoaderOptions = {
	/** e.g. https://strapi.example.com */
	url: string;
	/** Read-only API token for the majid project */
	token?: string;
	/** Cloudflare Access service token, when the API sits behind Access */
	cfAccessClientId?: string;
	cfAccessClientSecret?: string;
};

type StrapiMedia = { url: string; alternativeText?: string | null } | null;

type StrapiPost = {
	documentId: string;
	title: string;
	slug: string;
	description: string;
	body: string | null;
	cover: StrapiMedia;
	publishDate: string | null;
	updatedDate: string | null;
	publishedAt: string;
	updatedAt: string;
};

type StrapiList<T> = {
	data: T[];
	meta: { pagination: { page: number; pageCount: number } };
};

const PAGE_SIZE = 100;

export function strapiPostsLoader(options: StrapiLoaderOptions): Loader {
	return {
		name: 'strapi-majid-posts',
		async load({ store, parseData, renderMarkdown, generateDigest, logger }) {
			const baseUrl = options.url.replace(/\/+$/, '');
			if (!options.token) {
				throw new Error('STRAPI_URL is set but STRAPI_TOKEN is missing.');
			}

			const headers: Record<string, string> = { Authorization: `Bearer ${options.token}` };
			if (options.cfAccessClientId && options.cfAccessClientSecret) {
				headers['CF-Access-Client-Id'] = options.cfAccessClientId;
				headers['CF-Access-Client-Secret'] = options.cfAccessClientSecret;
			}

			const posts: StrapiPost[] = [];
			for (let page = 1, pageCount = 1; page <= pageCount; page++) {
				const url = new URL(`${baseUrl}/api/majid-posts`);
				url.searchParams.set('populate[0]', 'cover');
				url.searchParams.set('pagination[page]', String(page));
				url.searchParams.set('pagination[pageSize]', String(PAGE_SIZE));
				const res = await fetch(url, { headers });
				if (!res.ok) {
					throw new Error(`Strapi returned ${res.status} for ${url.pathname}: ${await res.text()}`);
				}
				const json = (await res.json()) as StrapiList<StrapiPost>;
				posts.push(...json.data);
				pageCount = json.meta.pagination.pageCount;
			}

			store.clear();
			for (const post of posts) {
				const coverUrl = post.cover?.url;
				const data = await parseData({
					id: post.slug,
					data: {
						title: post.title,
						description: post.description,
						pubDate: post.publishDate ?? post.publishedAt,
						updatedDate: post.updatedDate ?? undefined,
						// Local-provider uploads are relative ("/uploads/..."); S3 ones are absolute.
						heroImage: coverUrl ? new URL(coverUrl, `${baseUrl}/`).toString() : undefined,
					},
				});
				const body = post.body ?? '';
				store.set({
					id: post.slug,
					data,
					body,
					rendered: await renderMarkdown(body),
					digest: generateDigest({ ...post }),
				});
			}
			logger.info(`Loaded ${posts.length} post(s) from Strapi`);
		},
	};
}
