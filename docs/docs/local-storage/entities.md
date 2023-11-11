---
sidebar_position: 5
---

# Documents & Entities

Queries return Documents. A Document provides a `.get` method to retrieve properties, and a `.set` to set them - as well as other utility methods depending on its type. All root documents are Object Entities, which also provide `.update`. Since Documents can contain arbitrary sub-objects, you can retrieve lists off them, which comes as List Entities and provide some common list methods too.

These methods are, of course, typed based on the shape of your schema definitions!

```ts
oneDoneItem.set('done', false);

anItemWithAnArrayField.get('arrayField').push('foo');
```

These will immediately update the in-memory document across all its subscribers (Entities are also cached by identity). The change will propagate to storage and sync asynchronously. When the change is stored, the document will update and drop the in-memory changes.

## Types of entities

Entities currently have two shapes: `Object` and `List`. `Object` covers the `object` and `map` field types and the root document. `List` covers `array` field types. `List` entities can also be used as rudimentary Sets.

Each entity type exposes different fully-typed methods:

### Object methods and properties

- `keys()`: Returns a list of all keys, like `Object.keys`.
- `entries()`: Returns `[key,value]` pairs, like `Object.entries`.
- `values()`: Returns a list of all values, like `Object.values`.
- `set(key, value)`: Sets a specific value on the entity.
- `delete(key)`: Deletes a value by key from the entity. Only works for `nullable` properties or on `map` type entities.
- `update(partial, { replaceSubObjects, merge })`: Applies a partial object value on the entity. Allows a few options for advanced usage:
  - `replaceSubObjects`: Defaults `false`, use `true` to replace sub-objects by identity instead of trying to keep sub-object identity stable. Passing `true` means if any other peer is editing a sub-object, the changes made by this `update` will completely replace it, ignoring their changes. Use with care.
  - `merge`: Defaults `true`, use `false` to cause omitted keys to erase their properties. Only works if omitted keys are optional in the schema, or on `map` type fields. Otherwise this will throw a runtime error.

### List methods and properties

- `length`: Returns the length of the list, like `Array.length`.
- `push(item)`: Pushes an item onto the list. Push conflicts are resolved by intent; i.e. if two pushes are concurrent both items will be added in chronological order to the end of the list.
- `insert(index, item)`: Inserts an item at index, moving later items down. Insert conflicts are resolved by intent; i.e. if an insert is concurrent to some other change in the list, Verdant will still try to place the item at the index specified.
- `move(from, to)`: Moves an item from one index to another, moving other items to make room for it at the destination. Move conflicts are resolved by intent; multiple moves will be applied in chronological order using whatever items are at the specified `from` index at time of resolution. For a more stable move when the `from` item's identity is important, use `moveItem`.
- `moveItem(item, to)`: Moves the first instance of one particular item (by identity) to an index. **If the items in this list are objects, you must pass a reference to an object retrieved from this entity, like one from `get()`**. Item move conflicts are resolved by intent, meaning even if the target item has moved from its original position during concurrent edits, the item will still be found and moved to the desired position. If the item is not found, nothing happens, and no error is thrown.
- `add(item)`: A Set add method. Only pushes the item to the end of the list if it does not already exist in the list (by identity). Add conflicts are resolved by intent, meaning if two adds are concurrent, the add will not insert the item twice.
- `removeAll(item)`: A Set remove method. Removes all instances of an item (by identity) from the list.
- `has(item)`: A Set has method. Returns true if an item exists in the list (by identity).
- `removeFirst(item)`: Removes only the first instance of an item (by identity). Remove first conflicts are resolved by intent, meaning if changes are resolved between peers and a new instance of the item is found earlier in the list than when this method was called on a client, that earlier item will be removed. This only really applies to primitive lists, since by definition a list of objects can't hold two objects of the same identity.
- `removeLast(item)`: Like `removeFirst`, but from the opposite end.
- `map(callback)`: Does not modify the list. Lets you map over the items in the list and transform them. Returns a new JS `Array` with the mapped items (not a new List entity). Similar to `Array.map`.
- `filter(callback)`: Does not modify the list. Lets you filter items to a subset. Returns a new JS `Array` with the filtered items (not a new List entity). Similar to `Array.filter`.
- `delete(index)`: Deletes an item from the list by index. The item at the index is removed, and other items shift to 'fill the space.' Similar to `Array.splice(index, 1)`.
- `forEach(callback)`: Invokes the callback with each item in the list. Similar to `Array.forEach`.
- `some(callback)`: Returns `true` if any item in the list passes the predicate (the callback returns `true`). Similar to `Array.some`.
- `every(callback)`: Returns `true` if every item in the list passes the predicate (the callback returns `true`). Similar to `Array.every`.
- `find(callback)`: Returns the first item in the list that passes the predicate (the callback returns `true`). Similar to `Array.find`.
- `includes(item)`: Alias of `has`, to align with `Array.includes`.

Additionally, List entities implement `Iterable`, so you can use them in `for...of` loops.

## Primary key

Every document has a primary key, which identifies it throughout the Verdant system. This primary key cannot be changed. Right now the types on documents will accept the primary key in a `.set` or `.update`, but will throw an error at runtime if it's used. In the future hopefully I'll update the types to make this constraint easier to catch while coding.
