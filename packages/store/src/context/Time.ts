import { TimestampProvider } from '@verdant-web/common';

export class Time {
	private overrideNow?: () => string;
	constructor(
		private base: TimestampProvider,
		private version: number,
	) {}

	get now() {
		return this.overrideNow ? this.overrideNow() : this.base.now(this.version);
	}

	withMigrationTime = async (version: number, run: () => Promise<void>) => {
		this.overrideNow = () => {
			return this.base.zero(version);
		};
		await run();
		this.overrideNow = undefined;
	};

	update = this.base.update.bind(this.base);

	nowWithVersion = (version: number) => {
		return this.base.now(version);
	};

	get zero() {
		return this.base.zero(this.version);
	}

	zeroWithVersion = (version: number) => {
		return this.base.zero(version);
	};
}
