import { useState } from 'react';
import { FacialVerification } from '../components/FacialVerification';

export default function FacialVerificationPage() {
  const [result, setResult] = useState<'IDLE' | 'SUCCESS' | 'MANUAL_REVIEW' | 'CANCELLED'>('IDLE');
  const [score, setScore] = useState<number | null>(null);

  const handleSuccess = (finalScore: number) => {
    setScore(finalScore);
    setResult('SUCCESS');
    // Aquí luego llamaremos al backend para actualizar el estado del perfil
  };

  const handleManualReview = (finalScore: number) => {
    setScore(finalScore);
    setResult('MANUAL_REVIEW');
    // Aquí luego subiremos el selfieBlob a Supabase Storage y actualizaremos el estado
  };

  const handleCancel = () => {
    setResult('CANCELLED');
  };

  const reset = () => {
    setResult('IDLE');
    setScore(null);
  };

  return (
    <div className="min-h-screen bg-cream-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <div className="w-full max-w-md text-center mb-8">
        <h1 className="text-3xl font-bold text-ink-900">Verificación de Negocio</h1>
        <p className="mt-2 text-ink-600">
          Entorno de prueba aislado para el flujo de face-api.js
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
            <button onClick={reset} className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600">
              Probar de nuevo
            </button>
          </div>
        )}

        {result === 'MANUAL_REVIEW' && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-yellow-200 text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-ink-900 mb-2">Revisión Manual Requerida</h2>
            <p className="text-ink-600 mb-4">No pudimos confirmar automáticamente. Un administrador revisará tu foto.</p>
            <p className="text-sm text-ink-500 mb-6">Score (distancia): {score?.toFixed(3)}</p>
            <button onClick={reset} className="px-4 py-2 bg-ink-900 text-white rounded hover:bg-ink-800">
              Probar de nuevo
            </button>
          </div>
        )}

        {result === 'CANCELLED' && (
          <div className="text-center">
            <p className="text-ink-600 mb-4">Operación cancelada.</p>
            <button onClick={reset} className="text-brand-500 underline">
              Volver a intentar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
