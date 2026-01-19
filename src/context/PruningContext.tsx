import { createContext } from 'react';
import type { PruningContextValue } from '../types';

/**
 * Context for sharing pruning state across components
 */
export const PruningContext = createContext<PruningContextValue | null>(null);

PruningContext.displayName = 'PruningContext';
