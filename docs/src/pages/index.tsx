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
					<h1 className={styles.title}>{siteConfig.title}🌿</h1>
					<h2 className={styles.subtitle}>
						is a framework and philosophy for small, sustainable, human web apps
					</h2>
					<div className={styles.buttons}>
						<Link
							className="button button--secondary button--lg"
							to="/docs/intro"
						>
							Read the documentation
						</Link>
					</div>
				</div>
			</header>
			<section className={styles.musing}>
				<p>
					There is a little plant on a shelf near my desk. It's no larger than
					the size of a dime. For years I've watered it, but it never changes.
					It neither grows nor dies, but it is alive.
				</p>
				<p>Some living things must wait patiently for their season.</p>
				<p>Some living things are only meant to be what they are.</p>
				<p>They are no less alive.</p>
				<p>
					<strong>Verdant</strong> is an approach to software which aims to make
					space for these overlooked forms of life. Nurture your idea at its own
					pace, free from the expectations of endless growth and pressures of
					cycles of debt.
				</p>
			</section>
			<section className={styles.explanation}>
				<p>
					<strong>Verdant</strong> gives access to this new-old way of building
					software to modern web developers, leveraging established and familiar
					technologies.
				</p>
				<p>On a technical level, it allows you to:</p>
				<ul>
					<li>
						<details>
							<summary>
								📱 <span>Run your whole web app on the user's device</span>
							</summary>
							<p>
								Using IndexedDB and built-in reactive queries and objects,{' '}
								<strong>Verdant</strong> apps feels are easy to make, fast, and
								fun.
							</p>
						</details>
					</li>
					<li>
						<details>
							<summary>
								📶 <span>Work offline and leverage advanced functionality</span>
							</summary>
							<p>
								<strong>Verdant</strong> apps can work offline when configured
								with a service worker, and feature tools like undo and file
								storage out of the box.
							</p>
						</details>
					</li>
					<li>
						<details>
							<summary>
								🔃 <span>Sync data between devices</span>
							</summary>
							<p>
								<strong>Verdant</strong> apps can sync data between devices by
								connecting to a plain Node server with a SQLite database.
								Authenticate and store additional user data using familiar
								technologies of your choosing.
							</p>
						</details>
					</li>
				</ul>
				<p>
					I made <strong>Verdant</strong> to build my cooking app{' '}
					<a href="https://gnocchi.club">Gnocchi</a>, and I've open-sourced it
					for anyone else with similar goals. My ambition is not to
					revolutionize computing, it's only to build sustainable, human apps.
				</p>
				<p>To do this, I've adopted a few principles:</p>
				<ul>
					<li>
						<details>
							<summary>
								🌿 <span>Grow at your own pace</span>
							</summary>
							<p>
								Not every idea must produce billion-dollar returns. Sometimes
								it's enough to let something exist, and see what comes of it.{' '}
								<strong>Verdant</strong> is designed to limit the cost of
								producing and maintaining small apps. The simplest, local-only{' '}
								<strong>Verdant</strong> app costs only as much as your domain
								name.
							</p>
						</details>
					</li>
					<li>
						<details>
							<summary>
								🌱 <span>Operate sustainably</span>
							</summary>
							<p>
								<strong>Verdant</strong> is designed to help you earn revenue in
								proportion to your costs, by doing the simple thing: charging
								for access to costly services, like servers. Despite manifestos
								against endless-growth-capitalism, I don't think profit is a
								dirty word. A sustainable business is one which can pay for
								itself, including your time and effort.
							</p>
						</details>
					</li>
					<li>
						<details>
							<summary>
								🚲 <span>Practicality over perfection</span>
							</summary>
							<p>
								In a vacuum, software developers gravitate toward imagined ideas
								of perfect systems. But we are human, and our users are human.
								Often what humans want is not perfection someday, but usefulness
								today. <strong>Verdant</strong> embraces simple solutions which
								produce real outcomes, and avoids complex systems pursuing
								abstract perfection.
							</p>
						</details>
					</li>
				</ul>
			</section>
			<section className={styles.features}>
				<h2 className={styles.featuresTitle}>How to use Verdant</h2>
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
} from '@verdant-web/store';
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

// React hooks are created for you
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
							{`const post = await client.posts.put({
	title: 'All the Trees of the Field will Clap their Hands',
	body: '',
});

post.set('body', 'There is a little plant on a shelf near my desk...');

fileInput.addEventListener('change', () => {
	const file = fileInput.files[0];
	post.set('image', file);
});

client.undoHistory.undo();
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
							{`import { Server } from '@verdant-web/server';

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
