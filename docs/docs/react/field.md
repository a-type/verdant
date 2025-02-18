---
sidebar_position: 4
---

# 'Field' ergonomics

The `useField` hook provides some convenient tools for changing single entity fields.

The hook returns an object with the following properties:

- `value`: the live value of the field
- `setValue`: a setter to update the field
- `inputProps`: props you can spread directly to an `input` or `textarea` to wire it up
- `presence`: data about other replicas interacting with the field

The hook automatically interprets boolean field values for use with checkbox inputs. You don't even need to pass `type="checkbox"`, just spread `inputProps`.

It also tracks presence on fields, starting with `blur`. The local replica will have its presence marked as editing the field for up to a minute after any modification. This presence is accessible to other replicas via the same `useField` presence data, so you can show avatars or disable editing, or whatever.

```tsx
// Note is a Verdant entity
function NoteEditor({ note }: { note: Note }) {
	const contentField = hooks.useField(note, 'content');
	const pinnedField = hooks.useField(note, 'pinned');

	return (
		<div>
			<textarea
				{...contentField.inputProps}
				// you can change field behavior when the field is 'in use'
				// by someone else already
				disabled={contentField.presence.occupied}
			/>
			<input {...pinnedField.inputProps} />
		</div>
	);
}
```
