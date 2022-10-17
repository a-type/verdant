import { importModule } from 'local-pkg';

/*
How it works:
`this.#head` is an instance of `Node` which keeps track of its current value and nests another instance of `Node` that keeps the value that comes after it. When a value is provided to `.enqueue()`, the code needs to iterate through `this.#head`, going deeper and deeper to find the last value. However, iterating through every single item is slow. This problem is solved by saving a reference to the last value as `this.#tail` so that it can reference it to add a new value.
*/

class Node {
	value;
	next;

	constructor(value) {
		this.value = value;
	}
}

class Queue {
	#head;
	#tail;
	#size;

	constructor() {
		this.clear();
	}

	enqueue(value) {
		const node = new Node(value);

		if (this.#head) {
			this.#tail.next = node;
			this.#tail = node;
		} else {
			this.#head = node;
			this.#tail = node;
		}

		this.#size++;
	}

	dequeue() {
		const current = this.#head;
		if (!current) {
			return;
		}

		this.#head = this.#head.next;
		this.#size--;
		return current.value;
	}

	clear() {
		this.#head = undefined;
		this.#tail = undefined;
		this.#size = 0;
	}

	get size() {
		return this.#size;
	}

	* [Symbol.iterator]() {
		let current = this.#head;

		while (current) {
			yield current.value;
			current = current.next;
		}
	}
}

function pLimit(concurrency) {
	if (!((Number.isInteger(concurrency) || concurrency === Number.POSITIVE_INFINITY) && concurrency > 0)) {
		throw new TypeError('Expected `concurrency` to be a number from 1 and up');
	}

	const queue = new Queue();
	let activeCount = 0;

	const next = () => {
		activeCount--;

		if (queue.size > 0) {
			queue.dequeue()();
		}
	};

	const run = async (fn, resolve, args) => {
		activeCount++;

		const result = (async () => fn(...args))();

		resolve(result);

		try {
			await result;
		} catch {}

		next();
	};

	const enqueue = (fn, resolve, args) => {
		queue.enqueue(run.bind(undefined, fn, resolve, args));

		(async () => {
			// This function needs to wait until the next microtask before comparing
			// `activeCount` to `concurrency`, because `activeCount` is updated asynchronously
			// when the run function is dequeued and called. The comparison in the if-statement
			// needs to happen asynchronously as well to get an up-to-date value for `activeCount`.
			await Promise.resolve();

			if (activeCount < concurrency && queue.size > 0) {
				queue.dequeue()();
			}
		})();
	};

	const generator = (fn, ...args) => new Promise(resolve => {
		enqueue(fn, resolve, args);
	});

	Object.defineProperties(generator, {
		activeCount: {
			get: () => activeCount,
		},
		pendingCount: {
			get: () => queue.size,
		},
		clearQueue: {
			value: () => {
				queue.clear();
			},
		},
	});

	return generator;
}

const CoverageProviderMap = {
  c8: "@vitest/coverage-c8",
  istanbul: "@vitest/coverage-istanbul"
};
async function resolveCoverageProvider(provider) {
  if (typeof provider === "string") {
    const pkg = CoverageProviderMap[provider];
    if (!pkg)
      throw new Error(`Unknown coverage provider: ${provider}`);
    return await importModule(pkg);
  } else {
    return provider;
  }
}
async function getCoverageProvider(options) {
  if ((options == null ? void 0 : options.enabled) && (options == null ? void 0 : options.provider)) {
    const { getProvider } = await resolveCoverageProvider(options.provider);
    return await getProvider();
  }
  return null;
}
async function takeCoverageInsideWorker(options) {
  if (options.enabled && options.provider) {
    const { takeCoverage } = await resolveCoverageProvider(options.provider);
    return await (takeCoverage == null ? void 0 : takeCoverage());
  }
}

var node = {
  name: "node",
  async setup() {
    return {
      teardown() {
      }
    };
  }
};

const LIVING_KEYS = [
  "DOMException",
  "URL",
  "URLSearchParams",
  "EventTarget",
  "NamedNodeMap",
  "Node",
  "Attr",
  "Element",
  "DocumentFragment",
  "DOMImplementation",
  "Document",
  "XMLDocument",
  "CharacterData",
  "Text",
  "CDATASection",
  "ProcessingInstruction",
  "Comment",
  "DocumentType",
  "NodeList",
  "HTMLCollection",
  "HTMLOptionsCollection",
  "DOMStringMap",
  "DOMTokenList",
  "StyleSheetList",
  "HTMLElement",
  "HTMLHeadElement",
  "HTMLTitleElement",
  "HTMLBaseElement",
  "HTMLLinkElement",
  "HTMLMetaElement",
  "HTMLStyleElement",
  "HTMLBodyElement",
  "HTMLHeadingElement",
  "HTMLParagraphElement",
  "HTMLHRElement",
  "HTMLPreElement",
  "HTMLUListElement",
  "HTMLOListElement",
  "HTMLLIElement",
  "HTMLMenuElement",
  "HTMLDListElement",
  "HTMLDivElement",
  "HTMLAnchorElement",
  "HTMLAreaElement",
  "HTMLBRElement",
  "HTMLButtonElement",
  "HTMLCanvasElement",
  "HTMLDataElement",
  "HTMLDataListElement",
  "HTMLDetailsElement",
  "HTMLDialogElement",
  "HTMLDirectoryElement",
  "HTMLFieldSetElement",
  "HTMLFontElement",
  "HTMLFormElement",
  "HTMLHtmlElement",
  "HTMLImageElement",
  "HTMLInputElement",
  "HTMLLabelElement",
  "HTMLLegendElement",
  "HTMLMapElement",
  "HTMLMarqueeElement",
  "HTMLMediaElement",
  "HTMLMeterElement",
  "HTMLModElement",
  "HTMLOptGroupElement",
  "HTMLOptionElement",
  "HTMLOutputElement",
  "HTMLPictureElement",
  "HTMLProgressElement",
  "HTMLQuoteElement",
  "HTMLScriptElement",
  "HTMLSelectElement",
  "HTMLSlotElement",
  "HTMLSourceElement",
  "HTMLSpanElement",
  "HTMLTableCaptionElement",
  "HTMLTableCellElement",
  "HTMLTableColElement",
  "HTMLTableElement",
  "HTMLTimeElement",
  "HTMLTableRowElement",
  "HTMLTableSectionElement",
  "HTMLTemplateElement",
  "HTMLTextAreaElement",
  "HTMLUnknownElement",
  "HTMLFrameElement",
  "HTMLFrameSetElement",
  "HTMLIFrameElement",
  "HTMLEmbedElement",
  "HTMLObjectElement",
  "HTMLParamElement",
  "HTMLVideoElement",
  "HTMLAudioElement",
  "HTMLTrackElement",
  "SVGElement",
  "SVGGraphicsElement",
  "SVGSVGElement",
  "SVGTitleElement",
  "SVGAnimatedString",
  "SVGNumber",
  "SVGStringList",
  "Event",
  "CloseEvent",
  "CustomEvent",
  "MessageEvent",
  "ErrorEvent",
  "HashChangeEvent",
  "PopStateEvent",
  "StorageEvent",
  "ProgressEvent",
  "PageTransitionEvent",
  "UIEvent",
  "FocusEvent",
  "InputEvent",
  "MouseEvent",
  "KeyboardEvent",
  "TouchEvent",
  "CompositionEvent",
  "WheelEvent",
  "BarProp",
  "External",
  "Location",
  "History",
  "Screen",
  "Performance",
  "Navigator",
  "PluginArray",
  "MimeTypeArray",
  "Plugin",
  "MimeType",
  "FileReader",
  "Blob",
  "File",
  "FileList",
  "ValidityState",
  "DOMParser",
  "XMLSerializer",
  "FormData",
  "XMLHttpRequestEventTarget",
  "XMLHttpRequestUpload",
  "XMLHttpRequest",
  "WebSocket",
  "NodeFilter",
  "NodeIterator",
  "TreeWalker",
  "AbstractRange",
  "Range",
  "StaticRange",
  "Selection",
  "Storage",
  "CustomElementRegistry",
  "ShadowRoot",
  "MutationObserver",
  "MutationRecord",
  "Headers",
  "AbortController",
  "AbortSignal",
  "Image",
  "Audio",
  "Option"
];
const OTHER_KEYS = [
  "addEventListener",
  "alert",
  "atob",
  "blur",
  "btoa",
  "cancelAnimationFrame",
  "close",
  "confirm",
  "createPopup",
  "dispatchEvent",
  "document",
  "focus",
  "frames",
  "getComputedStyle",
  "history",
  "innerHeight",
  "innerWidth",
  "length",
  "location",
  "matchMedia",
  "moveBy",
  "moveTo",
  "name",
  "navigator",
  "open",
  "outerHeight",
  "outerWidth",
  "pageXOffset",
  "pageYOffset",
  "parent",
  "postMessage",
  "print",
  "prompt",
  "removeEventListener",
  "requestAnimationFrame",
  "resizeBy",
  "resizeTo",
  "screen",
  "screenLeft",
  "screenTop",
  "screenX",
  "screenY",
  "scroll",
  "scrollBy",
  "scrollLeft",
  "scrollTo",
  "scrollTop",
  "scrollX",
  "scrollY",
  "self",
  "stop",
  "top",
  "Window",
  "window"
];
const KEYS = LIVING_KEYS.concat(OTHER_KEYS);

const allowRewrite = [
  "Event",
  "EventTarget",
  "MessageEvent",
  "ArrayBuffer"
];
const skipKeys = [
  "window",
  "self",
  "top",
  "parent"
];
function getWindowKeys(global, win) {
  const keys = new Set(KEYS.concat(Object.getOwnPropertyNames(win)).filter((k) => {
    if (skipKeys.includes(k))
      return false;
    if (k in global)
      return allowRewrite.includes(k);
    return true;
  }));
  return keys;
}
function isClassLikeName(name) {
  return name[0] === name[0].toUpperCase();
}
function populateGlobal(global, win, options = {}) {
  const { bindFunctions = false } = options;
  const keys = getWindowKeys(global, win);
  const originals = new Map(allowRewrite.filter((key) => key in global).map((key) => [key, global[key]]));
  const overrideObject = /* @__PURE__ */ new Map();
  for (const key of keys) {
    const boundFunction = bindFunctions && typeof win[key] === "function" && !isClassLikeName(key) && win[key].bind(win);
    Object.defineProperty(global, key, {
      get() {
        if (overrideObject.has(key))
          return overrideObject.get(key);
        if (boundFunction)
          return boundFunction;
        return win[key];
      },
      set(v) {
        overrideObject.set(key, v);
      },
      configurable: true
    });
  }
  global.window = global;
  global.self = global;
  global.top = global;
  global.parent = global;
  if (global.global)
    global.global = global;
  skipKeys.forEach((k) => keys.add(k));
  return {
    keys,
    skipKeys,
    originals
  };
}

var jsdom = {
  name: "jsdom",
  async setup(global, { jsdom = {} }) {
    const {
      CookieJar,
      JSDOM,
      ResourceLoader,
      VirtualConsole
    } = await importModule("jsdom");
    const {
      html = "<!DOCTYPE html>",
      userAgent,
      url = "http://localhost:3000",
      contentType = "text/html",
      pretendToBeVisual = true,
      includeNodeLocations = false,
      runScripts = "dangerously",
      resources,
      console = false,
      cookieJar = false,
      ...restOptions
    } = jsdom;
    const dom = new JSDOM(html, {
      pretendToBeVisual,
      resources: resources ?? (userAgent ? new ResourceLoader({ userAgent }) : void 0),
      runScripts,
      url,
      virtualConsole: console && global.console ? new VirtualConsole().sendTo(global.console) : void 0,
      cookieJar: cookieJar ? new CookieJar() : void 0,
      includeNodeLocations,
      contentType,
      userAgent,
      ...restOptions
    });
    const { keys, originals } = populateGlobal(global, dom.window, { bindFunctions: true });
    return {
      teardown(global2) {
        keys.forEach((key) => delete global2[key]);
        originals.forEach((v, k) => global2[k] = v);
      }
    };
  }
};

var happy = {
  name: "happy-dom",
  async setup(global) {
    const { Window, GlobalWindow } = await importModule("happy-dom");
    const win = new (GlobalWindow || Window)();
    const { keys, originals } = populateGlobal(global, win, { bindFunctions: true });
    return {
      teardown(global2) {
        win.happyDOM.cancelAsync();
        keys.forEach((key) => delete global2[key]);
        originals.forEach((v, k) => global2[k] = v);
      }
    };
  }
};

var edge = {
  name: "edge-runtime",
  async setup(global) {
    const { EdgeVM } = await importModule("@edge-runtime/vm");
    const vm = new EdgeVM({
      extend: (context) => {
        context.global = context;
        context.Buffer = Buffer;
        return context;
      }
    });
    const { keys, originals } = populateGlobal(global, vm.context, { bindFunctions: true });
    return {
      teardown(global2) {
        keys.forEach((key) => delete global2[key]);
        originals.forEach((v, k) => global2[k] = v);
      }
    };
  }
};

const environments = {
  node,
  jsdom,
  "happy-dom": happy,
  "edge-runtime": edge
};
const envs = Object.keys(environments);
const envPackageNames = {
  "jsdom": "jsdom",
  "happy-dom": "happy-dom",
  "edge-runtime": "@edge-runtime/vm"
};

export { CoverageProviderMap as C, envPackageNames as a, envs as b, environments as e, getCoverageProvider as g, pLimit as p, takeCoverageInsideWorker as t };
