import React, { useState, useEffect, useRef } from 'react';
import * as faceapi from 'face-api.js';

interface FacialVerificationProps {
  onSuccess: (score: number) => void;
  onManualReview: (score: number, selfieBlob: Blob) => void;
  onCancel: () => void;
}

export function FacialVerification({ onSuccess, onManualReview, onCancel }: FacialVerificationProps) {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [step, setStep] = useState<'ID' | 'LIVENESS' | 'MATCHING' | 'DONE'>('ID');
  const [idImageSrc, setIdImageSrc] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [livenessMessage, setLivenessMessage] = useState('Parpadea para verificar que eres una persona real.');
  const [selfieCanvas, setSelfieCanvas] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = '/models';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);
      setModelsLoaded(true);
    }
    loadModels();
  }, []);

  const handleIdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setIdImageSrc(url);
      setStep('LIVENESS');
    }
  };

  const startCamera = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Error accessing camera: ', err);
        alert('Necesitamos acceso a tu cámara para la verificación.');
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  useEffect(() => {
    if (step === 'LIVENESS') {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [step]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    const detectLiveness = async () => {
      if (videoRef.current && modelsLoaded && step === 'LIVENESS') {
        const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks();
        if (detection) {
          const landmarks = detection.landmarks;
          const leftEye = landmarks.getLeftEye();
          const rightEye = landmarks.getRightEye();

          const distLeft = faceapi.euclideanDistance([leftEye[1].x, leftEye[1].y], [leftEye[5].x, leftEye[5].y]);
          const distRight = faceapi.euclideanDistance([rightEye[1].x, rightEye[1].y], [rightEye[5].x, rightEye[5].y]);

          if (distLeft < 5 || distRight < 5) {
            setLivenessMessage('¡Parpadeo detectado! Capturando selfie...');
            
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(videoRef.current, 0, 0);
              setSelfieCanvas(canvas);
              setStep('MATCHING');
            }
          }
        }
      }
    };

    if (step === 'LIVENESS') {
      intervalId = setInterval(detectLiveness, 100);
    }

    return () => clearInterval(intervalId);
  }, [modelsLoaded, step]);

  useEffect(() => {
    const doMatch = async () => {
      if (!idImageSrc || !selfieCanvas) return;

      try {
        const idImg = document.createElement('img');
        idImg.src = idImageSrc;
        await new Promise(r => idImg.onload = r);
        
        const idDetection = await faceapi.detectSingleFace(idImg, new faceapi.TinyFaceDetectorOptions())
                                        .withFaceLandmarks()
                                        .withFaceDescriptor();

        if (!idDetection) {
          alert('No se detectó un rostro claro en la cédula. Intenta de nuevo.');
          setStep('ID');
          return;
        }

        // 2. Obtener descriptor de la selfie
        const selfieDetection = await faceapi.detectSingleFace(selfieCanvas, new faceapi.TinyFaceDetectorOptions())
                                            .withFaceLandmarks()
                                            .withFaceDescriptor();

        if (!selfieDetection) {
          alert('No pudimos procesar tu selfie. Intenta de nuevo.');
          setStep('LIVENESS');
          return;
        }

        // 3. Calcular distancia euclidiana
        const distance = faceapi.euclideanDistance(idDetection.descriptor, selfieDetection.descriptor);
        
        // 4. Decidir
        // 0 = idénticos. Umbral común es 0.6 para considerar misma persona.
        if (distance < 0.6) {
          onSuccess(distance);
        } else if (distance >= 0.6 && distance < 0.75) {
          // Dudoso -> revisión manual
          selfieCanvas.toBlob(blob => {
            if (blob) onManualReview(distance, blob);
          }, 'image/jpeg');
        } else {
          alert('Los rostros no coinciden. Intenta de nuevo por favor.');
          setStep('ID');
        }
        
      } catch (e) {
        console.error(e);
        alert('Hubo un error procesando las imágenes.');
        setStep('ID');
      }
    };

    if (step === 'MATCHING') doMatch();
  }, [step, idImageSrc, selfieCanvas, onSuccess, onManualReview]);


  if (!modelsLoaded) {
    return <div className="p-4 text-center">Cargando sistema de verificación...</div>;
  }

  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded-lg shadow-sm border border-brand-100">
      <h2 className="text-xl font-bold text-ink-900 mb-4">Verificación de Identidad</h2>
      
      {step === 'ID' && (
        <div className="space-y-4">
          <p className="text-ink-600">Por seguridad, necesitamos verificar que eres tú. Primero, toma una foto de tu cédula.</p>
          <label className="block w-full py-3 px-4 bg-brand-500 text-white text-center rounded cursor-pointer hover:bg-brand-600 transition-colors">
            Tomar foto de cédula
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              onChange={handleIdUpload}
              className="hidden"
            />
          </label>
        </div>
      )}

      {step === 'LIVENESS' && (
        <div className="space-y-4">
          <p className="text-ink-600 font-medium text-center">{livenessMessage}</p>
          <div className="relative overflow-hidden rounded-lg bg-ink-900 aspect-video">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="absolute inset-0 w-full h-full object-cover -scale-x-100"
            />
          </div>
        </div>
      )}

      {step === 'MATCHING' && (
        <div className="py-8 text-center text-ink-600">
          <p className="animate-pulse">Comparando rostros de forma segura...</p>
        </div>
      )}

      <button onClick={onCancel} className="mt-6 text-sm text-ink-500 underline w-full text-center">
        Cancelar
      </button>
    </div>
  );
}
