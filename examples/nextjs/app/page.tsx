import Image from 'next/image';
import { Inter } from '@next/font/google';
import styles from './page.module.css';
import { hooks } from '@/stores/todo';

const inter = Inter({ subsets: ['latin'] });

export default function Home() {
	const todos = hooks.useAllItems();

	return <main className={styles.main}>{todos.length}</main>;
}
