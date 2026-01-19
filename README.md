# react-tab-refresh

**Stop the Memory Bloat** — Automatically prune and re-hydrate your long-lived React apps to keep the browser fast.

[![npm version](https://img.shields.io/npm/v/react-tab-refresh.svg)](https://www.npmjs.com/package/react-tab-refresh)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/react-tab-refresh)](https://bundlephobia.com/package/react-tab-refresh)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

---

## 📋 The Problem

In 2026, users keep tabs open for **weeks**. Even with optimized code, DOM nodes, event listeners, and JS heaps grow over time. This leads to:

- **Tab Crashing**: Browser kills the process due to high memory usage
- **System Slowdown**: Your app slows down the user's entire OS
- **Stale Data**: Background tabs show data from 3 days ago

## ✨ The Solution

`react-tab-refresh` monitors your app's health. When a tab is hidden and exceeds memory limits or inactivity timers:

1. **Serializes** your essential state to sessionStorage
2. **Unmounts** the entire heavy React tree (freeing the heap)
3. **Re-mounts** and restores everything instantly when the user returns

---

## 🚀 Quick Start

### Installation

```bash
npm install react-tab-refresh
# or
yarn add react-tab-refresh
# or
pnpm add react-tab-refresh
```

### 1. Wrap Your App

```tsx
import { PruneProvider } from 'react-tab-refresh';

function App() {
  return (
    <PruneProvider config={{ pruneAfter: '30m' }}>
      <MainDashboard />
    </PruneProvider>
  );
}
```

### 2. Mark "Essential" State

Replace `useState` with `usePrunableState` for data that must survive the pruning process.

```tsx
import { usePrunableState } from 'react-tab-refresh';

function SearchComponent() {
  // This state will be saved to sessionStorage before the component is unmounted
  // and restored automatically upon return.
  const [results, setResults] = usePrunableState('search_results', []);
  const [query, setQuery] = usePrunableState('search_query', '');

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
      />
      {results.map((result) => (
        <div key={result.id}>{result.title}</div>
      ))}
    </div>
  );
}
```

That's it! Your app will now automatically prune and rehydrate.

---

## 📚 API Reference

### `<PruneProvider>`

The main provider component that wraps your app.

```tsx
<PruneProvider
  config={{
    pruneAfter: '30m',              // When to prune (default: 30 minutes)
    maxMemoryMb: 600,               // Memory threshold (Chrome only)
    enableMemoryMonitoring: false,  // Enable memory-based pruning
    maxDomNodes: 10000,             // DOM node threshold
    onPrune: () => {},              // Callback before pruning
    onRehydrate: () => {},          // Callback after rehydration
    debug: false,                   // Enable debug logging
  }}
  placeholder={<LoadingScreen />}   // Show during rehydration
>
  <App />
</PruneProvider>
```

#### Config Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `pruneAfter` | `string \| number` | `'30m'` | Inactivity time before pruning. Supports: `'30m'`, `'1h'`, `'2d'`, or milliseconds |
| `maxMemoryMb` | `number` | `undefined` | Memory threshold in MB (Chrome only) |
| `enableMemoryMonitoring` | `boolean` | `false` | Enable memory-based pruning |
| `maxDomNodes` | `number` | `undefined` | Maximum DOM nodes before pruning |
| `onPrune` | `() => void \| Promise<void>` | `undefined` | Callback before pruning (for cleanup) |
| `onRehydrate` | `() => void \| Promise<void>` | `undefined` | Callback after rehydration (for reconnection) |
| `debug` | `boolean` | `false` | Enable debug logging |

### `usePrunableState()`

Drop-in replacement for `useState` with automatic persistence.

```tsx
const [state, setState] = usePrunableState(key, initialValue, options);
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | `string` | Unique storage key |
| `initialValue` | `T` | Initial value (used if no stored value) |
| `options` | `PrunableStateOptions<T>` | Optional configuration |

#### Options

```tsx
interface PrunableStateOptions<T> {
  serialize?: (value: T) => string;        // Custom serializer
  deserialize?: (value: string) => T;      // Custom deserializer
  validate?: (value: T) => boolean;        // Validate restored data
  ttl?: number;                            // Time-to-live in ms
  onExpired?: () => void;                  // Callback when data expires
  debug?: boolean;                         // Enable debug logging
}
```

#### Example with Options

```tsx
const [user, setUser] = usePrunableState(
  'current_user',
  { id: null, name: '' },
  {
    validate: (value) => value.id !== null,
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    onExpired: () => fetchFreshUserData(),
  }
);
```

### `usePruningState()`

Access pruning state and utilities.

```tsx
const {
  isPruned,           // Whether app is currently pruned
  isRehydrating,      // Whether app is rehydrating
  metrics,            // Current metrics (inactiveMs, memoryMb, etc.)
  forceRehydrate,     // Force immediate rehydration
  registerCleanup,    // Register cleanup function
  unregisterCleanup,  // Unregister cleanup function
} = usePruningState();
```

#### Example: WebSocket Cleanup

```tsx
import { usePruningState } from 'react-tab-refresh';

function ChatComponent() {
  const { registerCleanup } = usePruningState();

  useEffect(() => {
    const ws = new WebSocket('wss://api.example.com/chat');

    // Register cleanup to close WebSocket before pruning
    registerCleanup('websocket', () => {
      ws.close();
    });

    return () => ws.close();
  }, [registerCleanup]);

  return <div>Chat UI</div>;
}
```

---

## ⚠️ Common Issues & Solutions

### Issue: State Loss

**Cause**: Non-serializable data (Functions, Classes) in state.

**Solution**: Use the `transform` option or avoid storing non-serializable data.

```tsx
// ❌ Bad: Functions can't be serialized
const [handler, setHandler] = usePrunableState('handler', () => {});

// ✅ Good: Store serializable data only
const [config, setConfig] = usePrunableState('config', { url: '/api' });
```

### Issue: Flicker on Return

**Cause**: Re-mounting large trees takes time.

**Solution**: Use the `placeholder` prop to show a skeleton screen.

```tsx
<PruneProvider
  config={{ pruneAfter: '30m' }}
  placeholder={<SkeletonScreen />}
>
  <App />
</PruneProvider>
```

### Issue: WebSocket Drop

**Cause**: Unmounting closes active connections.

**Solution**: Use `registerCleanup` to gracefully close and `onRehydrate` to reconnect.

```tsx
const { registerCleanup } = usePruningState();

useEffect(() => {
  const ws = new WebSocket(url);

  registerCleanup('websocket', () => {
    ws.close();
  });

  return () => ws.close();
}, []);
```

### Issue: Quota Exceeded

**Cause**: SessionStorage has a 5-10MB limit.

**Solution**: Reduce state size or use selective persistence.

```tsx
// Only persist essential data
const [largeData, setLargeData] = useState([]); // Not persisted
const [essentialData, setEssentialData] = usePrunableState('essential', {}); // Persisted
```

---

## 🎯 Advanced Usage

### Custom Serialization

For complex data types (Dates, Maps, Sets):

```tsx
const [timestamp, setTimestamp] = usePrunableState(
  'timestamp',
  new Date(),
  {
    serialize: (date) => date.toISOString(),
    deserialize: (str) => new Date(str),
  }
);
```

### Conditional Pruning

```tsx
const { isPruned, forceRehydrate } = usePruningState();

if (isPruned && userClickedButton) {
  forceRehydrate();
}
```

### Monitoring Metrics

```tsx
const { metrics } = usePruningState();

console.log(`Inactive for: ${metrics.inactiveMs}ms`);
console.log(`Memory usage: ${metrics.memoryMb}MB`);
console.log(`DOM nodes: ${metrics.domNodes}`);
```

---

## 🧪 Testing

The package includes comprehensive tests. Run them with:

```bash
npm test
```

For coverage:

```bash
npm run test:coverage
```

---

## 📦 Bundle Size

`react-tab-refresh` is designed to be lightweight:

- **Minified**: ~8KB
- **Gzipped**: ~3KB

---

## 🌐 Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Page Visibility API | ✅ | ✅ | ✅ | ✅ |
| SessionStorage | ✅ | ✅ | ✅ | ✅ |
| Memory Monitoring | ✅ | ❌ | ❌ | ✅ |

**Note**: Memory monitoring (`performance.memory`) is Chrome/Edge only. The package gracefully degrades to time-based pruning on other browsers.

---

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

---

## 📄 License

MIT © TAIJULAMAN

---

## 🙏 Acknowledgments

Inspired by the real-world problem of tab bloat in modern web applications. Built for the 2026 web where apps live in tabs for weeks.

---
