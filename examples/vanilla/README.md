# Verdant Vanilla

This is about as basic as you can get! A plain HTML file which loads `@verdant-web/store` from a CDN and contains the entire app. Just open the HTML file in a browser.

The CDN version of `@verdant-web/store` defines all of the NPM package's exports as properties on a global object called `Verdant`.

Since we're not using TypeScript here, the schema can just be a plain object. But be careful, since we're also not getting any type safety for our documents.

I used a Custom Element (aka Web Component) to define the counter, just because I like to encapsulate components.
