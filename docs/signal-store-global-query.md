# Global Query

Global queries provide a way to define, cache, and reuse query logic across multiple signal stores and components. The goal is to centralize query definitions, enable shared caching, and simplify integration of common data sources throughout your application.

## Aim

- **Centralization:** Define queries in one place, making them easy to maintain and update.
- **Reusability:** Plug queries into any signal store or inject them directly into components, reducing duplication.
- **Caching:** Share cached data between stores and components, improving performance and consistency.
- **Extensibility:** Support for custom persisters, cache time configuration, and dependency injection (e.g., services).
- **Avoid error:** Defining all globalQueries in the same place avoid to recreate an already existing query and ensure that the key is not already used
- **Organization:** Define queries at a feature level for better modularization and maintainability.
- **Clarity:** Make dependencies between features explicit rather than creating a monolithic query library.

## Usage Overview

1. **Define global queries:**
   Use `globalQueries` to declare queries. Each query can be configured with cache options and injected dependencies.

   ```typescript
   export const {
    withUserQuery,
    withUsersQuery,
    withUserQueryById,
    injectUserQuery,
    injectUsersQuery,
    injectUserQueryById
    } = globalQueries({
   	 queries: {
   		 user: {
   			 query: () => rxQuery({ ... }),
   		 },
   		 users: {
   			 query: () => rxQuery({ ... }),
   		 },
   	 },
   	 queriesById: {
   		 user: {
   			 queryById: () => rxQueryById({ ... }),
   		 },
   	 },
   });
   ```

2. **Plug queries into signal stores:**
   Use the generated `withUserQuery`, `withUsersQuery`, or `withUserQueryById` functions to add queries to your signal stores.

   ```typescript
   const store = signalStore(
     withState({ selected: "1" }),
     withUserQuery((store) => ({ setQuerySource: (source) => ({ id: store.selected }) })),
     withUsersQuery(),
     withUserQueryById()
   );
   ```

3. **Inject queries directly:**
   Use the generated `injectUserQuery` or `injectUserQueryById` functions to access query resources in components or services.

   ```typescript
   private readonly userQueryResource = injectUserQuery();
   ```

## Features

### Plugging data from component or signalStore

For queries that need dynamic parameters (e.g: an input from a component or a state from a store), define a source `SignalProxy` and use the `setQuerySource` option when plugging into a signal store, or in the inject function:

```typescript
globalQueries({
  queries: {
    user: {
      query: (source: SignalProxy<{ id: string | undefined }>) =>
        rxQuery({
          params: source.id,
          stream: ({ params: id }) => api.getUserDetails(id),
        }),
    },
  },
});
```

```typescript
const store = signalStore(withUserQuery((store) => ({ setQuerySource: (source) => ({ id: store.selected }) })));
```

In a component, you can use the pluggable API:

```typescript
const userQueryResource = injectUserQuery((source) => ({ id: componentSelectedId }));
```

### Injecting a service

You can inject Angular services directly into your query definitions:

```typescript
globalQueries({
  queries: {
    user: {
      query: (api = inject(ApiService)) =>
        rxQuery({
          params: () => "1",
          stream: ({ params: id }) => api.getUserDetails(id),
        }),
    },
    users: {
      query: (source: SignalProxy<{ id: string | undefined }>, api = inject(ApiService)) =>
        rxQuery(...),
    }
  },
});
```

This allows queries to use any injectable dependency, such as HTTP clients or custom services.

### Modifying cacheTime

You can set the cache duration for each query or globally:

- **Per-query:**
  ```typescript
  globalQueries({
     queries: {
        user: {
           config: { cacheTime: 60000 }, // 1 minute
           query: () => rxQuery({ ... }),
        },
     },
  });
  ```
- **Global default:**
  ```typescript
  globalQueries({ queries: { ... } }, { cacheTime: 120000 }); // 2 minutes
  ```

### Feature flag

You can organize queries by feature using the `featureName` option:

```typescript
globalQueries({ queries: { ... } }, { featureName: 'user' });
```

This helps modularize queries and avoid key collisions.
