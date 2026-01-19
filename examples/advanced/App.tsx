import React, { useEffect, useState } from 'react';
import { PruneProvider, usePrunableState, usePruningState } from '../../src/index';

function ChatDashboard() {
    const [messages, setMessages] = usePrunableState('chat_messages', [] as Array<{ id: number; text: string; timestamp: number }>);
    const [username, setUsername] = usePrunableState('username', 'User');
    const [isConnected, setIsConnected] = useState(false);
    const { registerCleanup, unregisterCleanup } = usePruningState();

    useEffect(() => {
        // Simulate WebSocket connection
        console.log('Connecting to chat server...');
        setIsConnected(true);

        // Register cleanup to close connection before pruning
        registerCleanup('websocket', () => {
            console.log('Closing WebSocket connection before pruning');
            setIsConnected(false);
        });

        return () => {
            unregisterCleanup('websocket');
            setIsConnected(false);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const sendMessage = () => {
        const newMessage = {
            id: Date.now(),
            text: `Message from ${username}`,
            timestamp: Date.now(),
        };
        setMessages([...messages, newMessage]);
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <h1>React Tab Refresh - Advanced Example</h1>

            <div style={{ marginBottom: '20px', padding: '10px', background: isConnected ? '#d4edda' : '#f8d7da', borderRadius: '4px' }}>
                <h3>Connection Status</h3>
                <p>{isConnected ? '🟢 Connected' : '🔴 Disconnected'}</p>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <h3>Username</h3>
                <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    style={{ padding: '8px', width: '200px' }}
                />
            </div>

            <div style={{ marginBottom: '20px' }}>
                <h3>Messages (Persisted)</h3>
                <div style={{
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    padding: '10px',
                    minHeight: '200px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    marginBottom: '10px'
                }}>
                    {messages.length === 0 ? (
                        <p style={{ color: '#999' }}>No messages yet</p>
                    ) : (
                        messages.map((msg) => (
                            <div key={msg.id} style={{ marginBottom: '10px', padding: '8px', background: '#f0f0f0', borderRadius: '4px' }}>
                                <div>{msg.text}</div>
                                <div style={{ fontSize: '12px', color: '#666' }}>
                                    {new Date(msg.timestamp).toLocaleTimeString()}
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <button onClick={sendMessage} disabled={!isConnected}>
                    Send Message
                </button>
            </div>

            <div style={{ padding: '10px', background: '#e7f3ff', borderRadius: '4px' }}>
                <h4>Features demonstrated:</h4>
                <ul>
                    <li>✅ WebSocket cleanup before pruning</li>
                    <li>✅ Automatic reconnection after rehydration</li>
                    <li>✅ Message history persistence</li>
                    <li>✅ Connection status tracking</li>
                </ul>
            </div>
        </div>
    );
}

export default function App() {
    return (
        <PruneProvider
            config={{
                pruneAfter: '30m',
                debug: true,
                onPrune: async () => {
                    console.log('App is being pruned - cleanup happening');
                },
                onRehydrate: async () => {
                    console.log('App rehydrated - reconnecting services');
                },
            }}
        >
            <ChatDashboard />
        </PruneProvider>
    );
}
