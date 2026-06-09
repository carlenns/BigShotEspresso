---
name: Generated hook queryKey requirement
description: Orval-generated hooks need explicit queryKey when passing custom query options
---

When passing `{ query: { enabled: boolean } }` to an Orval-generated hook, TypeScript requires `queryKey` to be included too:

```ts
useGetShot(id, { query: { enabled: !!id, queryKey: getGetShotQueryKey(id) } })
```

**Why:** The generated `UseQueryOptions` type has `queryKey` as required. Without it, TS2741 fires.

**How to apply:** Import the matching `get*QueryKey` function alongside the hook and pass it in the query options.
