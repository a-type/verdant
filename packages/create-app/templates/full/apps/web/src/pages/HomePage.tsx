import { Link } from 'react-router-dom';
import { TodoList } from '@/components/todos/TodoList.jsx';

export interface HomePageProps {}

export function HomePage({}: HomePageProps) {
  return (
    <div>
      <h1>Hello lo-fi!</h1>
      <ul>
        <li>
          <Link to="/join">Login or sign up</Link>
        </li>
        <li>
          <Link to="/settings">Settings</Link>
        </li>
      </ul>
      <TodoList />
    </div>
  );
}

export default HomePage;
