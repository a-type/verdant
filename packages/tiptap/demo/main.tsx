import { ReactNode, StrictMode, Suspense, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

import { EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { NodeIdExtension } from '../src/plugins.js';
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
		authEndpoint: `http://localhost:3242/auth/tiptap?userId=${userId}`,
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

	const editor = useSyncedEditor(post, 'requiredBody', {
		editorOptions: { extensions: [StarterKit, NodeIdExtension()] },
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

	const editor = useSyncedEditor(post, 'nullableBody', {
		editorOptions: { extensions: [StarterKit, NodeIdExtension()] },
		nullDocumentDefault: {
			type: 'doc',
			content: [],
			attrs: {},
			from: null,
			to: null,
			text: null,
			marks: [],
		},
	});

	return (
		<EditorContent
			editor={editor}
			style={{ width: 500, height: 300, border: '1px solid black' }}
		/>
	);
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
					<h1>Required Editor</h1>
					<RequiredEditor />
					<h1>Nullable Editor</h1>
					<NullableEditor />
					<h1>Document snapshot</h1>
					<SnapshotDisplay />
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
