import { expect, it, vitest } from 'vitest';
import { createTestContext } from './lib/createTestContext.js';
import { waitForMockCall, waitForOnline } from './lib/waits.js';

const ctx = createTestContext();

it('can send and receive transient messages', async () => {
	const clientA = await ctx.createTestClient({
		library: 'messages',
		user: 'A',
	});

	const clientB = await ctx.createTestClient({
		library: 'messages',
		user: 'B',
	});

	const clientC = await ctx.createTestClient({
		library: 'messages',
		user: 'C',
	});

	clientA.sync.start();
	clientB.sync.start();
	clientC.sync.start();

	await waitForOnline(clientA);
	await waitForOnline(clientB);
	await waitForOnline(clientC);

	const messageListenerA = vitest.fn();
	clientA.sync.subscribe('message', messageListenerA);
	const messageListenerB = vitest.fn();
	clientB.sync.subscribe('message', messageListenerB);
	const messageListenerC = vitest.fn();
	clientC.sync.subscribe('message', messageListenerC);

	await clientA.sync.sendMessage('Hi everyone!');

	await waitForMockCall(messageListenerB, 1);

	expect(messageListenerB).toHaveBeenCalledWith(
		expect.objectContaining({
			message: 'Hi everyone!',
		}),
	);

	messageListenerB.mockClear();

	// sending direct messages

	await clientA.sync.sendMessage('Hi C!', 'C');

	await waitForMockCall(messageListenerC, 1);

	expect(messageListenerC).toHaveBeenCalledWith(
		expect.objectContaining({
			message: 'Hi C!',
			fromUserId: 'A',
		}),
	);

	messageListenerC.mockClear();

	expect(messageListenerA).not.toHaveBeenCalled();

	// it can queue direct messages for offline / pull sync users
	clientA.sync.stop();
	await waitForOnline(clientA, false);

	await clientB.sync.sendMessage('Hi A!', 'A');

	clientA.sync.start();
	await waitForOnline(clientA);

	await waitForMockCall(messageListenerA, 1);

	expect(messageListenerA).toHaveBeenCalledWith(
		expect.objectContaining({
			message: 'Hi A!',
			fromUserId: 'B',
		}),
	);
});
