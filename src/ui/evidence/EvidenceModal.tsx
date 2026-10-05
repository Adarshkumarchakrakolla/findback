import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, MapPin, Clock, Tag, CheckCircle2 } from 'lucide-react';
import { ObservationRecord } from '../../types/client';

interface EvidenceModalProps {
  observationId: string;
  onClose: () => void;
}

export const EvidenceModal: React.FC<EvidenceModalProps> = ({ observationId, onClose }) => {
  const [obs, setObs] = useState<ObservationRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchObservation = async () => {
      try {
        setLoading(true);
        // Find observation from server objects
        const res = await fetch('/api/memory/objects');
        if (!res.ok) throw new Error('Failed to fetch');
        const objects = await res.json();

        // Search in all objects' observations
        let foundObs: ObservationRecord | null = null;
        for (const obj of objects) {
          const detailRes = await fetch(`/api/memory/objects/${obj.id}`);
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            const matching = (detailData.observations as ObservationRecord[]).find(
              (o) => o.id === observationId
            );
            if (matching) {
              foundObs = matching;
              break;
            }
          }
        }
        setObs(foundObs);
      } catch (err) {
        console.error('[EvidenceModal] Error loading evidence:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchObservation();
  }, [observationId]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl max-w-xs w-full text-center">
          <div className="w-6 h-6 border-2 border-[#315B8A] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <span className="text-xs text-[#687385]">Loading real evidence…</span>
        </div>
      </div>
    );
  }

  if (!obs) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white p-5 rounded-2xl max-w-xs w-full text-center shadow-lg">
          <p className="text-xs text-[#687385]">Observation evidence not found.</p>
          <button onClick={onClose} className="mt-3 px-3.5 py-1.5 bg-[#F7F8FA] border border-[#E4E8ED] rounded-lg text-xs font-medium">
            Close
          </button>
        </div>
      </div>
    );
  }

  const timeStr = new Date(obs.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = new Date(obs.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  const bbox = obs.boundingBox;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex flex-col justify-end md:justify-center items-center p-0 md:p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-white rounded-t-3xl md:rounded-3xl max-h-[92vh] overflow-y-auto flex flex-col shadow-2xl relative">
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-[#E4E8ED] sticky top-0 bg-white z-20">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#315B8A]" />
            <h2 className="text-xs font-bold text-[#1D2430] uppercase tracking-wider">
              Real Camera Evidence
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-[#F7F8FA] border border-[#E4E8ED] flex items-center justify-center text-[#687385] hover:text-[#1D2430]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Real User Captured Image Display (Section 13) */}
        <div className="relative bg-black aspect-[4/3] flex items-center justify-center overflow-hidden border-b border-[#E4E8ED]">
          {obs.evidenceImagePath ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={obs.evidenceImagePath}
                alt="Captured visual observation"
                className="w-full h-full object-contain"
              />

              {/* Bounding box highlight */}
              {bbox && (
                <div
                  className="absolute border-2 border-white rounded-md pointer-events-none"
                  style={{
                    top: `${bbox.ymin / 10}%`,
                    left: `${bbox.xmin / 10}%`,
                    width: `${(bbox.xmax - bbox.xmin) / 10}%`,
                    height: `${(bbox.ymax - bbox.ymin) / 10}%`,
                  }}
                >
                  <div className="absolute -top-5 left-0 bg-white text-[#1D2430] text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                    OBJECT
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center text-white/70 text-xs">
              Image file unavailable.
            </div>
          )}

          <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[10px] text-white/90 bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-md">
            <span>Verified visual observation</span>
            <span className="font-mono text-emerald-400 font-semibold">{Math.round(obs.confidence * 100)}%</span>
          </div>
        </div>

        {/* Observation Metadata Details (Section 13) */}
        <div className="p-4 flex flex-col space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#687385] block">
                Observed Location
              </span>
              <h3 className="text-base font-bold text-[#1D2430]">
                {obs.room} · {obs.surface}
              </h3>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-[#1E6B38]">
                {Math.round(obs.confidence * 100)}% confidence
              </span>
              <span className="text-[10px] text-[#687385] block mt-0.5">
                {timeStr} · {dateStr}
              </span>
            </div>
          </div>

          <div className="bg-[#F7F8FA] p-3 rounded-xl border border-[#E4E8ED] text-xs space-y-2">
            {obs.nearbyObjects.length > 0 && (
              <div>
                <span className="text-[#687385] block text-[10px] uppercase font-semibold">
                  Nearby objects:
                </span>
                <span className="text-[#1D2430] font-medium">
                  {obs.nearbyObjects.join(', ')}
                </span>
              </div>
            )}

            <div>
              <span className="text-[#687385] block text-[10px] uppercase font-semibold">
                Scene description:
              </span>
              <span className="text-[#1D2430] leading-snug block mt-0.5">
                "{obs.sceneDescription}"
              </span>
            </div>

            <div>
              <span className="text-[#687385] block text-[10px] uppercase font-semibold">
                Record verification source:
              </span>
              <span className="text-[11px] font-mono text-[#687385] block">
                {obs.source}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 bg-[#F7F8FA] hover:bg-[#EAEBED] border border-[#E4E8ED] rounded-xl text-xs font-semibold text-[#1D2430] transition-all"
          >
            Close Evidence
          </button>
        </div>
      </div>
    </div>
  );
};
