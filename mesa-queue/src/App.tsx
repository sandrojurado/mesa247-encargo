import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom'

import { QueueLayout } from '@/routes/QueueLayout'
import { HostWaitlistPage } from '@/pages/HostWaitlistPage'
import { JoinPage } from '@/pages/JoinPage'
import { LoginPage } from '@/pages/LoginPage'
import { QueuePage } from '@/pages/QueuePage'

const queryClient = new QueryClient()

const router = createBrowserRouter([
  {
    path: '/',
    element: <QueueLayout />,
    children: [
      { index: true, element: <JoinPage /> },
      { path: 'cola', element: <QueuePage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'lista-espera', element: <HostWaitlistPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

export default App
