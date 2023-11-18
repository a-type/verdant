import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import child from 'child_process';
import url from 'url';

// mjs dirname
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

puppeteer
	.launch({
		headless: 'new',
		ignoreDefaultArgs: ['--disable-extensions'],
		args: ['--js-flags=--expose-gc'],
	})
	.then(async (browser) => {
		console.log('Beginning perf test run');
		const page = await browser.newPage();
		await page.goto(`file://${path.join(__dirname, 'index.html')}`);
		// run a loop taking heap profiles
		let maxHeap = 0;
		const interval = setInterval(async () => {
			try {
				const { JSHeapUsedSize } = await page.metrics();
				maxHeap = Math.max(maxHeap, JSHeapUsedSize);
				console.log('Heap size:', JSHeapUsedSize);
			} catch (err) {}
		}, 50);

		// wait for #result element to appear
		await page.waitForSelector('#result', {
			timeout: 10 * 60 * 1000,
		});

		clearInterval(interval);

		// trigger GC and wait for it to finish
		await page.evaluate(() => {
			window.gc();
		});

		const prototype = await page.evaluateHandle(() => {
			return Object.prototype;
		});
		const objects = await page.queryObjects(prototype);
		const numberOfObjects = await page.evaluate(
			(instances) => instances.length,
			objects,
		);

		await prototype.dispose();
		await objects.dispose();

		// get results and write to file
		const results = await page.evaluate(() => {
			return JSON.parse(
				document.querySelector('#result').textContent ?? 'null',
			);
		});
		if (results) {
			results.maxHeap = maxHeap;
			results.allocatedObjects = numberOfObjects;

			const now = new Date().toISOString().replace(/:/g, '-');
			const sha = child.execSync('git rev-parse HEAD').toString().trim();
			const filename = `${now}.${sha}.run.json`;
			fs.mkdirSync(path.resolve(__dirname, 'results'), { recursive: true });
			fs.writeFileSync(
				path.resolve(__dirname, 'results', filename),
				JSON.stringify(results),
			);
			console.log(`Wrote results to ${filename}`);
		} else {
			console.log('No results found');
			process.exit(1);
		}

		await browser.close();
		process.exit(0);
	});
