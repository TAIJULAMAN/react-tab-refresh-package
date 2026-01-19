import { useContext } from 'react';
import { PruningContext } from '../context/PruningContext';
import type { PruningContextValue } from '../types';

export function usePruningState(): PruningContextValue {
    const context = useContext(PruningContext);

    if (!context) {
        throw new Error(
            'usePruningState must be used within a PruneProvider.\n\n' +
            'Wrap your app with <PruneProvider>:\n' +
            '  <PruneProvider>\n' +
            '    <App />\n' +
            '  </PruneProvider>\n\n' +
            'Docs: https://github.com/yourusername/react-tab-refresh#usage'
        );
    }

    return context;
}
