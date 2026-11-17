import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { BrowserRouter } from 'react-router';
import { ToastProvider } from './components/common/Toast';
import { authKeys } from './hooks/useAuth';
import { createQueryClient } from './lib/queryClient';
import { AppRoutes } from './routes/AppRoutes';
import { setUnauthenticatedHandler } from './services/api';

export function App() {
  const [queryClient] = useState(() => {
    const client = createQueryClient();
    // If the session expires mid-use, drop cached data; the route guard then redirects to /login.
    setUnauthenticatedHandler(() => {
      client.clear();
      client.setQueryData(authKeys.me, null);
    });
    return client;
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}
