---
sidebar_position: 3
---

# Reactivity

Once you have loaded documents via [queries](./queries.md), you will definitely want to write React components in such a way that they are properly re-rendered when data changes.

The nature of local-first data is reactive, since the system is designed inherently to support realtime collaboration. While you can read data from documents (also called "entities" throughout these docs) without subscribing to changes, this is not recommended!

Reactivity in Verdant revolves around one hook: `useWatch`. Requiring the use of a hook to respond to data changes may seem cumbersome for developers coming from another framework or a more 'magic' system like MobX, but I like to think Verdant's approach strikes a good balance between explicitness and terseness.

`useWatch`, by default, is **field-level granular** reactivity. This means when you pass an entity to `useWatch`, it only watches _the direct child fields of that entity_.

```ts
const { name, avatar, tags } = hooks.useWatch(person);
```

In the above example, if `tags` is a list of string tags, the component calling this hook **will not** re-render if tags are added or removed. However, it will re-render if `name` is changed, if the avatar file is replaced, or if the `tags` list itself is entirely replaced or removed, for example by doing the following:

```ts
// completely resets the `tags` list
person.set('tags', []);
```

Is that inconvenient or unintuitive? Maybe, when getting started. But in practice, this level of granularity encourages efficient reactivity subscriptions which align with similarly granular component structure. That's a lot of buzzwords, but here's what I mean...

> Even if this behavior seems unpalatable to you, I strongly suggest trying it out in real life for a bit if Verdant otherwise seems appealing for your project. After some acclimation, it becomes second nature.

Verdant's reactivity subscription system encourages component structure _less like this:_

```tsx
// WARNING: do not take directions from this code! Verdant is not designed
// to work this way and many parts of the below UI are non-reactive!
function PersonView({ person }: { person: Person }) {
	const { name, avatar, tags } = hooks.useWatch(person);

	return (
		<Box d="col">
			<Box>
				<img src={avatar?.url} /> <span>{name}</span>
			</Box>
			<Box>
				{tags.map((tag) => (
					<Tag key={tag}>{tag}</Tag>
				))}
			</Box>
		</Box>
	);
}
```

And more like this:

```tsx
function PersonAvatarView({ avatar }: { avatar: PersonAvatar }) {
	const url = hooks.useWatch(avatar);
	if (!url) return null;
	return <img src={url} />;
}

function PersonTagsView({ tags }: { tags: PersonTags }) {
	const values = hooks.useWatch(tags);
	return (
		<Box>
			{values.map((tag) => (
				<Tag key={tag}>{tag}</Tag>
			))}
		</Box>
	);
}

function PersonView({ person }: { person: Person }) {
	const { name, avatar, tags } = hooks.useWatch(person);

	return (
		<Box d="col">
			<Box>
				<PersonAvatarView avatar={avatar} />
				<span>{name}</span>
			</Box>
			<PersonTagsView tags={tags} />
		</Box>
	);
}
```

Now, you may be thinking, this is silly, that's way more code. And that's true, but you also end up with reusable components which are naturally aligned to reactive boundaries so that any changes to data only re-render components which directly depend on them. Rather than all of `PersonView` re-rendering whenever you modify the Person document in any way, you will now see only the `PersonTagsView` component re-renders when a tag is added, for example.

> There's one other strong recommendation I'd make to support this kind of coding, which is to let go of the [one-component per file](https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/no-multi-comp.md) rule and embrace multiple small supporting components in one file with a single exported component instead. This reaps the benefits of granular, single-purpose components without cluttering your file structure or exposing "reusable" components to the project which are better off being private and single-use.

This kind of optimization is unnecessary for something of the scale demonstrated in these examples, but since Verdant uses a document-centric model, for serious applications you will generally see the size and complexity of documents scale up as the app matures. Verdant's reactivity tracking approach helps reduce gradual performance degradation as you add data to your documents.

### Tip: Fine-grained watching

When you read properties from the returned value of `useWatch`, Verdant records which ones you access and only re-renders for changes to those properties! So if you only write `const { name } = hooks.useWatch(person)`, the component will only re-render if `name` changes and ignore all other fields.

If you don't access the returned value, and just call `hooks.useWatch(person)` bare, all direct fields will be watched by default.

If you want to bypass this auto-granularity for some reason, just avoid accessing properties on the returned value, and instead read them from the watched entity with `.get` as needed. This will trigger the default watch on all fields.

### Tip: Use the named generated types

Verdant CLI generates named type aliases for every field in your schema! This is tremendously convenient for typing props in granular React components. To get full use from these types, it's worth knowing a few conventions for how they are named:

- For object property fields, the name is just concatenated: `Person.name` = `PersonName`, `Post.metadata.location.longitude` = `PostMetadataLocationLongitude`, etc.
- For list fields, the `Item` suffix is used to name the item types: `Person.tags[0]` = `PersonTagsItem`, `Post.comments[0].title` = `PostCommentsItemTitle`, etc.
- For map fields, the `Value` suffix is used to name the value types: `Post.attributes.get('foo')` = `PostAttributesValue`, etc.

As hinted above, even primitive fields are given named alias types. I recommend using these types to make it clear that a component is representing a particular field, even if it resolves to `string` or another primitive. Ultimately it will depend on how reusable that component is expected to be across different purposes!

## Watching files

File fields will lazily load their file contents, so they also require reactivity. If you pass a file entity to `useWatch`, it will return the URL of the file, or `null` if it's not yet ready. This differs from how loading is handled with Suspense in most of Verdant (whoops).

## Handling nullability

Null values will always present some awkwardness, especially when trying to navigate the Rules of Hooks. You can't preemptively `return null;` from a React component if your optional field doesn't exist, and then go on to call `useWatch` later if it does! Verdant has specific but rather implicit behaviors with null values you should know about which help make things a bit less unwieldy.

You can pass a nullable value to `useWatch`. This is a no-op and returns `null`. The Typescript typing of `useWatch` will automatically switch to the `T | null` return type when you pass a nullable parameter to it to remind you of this.

Because nullable parameters result in nullable returned values, you can no longer utilize the destructuring pattern shown in prior examples. Here are some alternative patterns for reading reactive data from the entity if it exists:

```ts
// since we can't depend on a return value from this hook...
hooks.useWatch(maybeNullPerson);

// we can still take the returned value but not destructure, and conditionally read from it
const value = hooks.useWatch(maybeNullPerson);
const name = value?.name;

// or we can use getAll() to 'destructure' the entity and hardcode fallbacks...
const { name, avatar, tags } = maybeNullPerson?.getAll() || {
	name: '',
	avatar: null,
	tags: null,
};

// or we can just read the values directly
const name = maybeNullPerson?.get('name');
const avatar = maybeNullPerson?.get('avatar');
```

Since `useWatch` takes care of subscribing to entity changes if the entity is not null, you can rely on it to re-render the component for you. You're free to use `.get` to read data. Normally `.get` does not provide reactivity, but again, `useWatch` is handling that bit.

## Null handling by example

To explore null handling in practice, let's consider what happens if you have a nullable object field and you want to watch it for changes:

```ts
const posts = schema.collection({
	name: 'post',
	primaryKey: 'id',
	fields: {
		id: schema.fields.id(),
		title: schema.fields.string(),
		attachment: schema.fields.object({
			properties: {
				purpose: schema.fields.string(),
				file: schema.fields.file(),
			},
			// the "attachment" field on the Post document can be set to `null`
			nullable: true,
		}),
	},
});
```

Let's write a component that takes a Post document and renders a UI to display the attachment, if present.

```tsx
function MaybePostAttachment({ post }: { post: Post }) {
	// start by observing changes to the identity of the attachment field
	const { attachment } = hooks.useWatch(post);
	// using the bare useWatch to observe attachment, if it exists
	hooks.useWatch(attachment);
	// pulling out file from the attachment (if present) so
	// we can observe that, too
	const file = attachment?.get('file');
	// once again, bare useWatch on a file which may be null.
	hooks.useWatch(file);

	// if attachment doesn't exist, we can now conditionally exit.
	if (!attachment) return null;

	// if it does, we can use .get to render its properties.
	// the useWatch usage above will re-render this component as needed
	return (
		<div>
			<img src={file?.url} />
			<span>{attachment.get('purpose')}</span>
		</div>
	);
}
```

This is a functional and reasonable approach, if a little awkward with all the `?.` usage required. If this optionality gets tedious, you can always start breaking up component boundaries:

```tsx
function MaybePostAttachment({ post }: { post: Post }) {
	const { attachment } = hooks.useWatch(post);

	if (!attachment) return null;

	return <PostAttachmentView attachment={attachment} />;
}

function PostAttachmentView({ attachment }: { attachment: PostAttachment }) {
	const { file, purpose } = hooks.useWatch(attachment);
	hooks.useWatch(file);

	return (
		<div>
			<img src={file?.url} />
			<span>{purpose}</span>
		</div>
	);
}
```

I think this second version is much cleaner, but it's not always worth it to break things down this way. While I'm still prototyping a feature, my components will look more like the first one until I decide on how I want to engineer it. Do what feels right!

## Null handling works for root documents, too

All of the above applies not just to nullable fields, but also missing documents. Single-value queries can return `null` if no document matches, and the Typescript typings reflect this fact. You can pass this maybe-null document to `useWatch` just like anything else.
