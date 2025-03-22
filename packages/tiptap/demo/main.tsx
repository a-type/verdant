import { ReactNode, StrictMode, Suspense, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useSyncedEditor } from '../src/react.js';
import { ClientDescriptor, createHooks } from './store/index.js';

let userId = localStorage.getItem('verdant-userId');
if (!userId) {
	userId = Math.random().toString(36).slice(2);
	localStorage.setItem('verdant-userId', userId);
}

const clientDesc = new ClientDescriptor({
	namespace: 'tiptap-demo',
	sync: {
		defaultProfile: {},
		initialPresence: {},
		authEndpoint: `http://localhost:3234/auth/tiptap?userId=${userId}`,
	},
});

const hooks = createHooks();

function DefaultPostCreator({ children }: { children: ReactNode }) {
	const post = hooks.usePost('default');

	const client = hooks.useClient();
	useEffect(() => {
		if (!post) {
			client.posts.put({ id: 'default' });
		}
	}, [post, client]);

	if (!post) return <div>Loading...</div>;
	return (
		<div>
			<button
				onClick={() => {
					client.posts.delete('default');
				}}
			>
				Reset
			</button>
			{children}
		</div>
	);
}

function SnapshotDisplay() {
	const post = hooks.usePost('default')!;
	hooks.useWatch(post, { deep: true });
	return <pre>{JSON.stringify(post.getSnapshot(), null, 2)}</pre>;
}

function RequiredEditor() {
	const post = hooks.usePost('default')!;
	hooks.useWatch(post);

	const editor = useSyncedEditor(post, 'requiredBody', {
		editorOptions: { extensions: [StarterKit] },
		files: post.get('files'),
	});

	return (
		<EditorContent
			editor={editor}
			style={{ width: 500, height: 300, border: '1px solid black' }}
		/>
	);
}

function NullableEditor() {
	const post = hooks.usePost('default')!;
	hooks.useWatch(post);

	const editor = useSyncedEditor(post, 'nullableBody', {
		editorOptions: { extensions: [StarterKit] },
		nullDocumentDefault: {
			type: 'doc',
			content: [],
			attrs: {},
			from: null,
			to: null,
			text: null,
			marks: [],
		},
		files: post.get('files'),
	});

	return (
		<EditorContent
			editor={editor}
			style={{ width: 500, height: 300, border: '1px solid black' }}
		/>
	);
}

function RenderButton() {
	const post = hooks.usePost('default')!;
	const [html, setHtml] = useState('');

	const renderPost = async () => {
		const snapshot = post.getSnapshot();
		const res = await fetch(`http://localhost:3234/render`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ doc: snapshot.requiredBody, libraryId: 'tiptap' }),
		});
		const text = await res.text();
		setHtml(text);
	};

	if (post) {
		return (
			<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
				<button onClick={renderPost}>Render</button>
				{html && <iframe srcDoc={html} style={{ width: 400, height: 400 }} />}
			</div>
		);
	}

	return null;
}

function SuspenseChecker() {
	console.log('suspended');
	return <div>Loading...</div>;
}

function App() {
	return (
		<hooks.Provider value={clientDesc} sync>
			<Suspense fallback={<SuspenseChecker />}>
				<DefaultPostCreator>
					<h2>Required Editor</h2>
					<RequiredEditor />
					<h2>Nullable Editor</h2>
					<NullableEditor />
					<h2>Document snapshot</h2>
					<SnapshotDisplay />
					<h2>Server rendering</h2>
					<RenderButton />
				</DefaultPostCreator>
			</Suspense>
		</hooks.Provider>
	);
}

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
