import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

import styles from './index.module.css';

import CodeBlock from '@theme/CodeBlock';
import Layout from '@theme/Layout';

function HomepageHeader() {
	const { siteConfig } = useDocusaurusContext();
	return (
		<main className={styles.main}>
			<header className={clsx('hero', styles.heroBanner)}>
				<div className={styles.scene}>
					<video
						autoPlay
						muted
						loop
						src="/Silence-sm.m4v"
						className={styles.video}
					/>
				</div>
				<div className={clsx('container', styles.heroContent)}>
					<h1 className={styles.title}>{siteConfig.title}</h1>
					<h2 className={styles.subtitle}>
						is a framework and philosophy for small, sustainable, human web apps
					</h2>
					<div className={styles.buttons}>
						<Link
							className="button button--secondary button--lg"
							to="/docs/intro"
						>
							Quick Start
						</Link>
					</div>
				</div>
			</header>
			<section className={styles.features}>
				<div className={styles.featureStep}>
					<div className={styles.featureStepInfo}>
						<h3>Build a schema</h3>
						<ul>
							<li>Define model fields, defaults, and query indexes</li>
							<li>
								Schemas are TypeScript, so you can use familiar code and modules
							</li>
							<li>Create migrations as your schema evolves</li>
						</ul>
					</div>
					<div className={styles.featureStepCode}>
						<CodeBlock language="typescript" showLineNumbers title="schema.ts">
							{`import {
	collection,
	schema
} from '@verdant/web';
import cuid from 'cuid';

const posts = collection({
	name: 'post',
	primaryKey: 'id',
	fields: {
		id: {
			type: 'string',
			default: cuid,
		},
		title: {
			type: 'string',
		},
		body: {
			type: 'string',
		},
		createdAt: {
			type: 'number',
			default: Date.now,
		},
		image: {
			type: 'file',
			nullable: true,
		}
	},
});

export default schema({
	version: 1,
	collections: {
		posts
	}
});
`}
						</CodeBlock>
					</div>
				</div>
				<div className={clsx(styles.featureStep, styles.featureStepReverse)}>
					<div className={styles.featureStepInfo}>
						<h3>Generate a client</h3>
						<ul>
							<li>Generated code is type-safe to your schema</li>
							<li>Queries and models are reactive</li>
							<li>React hook bindings included</li>
						</ul>
					</div>
					<div className={styles.featureStepCode}>
						<CodeBlock language="typescript" showLineNumbers title="client.ts">
							{`import {
	ClientDescriptor,
	createHooks,
	migrations
} from './generated.js';

export const clientDescriptor =
	new ClientDescriptor({
		migrations,
		namespace: 'demo',
	})

export const hooks = createHooks();

async function getAllPosts() {
	const client = await
		clientDescriptor.open();
	const posts = await client.posts
		.findAll().resolved;
	return posts;
}
`}
						</CodeBlock>
					</div>
				</div>
				<div className={styles.featureStep}>
					<div className={styles.featureStepInfo}>
						<h3>Store local data</h3>
						<ul>
							<li>
								Store data in IndexedDB, no server or internet connection
								required
							</li>
							<li>Undo/redo and optimistic updates out of the box</li>
							<li>Assign files directly to model fields</li>
						</ul>
					</div>
					<div className={styles.featureStepCode}>
						<CodeBlock language="typescript" showLineNumbers title="app.tsx">
							{`import {
	hooks,
	clientDescriptor
} from './client.js';

export function App() {
	return (
		<Suspense>
			<hooks.Provider
				value={clientDescriptor}>
				<Posts />
			</hooks.Provider>
		</Suspense>
	);
}

function Posts() {
	const posts = hooks.useAllPosts();
	return (
		<ul>
			{posts.map((post) => (
				<Post
					key={post.get('id')}
					post={post}
				/>
			))}
		</ul>
	);
}

function Post({ post }) {
	const {
		title,
		body,
		image
	} = hooks.useWatch(post);

	return (
		<li>
			<input
				value={title}
				onChange={(e) => post.set(
					'title', e.target.value
				)}
			/>
			<textarea
				value={body}
				onChange={(e) => post.set(
					'body',
					e.target.value
				)}
			/>
			<input
				type="file"
				onChange={(e) => post.set(
					'image',
					e.target.files[0]
				)}
			/>
			{image &&
				<img src={image.url} />
			}
		</li>
	);
}
`}
						</CodeBlock>
					</div>
				</div>
				<div className={clsx(styles.featureStep, styles.featureStepReverse)}>
					<div className={clsx(styles.featureStepInfo)}>
						<h3>Sync with a server</h3>
						<ul>
							<li>Access data across devices</li>
							<li>Share a library with collaborators</li>
							<li>Peer presence data and profile info</li>
							<li>Works realtime, pull-based, even switching dynamically</li>
						</ul>
					</div>
					<div className={styles.featureStepCode}>
						<CodeBlock language="typescript" showLineNumbers title="server.ts">
							{`import { Server } from '@verdant/server';

const server = new Server({
	databaseFile: 'db.sqlite',
	tokenSecret: 'secret',
	profiles: {
		get: async (userId: string) => {
			return {
				id: userId,
			}
		}
	}
});

server.listen(3000);
`}
						</CodeBlock>
					</div>
				</div>
			</section>
			<section style={{ marginBottom: '80px' }}>
				<div className={styles.buttons}>
					<Link
						className="button button--secondary button--lg"
						to="/docs/intro"
					>
						Get Started
					</Link>
				</div>
			</section>
		</main>
	);
}

export default function Home(): JSX.Element {
	return (
		<Layout>
			<HomepageHeader />
		</Layout>
	);
}
