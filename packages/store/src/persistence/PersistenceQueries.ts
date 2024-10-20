import { PersistenceQueryDb } from './interfaces.js';
import { Context } from '../context/context.js';
import { Disposable } from '../utils/Disposable.js';

export class PersistenceQueries extends Disposable {
	constructor(
		private db: PersistenceQueryDb,
		private ctx: Omit<Context, 'queries'>,
	) {
		super();
		this.compose(this.db);
	}

	reset = this.db.reset.bind(this.db);

	saveEntities = this.db.saveEntities;

	findOneOid = this.db.findOneOid.bind(this.db);
	findAllOids = this.db.findAllOids.bind(this.db);

	stats = this.db.stats.bind(this.db);
}
