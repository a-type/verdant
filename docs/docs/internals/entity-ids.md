---
sidebar_position: 3
---

# Entity IDs

Each "entity" (basically any document or nested object) has a unique ID (referred to in Verdant source code as an "oid" or "object ID"). This ID links operations to the entity they operate on.

Root entities (documents) derive their ID directly from their collection and primary key:

```
{collection}/{primaryKey}
```

Nested entities (fields) derive their IDs from their root, plus a random segment:

```
{collection}/{primaryKey}:{random}
```

When deleting a document, we scan and delete all operations and baselines for all related sub-objects, basically deleting anything which matches an ID pattern:

```
{collection}/{primaryKey}(:[w+])?
```
