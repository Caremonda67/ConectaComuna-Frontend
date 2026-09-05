import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { CardSkeletonList } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/States'
import HomePage from '@/pages/HomePage'
import { UI_ICONS } from '@/components/ui/icons'

// Code splitting por ruta: el primer render solo baja Home + layout.
const ExplorePage = lazy(() => import('@/pages/ExplorePage'))
const MapPage = lazy(() => import('@/pages/MapPage'))
const BusinessDetailPage = lazy(() => import('@/pages/BusinessDetailPage'))
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const BusinessProfileEditor = lazy(() => import('@/pages/business/BusinessProfileEditor'))
const HowItWorksPage = lazy(() => import('@/pages/HowItWorksPage'))

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<CardSkeletonList count={3} />}>{children}</Suspense>
}

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: 'explorar',
        element: (
          <Lazy>
            <ExplorePage />
          </Lazy>
        ),
      },
      {
        path: 'mapa',
        element: (
          <Lazy>
            <MapPage />
          </Lazy>
        ),
      },
      {
        path: 'negocio/:id',
        element: (
          <Lazy>
            <BusinessDetailPage />
          </Lazy>
        ),
      },
      {
        path: 'como-funciona',
        element: (
          <Lazy>
            <HowItWorksPage />
          </Lazy>
        ),
      },
      {
        path: 'entrar',
        element: (
          <Lazy>
            <LoginPage />
          </Lazy>
        ),
      },
      {
        path: 'registro',
        element: (
          <Lazy>
            <RegisterPage />
          </Lazy>
        ),
      },
      {
        path: 'panel',
        element: (
          <ProtectedRoute>
            <Lazy>
              <DashboardPage />
            </Lazy>
          </ProtectedRoute>
        ),
      },
      {
        path: 'panel/negocio',
        element: (
          <ProtectedRoute requireBusiness>
            <Lazy>
              <BusinessProfileEditor />
            </Lazy>
          </ProtectedRoute>
        ),
      },
      {
        path: '*',
        element: (
          <EmptyState
            icon={UI_ICONS.compass}
            title="No encontramos esa página"
            description="Revisa el enlace o vuelve al inicio."
          />
        ),
      },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
