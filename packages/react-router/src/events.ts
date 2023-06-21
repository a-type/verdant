export class WillNavigateEvent extends CustomEvent<{}> {
	constructor(detail: {} = {}) {
		super('willnavigate', {
			detail,
		});
	}
}
