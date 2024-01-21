import { hooks, Item } from '@/store.js';

export interface TodoListProps {}

export function TodoList({}: TodoListProps) {
	const items = hooks.useAllItems({
		index: {
			where: 'createdAt',
			order: 'desc',
		},
	});

	return (
		<div>
			<h2>Todos</h2>
			<ul>
				{items.map((item) => (
					<TodoItem key={item.get('id')} item={item} />
				))}
			</ul>
			<AddTodo />
		</div>
	);
}

function TodoItem({ item }: { item: Item }) {
	const { done, content } = hooks.useWatch(item);

	return (
		<li>
			<input
				type="checkbox"
				checked={done}
				onChange={(ev) => item.set('done', !!ev.target.checked)}
			/>
			<span>{content}</span>
		</li>
	);
}

function AddTodo() {
	const client = hooks.useClient();
	return (
		<form
			onSubmit={(ev) => {
				ev.preventDefault();
				const data = new FormData(ev.currentTarget);
				const value = data.get('content');
				if (!value || typeof value !== 'string') return;
				client.items.put({
					content: value,
				});
			}}
		>
			<input type="text" name="content" />
			<button type="submit">Add</button>
		</form>
	);
}
