import React from 'react';
import { PruneProvider, usePrunableState, usePruningState } from '../../src/index';

/**
 * Simple dashboard example demonstrating basic usage
 */

function Dashboard() {
    const [count, setCount] = usePrunableState('counter', 0);
    const [notes, setNotes] = usePrunableState('notes', '');
    const [items, setItems] = usePrunableState('items', [] as string[]);
    const { metrics, isPruned } = usePruningState();

    const addItem = () => {
        const newItem = `Item ${items.length + 1}`;
        setItems([...items, newItem]);
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <h1>React Tab Refresh - Basic Example</h1>

            <div style={{ marginBottom: '20px', padding: '10px', background: '#f0f0f0', borderRadius: '4px' }}>
                <h3>Status</h3>
                <p>Pruned: {isPruned ? 'Yes' : 'No'}</p>
                <p>Inactive for: {Math.round(metrics.inactiveMs / 1000)}s</p>
                {metrics.memoryMb && <p>Memory: {metrics.memoryMb}MB</p>}
            </div>

            <div style={{ marginBottom: '20px' }}>
                <h3>Counter (Persisted)</h3>
                <p>Count: {count}</p>
                <button onClick={() => setCount(count + 1)}>Increment</button>
                <button onClick={() => setCount(count - 1)} style={{ marginLeft: '10px' }}>
                    Decrement
                </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <h3>Notes (Persisted)</h3>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Type your notes here..."
                    style={{ width: '100%', minHeight: '100px', padding: '10px' }}
                />
            </div>

            <div style={{ marginBottom: '20px' }}>
                <h3>Items (Persisted)</h3>
                <button onClick={addItem}>Add Item</button>
                <ul>
                    {items.map((item, index) => (
                        <li key={index}>{item}</li>
                    ))}
                </ul>
            </div>

            <div style={{ padding: '10px', background: '#fff3cd', borderRadius: '4px' }}>
                <h4>Try this:</h4>
                <ol>
                    <li>Increment the counter and add some notes</li>
                    <li>Switch to another tab for 30+ minutes (or change pruneAfter to '10s' for testing)</li>
                    <li>Come back to this tab</li>
                    <li>Your data will be restored!</li>
                </ol>
            </div>
        </div>
    );
}

function LoadingPlaceholder() {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            fontFamily: 'sans-serif'
        }}>
            <div>
                <h2>Waking up...</h2>
                <p>Restoring your session</p>
            </div>
        </div>
    );
}

export default function App() {
    return (
        <PruneProvider
            config={{
                pruneAfter: '30m', // Change to '10s' for quick testing
                debug: true,
            }}
            placeholder={<LoadingPlaceholder />}
        >
            <Dashboard />
        </PruneProvider>
    );
}
