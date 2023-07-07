import { TodoList } from '@/components/todos/TodoList.jsx';

export interface HomePageProps {}

export function HomePage({}: HomePageProps) {
	return (
		<div>
			<h1>Hello Verdant!</h1>
			<TodoList />
		</div>
	);
}

export default HomePage;
