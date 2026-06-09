---
name: ShotList data shape mismatch
description: useListShots typed as Shot[] but API returns { shots, total }
---

The generated `useListShots` hook types `data` as `Shot[]`, but the actual API response is `{ shots: Shot[], total: number }`.

**Fix:**
```ts
const { data: rawData } = useListShots(...);
const shots = (rawData as unknown as { shots: typeof rawData; total: number } | undefined)?.shots;
```

**Why:** The OpenAPI spec for the list endpoint doesn't match the actual response envelope. Codegen would need a spec update to fix properly; cast is the pragmatic fix.
