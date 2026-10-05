import React, { useState, useRef, useEffect } from 'react';
import { Camera, ArrowLeft, RefreshCw, Check, AlertCircle, Edit2, Upload, AlertTriangle } from 'lucide-react';

interface CameraScreenProps {
  onBack: () => void;
  onSaved: (objectId: string) => void;
}

interface AnalysisResult {
  object_name: string;
  category: string;
  visual_identity: {
    color: string;
    material: string;
    shape: string;
    distinctive_features: string[];
  };
  location: {
    room: string;
    surface: string;
  };
  nearby_objects: string[];
  scene_description: string;
  confidence: number;
  bounding_box?: {
    ymin: number;
    xmin: number;
    ymax: number;
    xmax: number;
  };
}

export const CameraScreen: React.FC<CameraScreenProps> = ({ onBack, onSaved }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [streamActive, setStreamActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImageBase64, setCapturedImageBase64] = useState<string | null>(null);

  // States for flow
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  // Editable fields for confirmation step (Section 36)
  const [editMode, setEditMode] = useState<boolean>(false);
  const [confirmedName, setConfirmedName] = useState<string>('');
  const [confirmedRoom, setConfirmedRoom] = useState<string>('');
  const [confirmedSurface, setConfirmedSurface] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Manual save mode for error recovery (Section 20)
  const [manualMode, setManualMode] = useState<boolean>(false);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreamActive(true);
      }
    } catch (err: any) {
      console.warn('[Camera] Camera access failed:', err.message);
      setCameraError('Camera unavailable or permission denied. You can take or upload a photo.');
      setStreamActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setStreamActive(false);
  };

  // Compress and capture image from camera stream (Section 33)
  const handleCapture = () => {
    if (!videoRef.current || !streamActive) return;

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');

    // Scale down image to max 1024px for responsive Gemini transmission
    const maxDim = 1024;
    let width = video.videoWidth || 640;
    let height = video.videoHeight || 480;

    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    setCapturedImageBase64(dataUrl);
    stopCamera();

    // Automatically analyze after capture
    runGeminiAnalysis(dataUrl);
  };

  // Upload fallback
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCapturedImageBase64(dataUrl);
      stopCamera();
      runGeminiAnalysis(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Real Gemini Multimodal Analysis call (Section 3)
  const runGeminiAnalysis = async (dataUrl: string) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);
    setManualMode(false);

    try {
      const response = await fetch('/api/camera/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: dataUrl,
          mimeType: 'image/jpeg',
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Gemini analysis failed');
      }

      const data: AnalysisResult = await response.json();
      setAnalysisResult(data);

      // Pre-fill editable confirmed state
      setConfirmedName(data.object_name);
      setConfirmedRoom(data.location.room);
      setConfirmedSurface(data.location.surface);
    } catch (err: any) {
      console.error('[CameraScreen] Analysis error:', err.message);
      setAnalysisError(err.message || 'AI analysis failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRetake = () => {
    setCapturedImageBase64(null);
    setAnalysisResult(null);
    setAnalysisError(null);
    setManualMode(false);
    setEditMode(false);
    startCamera();
  };

  // Final database persistence step (Section 7)
  const handleRemember = async (isManual = false) => {
    if (!capturedImageBase64) return;
    setIsSaving(true);

    try {
      const payload = {
        objectName: isManual ? confirmedName : (confirmedName || analysisResult?.object_name || 'Object'),
        category: analysisResult?.category || 'personal_item',
        visualIdentity: analysisResult?.visual_identity || {
          color: 'unspecified',
          material: 'unspecified',
          shape: 'unspecified',
          distinctive_features: [],
        },
        location: {
          room: isManual ? confirmedRoom : (confirmedRoom || analysisResult?.location.room || 'Unknown room'),
          surface: isManual ? confirmedSurface : (confirmedSurface || analysisResult?.location.surface || 'Unknown surface'),
        },
        nearbyObjects: analysisResult?.nearby_objects || [],
        sceneDescription: analysisResult?.scene_description || `${confirmedName} observed.`,
        confidence: isManual ? 1.0 : (analysisResult?.confidence || 0.85),
        evidenceImageBase64: capturedImageBase64,
        boundingBox: analysisResult?.bounding_box,
        source: isManual ? 'USER CONFIRMED' : 'AI + USER CONFIRMED',
      };

      const res = await fetch('/api/memory/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Database save failed');
      }

      const savedData = await res.json();
      onSaved(savedData.object.id);
    } catch (err: any) {
      alert('Failed to save memory: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const isLowConfidence = analysisResult && analysisResult.confidence < 0.60;

  return (
    <div className="flex-1 flex flex-col bg-[#F7F8FA] text-[#1D2430] h-full relative">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Header */}
      <div className="p-4 flex items-center justify-between border-b border-[#E4E8ED] bg-white">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-lg bg-[#F7F8FA] border border-[#E4E8ED] flex items-center justify-center text-[#1D2430] active:scale-95 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-semibold uppercase tracking-wider text-[#1D2430]">
          Remember an Object
        </span>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-8 h-8 rounded-lg bg-[#F7F8FA] border border-[#E4E8ED] flex items-center justify-center text-[#687385] hover:text-[#1D2430]"
          title="Upload image"
        >
          <Upload className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Viewport Surface */}
      <div className="relative flex-1 bg-[#1A1D20] flex items-center justify-center overflow-hidden">
        {/* Live video */}
        <video
          ref={videoRef}
          playsInline
          muted
          className={`w-full h-full object-cover ${
            streamActive && !capturedImageBase64 ? 'block' : 'hidden'
          }`}
        />

        {/* Captured Real Image */}
        {capturedImageBase64 && (
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            <img
              src={capturedImageBase64}
              alt="User Captured Frame"
              className="w-full h-full object-contain"
            />
            {/* Subtle boundary overlay */}
            {analysisResult?.bounding_box && (
              <div
                className="absolute border border-white/80 rounded-md pointer-events-none"
                style={{
                  top: `${analysisResult.bounding_box.ymin / 10}%`,
                  left: `${analysisResult.bounding_box.xmin / 10}%`,
                  width: `${(analysisResult.bounding_box.xmax - analysisResult.bounding_box.xmin) / 10}%`,
                  height: `${(analysisResult.bounding_box.ymax - analysisResult.bounding_box.ymin) / 10}%`,
                }}
              />
            )}
          </div>
        )}

        {/* Camera Permission/Unavailable Notice */}
        {!streamActive && !capturedImageBase64 && (
          <div className="p-6 text-center max-w-xs text-white flex flex-col items-center">
            <Camera className="w-10 h-10 text-[#9CA3AF] mb-3" />
            <p className="text-xs text-[#D1D5DB] mb-4">
              {cameraError || 'Activate camera or choose an image file to remember.'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={startCamera}
                className="px-3.5 py-2 bg-[#315B8A] hover:bg-[#26466B] text-white text-xs font-medium rounded-xl shadow-xs"
              >
                Start Camera
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 bg-white/10 text-white text-xs font-medium rounded-xl border border-white/20"
              >
                Choose Photo
              </button>
            </div>
          </div>
        )}

        {/* Subtle non-neon focus corners (Section 24) */}
        {streamActive && !capturedImageBase64 && (
          <div className="absolute inset-10 border border-white/30 rounded-2xl pointer-events-none flex flex-col justify-between p-2">
            <div className="flex justify-between">
              <div className="w-4 h-4 border-t-2 border-l-2 border-white/80"></div>
              <div className="w-4 h-4 border-t-2 border-r-2 border-white/80"></div>
            </div>
            <div className="flex justify-between">
              <div className="w-4 h-4 border-b-2 border-l-2 border-white/80"></div>
              <div className="w-4 h-4 border-b-2 border-r-2 border-white/80"></div>
            </div>
          </div>
        )}

        {/* Loading Spinner during Gemini Analysis (Section 33) */}
        {isAnalyzing && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white z-20">
            <RefreshCw className="w-8 h-8 animate-spin text-white mb-2" />
            <p className="text-xs font-medium">Understanding your surroundings…</p>
            <p className="text-[11px] text-[#D1D5DB] mt-1">Connecting to Gemini Multimodal AI</p>
          </div>
        )}
      </div>

      {/* Shutter Bar when camera is live */}
      {streamActive && !capturedImageBase64 && !isAnalyzing && (
        <div className="p-4 bg-white border-t border-[#E4E8ED] flex items-center justify-center">
          <button
            onClick={handleCapture}
            className="w-16 h-16 rounded-full border-4 border-[#315B8A] p-1 flex items-center justify-center active:scale-95 transition-all shadow-xs"
          >
            <div className="w-full h-full rounded-full bg-[#315B8A]"></div>
          </button>
        </div>
      )}

      {/* Analysis Error / Recovery Mode (Section 20) */}
      {analysisError && !isAnalyzing && (
        <div className="p-4 bg-white border-t border-[#E4E8ED] animate-fadeIn">
          <div className="flex items-center gap-2 text-[#B91C1C] text-xs font-semibold mb-2">
            <AlertTriangle className="w-4 h-4" />
            <span>AI analysis failed.</span>
          </div>
          <p className="text-xs text-[#687385] mb-3">
            {analysisError}
          </p>

          {manualMode ? (
            <div className="space-y-2 mb-3">
              <input
                type="text"
                placeholder="Object name (e.g. Wallet)"
                value={confirmedName}
                onChange={(e) => setConfirmedName(e.target.value)}
                className="w-full bg-[#F7F8FA] border border-[#E4E8ED] text-xs p-2.5 rounded-lg"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Room (e.g. Study)"
                  value={confirmedRoom}
                  onChange={(e) => setConfirmedRoom(e.target.value)}
                  className="bg-[#F7F8FA] border border-[#E4E8ED] text-xs p-2.5 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Surface (e.g. Desk)"
                  value={confirmedSurface}
                  onChange={(e) => setConfirmedSurface(e.target.value)}
                  className="bg-[#F7F8FA] border border-[#E4E8ED] text-xs p-2.5 rounded-lg"
                />
              </div>
              <button
                disabled={!confirmedName.trim() || isSaving}
                onClick={() => handleRemember(true)}
                className="w-full py-2.5 bg-[#315B8A] text-white text-xs font-semibold rounded-xl active:scale-98 transition-all disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Record (User Confirmed)'}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => runGeminiAnalysis(capturedImageBase64!)}
                className="flex-1 py-2.5 bg-[#315B8A] text-white text-xs font-medium rounded-xl"
              >
                Try Again
              </button>
              <button
                onClick={() => setManualMode(true)}
                className="flex-1 py-2.5 bg-[#F7F8FA] border border-[#E4E8ED] text-[#1D2430] text-xs font-medium rounded-xl"
              >
                Save Manually
              </button>
              <button
                onClick={handleRetake}
                className="px-3 py-2.5 bg-[#F7F8FA] border border-[#E4E8ED] text-[#687385] text-xs rounded-xl"
              >
                Retake
              </button>
            </div>
          )}
        </div>
      )}

      {/* Low Confidence State (Section 35) */}
      {isLowConfidence && !isAnalyzing && (
        <div className="p-4 bg-white border-t border-[#E4E8ED] animate-fadeIn">
          <div className="flex items-center gap-2 text-[#B45309] text-xs font-semibold mb-1">
            <AlertCircle className="w-4 h-4" />
            <span>I'm not confident about what I see.</span>
          </div>
          <p className="text-xs text-[#687385] mb-3">
            Possible detected object: <strong className="text-[#1D2430] capitalize">{analysisResult?.object_name}?</strong> ({Math.round((analysisResult?.confidence || 0) * 100)}% confidence)
          </p>

          <div className="flex gap-2">
            <button
              onClick={() => handleRemember(false)}
              className="flex-1 py-2.5 bg-[#315B8A] text-white text-xs font-medium rounded-xl"
            >
              Yes, remember it
            </button>
            <button
              onClick={handleRetake}
              className="flex-1 py-2.5 bg-[#F7F8FA] border border-[#E4E8ED] text-[#1D2430] text-xs font-medium rounded-xl"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Review / Confirmation Result Sheet (Section 7, 24, 36) */}
      {analysisResult && !isLowConfidence && !isAnalyzing && (
        <div className="p-4 bg-white border-t border-[#E4E8ED] flex flex-col space-y-3 animate-fadeIn">
          <div className="flex items-start justify-between">
            <div className="flex-1 mr-2">
              <span className="text-[10px] uppercase font-bold text-[#687385] block">
                Object Identified
              </span>
              {editMode ? (
                <input
                  type="text"
                  value={confirmedName}
                  onChange={(e) => setConfirmedName(e.target.value)}
                  className="text-base font-bold text-[#1D2430] border-b border-[#315B8A] bg-transparent focus:outline-none w-full"
                />
              ) : (
                <h2 className="text-base font-bold text-[#1D2430] capitalize">
                  {confirmedName || analysisResult.object_name}
                </h2>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-[#1E6B38] bg-[#E8F5E9] px-2 py-0.5 rounded border border-[#C8E6C9]">
                {Math.round(analysisResult.confidence * 100)}% confidence
              </span>
              <button
                onClick={() => setEditMode(!editMode)}
                className="text-[#687385] hover:text-[#1D2430] p-1"
                title="Edit extracted metadata"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="bg-[#F7F8FA] p-3 rounded-xl border border-[#E4E8ED] text-xs space-y-2">
            <div>
              <span className="text-[#687385] block text-[10px] uppercase font-semibold">
                AI-estimated location:
              </span>
              {editMode ? (
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <input
                    type="text"
                    placeholder="Room"
                    value={confirmedRoom}
                    onChange={(e) => setConfirmedRoom(e.target.value)}
                    className="bg-white border border-[#E4E8ED] p-1.5 rounded text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Surface"
                    value={confirmedSurface}
                    onChange={(e) => setConfirmedSurface(e.target.value)}
                    className="bg-white border border-[#E4E8ED] p-1.5 rounded text-xs"
                  />
                </div>
              ) : (
                <span className="font-semibold text-[#1D2430] mt-0.5 block">
                  {confirmedRoom || analysisResult.location.room} · {confirmedSurface || analysisResult.location.surface}
                </span>
              )}
            </div>

            {analysisResult.nearby_objects.length > 0 && (
              <div>
                <span className="text-[#687385] block text-[10px] uppercase font-semibold">
                  Near:
                </span>
                <span className="text-[#1D2430] font-medium">
                  {analysisResult.nearby_objects.join(', ')}
                </span>
              </div>
            )}

            <div>
              <span className="text-[#687385] block text-[10px] uppercase font-semibold">
                Visual Description:
              </span>
              <span className="text-[#687385] text-[11px] leading-snug block mt-0.5">
                {analysisResult.scene_description}
              </span>
            </div>
          </div>

          {/* Action Buttons: [ Retake ] [ Remember ] */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleRetake}
              className="flex-1 py-2.5 px-3 bg-[#F7F8FA] hover:bg-[#EAEBED] border border-[#E4E8ED] text-[#1D2430] text-xs font-semibold rounded-xl transition-all"
            >
              Retake
            </button>
            <button
              disabled={isSaving}
              onClick={() => handleRemember(false)}
              className="flex-2 py-2.5 px-4 bg-[#315B8A] hover:bg-[#26466B] active:scale-98 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Remember'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
