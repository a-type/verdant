Starting with a snapshot, a root Entity is created

The root snapshot is maintained and updated as things change

All child entities keep a reference to their portion of the root snapshot

Child entities are cached in their parent
A child is only ever a child of one parent - no reparenting

On change, an event is forwarded to the appropriate entity in the tree
how?

Migration stuff...

During migration, create a 'touched' empty op for every single root OID.

When loading a document, if there isn't an op for this version, we know the doc is not migrated. The range for migration is from the version of its current op/baseline.

# Lifecycle of an Entity

At first, we've come from the queryable storage, so we have a plain object
representing the entity's snapshot. But without associated OIDs, we can't do much besides read the data. For now, this initial snapshot isn't used.
