import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { FacialVerification } from '../components/FacialVerification'

function panelSegunRol(accountType?: string): string {
  if (accountType === 'business') return '/panel/negocio'
  if (accountType === 'facilitador') return '/panel/facilitador'
  return '/panel'
}

export default function FacialVerificationPage() {
  const navigate = useNavigate()
  const [result, setResult] = useState<'IDLE' | 'SUCCESS' | 'MANUAL_REVIEW' | 'CANCELLED'>('IDLE')
  const [score, setScore] = useState<number | null>(null)

  const { userId, profile, signOut } = useAuth()
  const destino = panelSegunRol(profile?.account_type)

  const handleSuccess = (finalScore: number) => {
    setScore(finalScore)
    setResult('SUCCESS')
    if (userId) localStorage.setItem(`facial_verified_${userId}`, 'true')
  }

  const handleManualReview = (finalScore: number) => {
    setScore(finalScore)
    setResult('MANUAL_REVIEW')
    if (userId) localStorage.setItem(`facial_verified_${userId}`, 'true')
  }

  const handleCancel = () => {
    signOut().then(() => navigate('/entrar'))
  }

  return (
    <div className="min-h-screen bg-cream-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <div className="w-full max-w-md text-center mb-8">
        <h1 className="text-3xl font-bold text-ink-900">Verificación de Identidad</h1>
        <p className="mt-2 text-ink-600">
          Para garantizar la seguridad de nuestra comunidad, necesitamos verificar tu identidad con tu documento y una foto en vivo.
        </p>
      </div>

      <div className="w-full">
        {result === 'IDLE' && (
          <FacialVerification
            onSuccess={handleSuccess}
            onManualReview={handleManualReview}
            onCancel={handleCancel}
          />
        )}

        {result === 'SUCCESS' && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-brand-100 text-center">
            <div className="text-4xl mb-4">✅</div>
            <h2 className="text-xl font-bold text-ink-900 mb-2">¡Verificación Exitosa!</h2>
            <p className="text-ink-600 mb-4">El sistema ha confirmado tu identidad.</p>
            <p className="text-sm text-ink-500 mb-6">Score (distancia): {score?.toFixed(3)}</p>
            <button onClick={() => navigate(destino)} className="px-4 py-2 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-colors w-full">
              Continuar a mi Panel
            </button>
          </div>
        )}

        {result === 'MANUAL_REVIEW' && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-yellow-200 text-center">
            <div className="text-4xl mb-4">⏱️</div>
            <h2 className="text-xl font-bold text-ink-900 mb-2">Revisión Manual Requerida</h2>
            <p className="text-ink-600 mb-4">No pudimos confirmar automáticamente. Un administrador revisará tu foto pronto, pero ya puedes usar la plataforma.</p>
            <p className="text-sm text-ink-500 mb-6">Score (distancia): {score?.toFixed(3)}</p>
            <button onClick={() => navigate(destino)} className="px-4 py-2 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-colors w-full">
              Continuar a mi Panel
            </button>
          </div>
        )}

        {result === 'CANCELLED' && (
          <div className="text-center">
            <p className="text-ink-600 mb-4">La verificación es obligatoria para usar la plataforma.</p>
            <button onClick={() => navigate('/entrar')} className="px-4 py-2 bg-ink-900 text-white rounded-xl hover:bg-ink-800 transition-colors w-full">
              Volver al inicio de sesión
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
