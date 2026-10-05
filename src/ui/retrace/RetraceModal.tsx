import React from 'react';
import { X, Navigation, MapPin, CheckCircle2, ArrowDown, Compass } from 'lucide-react';

interface RetraceStepItem {
  step: number;
  time: string;
  room: string;
  surface: string;
  note?: string;
}

interface RetraceModalProps {
  steps: RetraceStepItem[];
  objectName: string;
  lastLocation: string;
  onClose: () => void;
}

export const RetraceModal: React.FC<RetraceModalProps> = ({
  steps,
  objectName,
  lastLocation,
  onClose,
}) => {
  const hasMultipleSteps = steps && steps.length >= 2;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex flex-col justify-end md:justify-center items-center p-0 md:p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-white rounded-t-3xl md:rounded-3xl max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl relative">
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-[#E4E8ED] sticky top-0 bg-white z-20">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#315B8A]" />
            <h2 className="text-xs font-bold text-[#1D2430] uppercase tracking-wider">
              Retrace My Steps
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-[#F7F8FA] border border-[#E4E8ED] flex items-center justify-center text-[#687385] hover:text-[#1D2430]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content (Section 15) */}
        <div className="p-5 flex flex-col space-y-4">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#687385] block mb-1">
              Your Object Trail: {objectName}
            </span>

            {!hasMultipleSteps ? (
              <div className="p-6 text-center bg-[#F7F8FA] rounded-2xl border border-[#E4E8ED] text-xs text-[#687385] my-2">
                <Navigation className="w-6 h-6 text-[#9CA3AF] mx-auto mb-2" />
                <p className="font-medium text-[#1D2430]">
                  Not enough observations to reconstruct a route.
                </p>
                <p className="text-[11px] text-[#687385] mt-1">
                  Re-scan this object when you move it around your home to build a chronological trail.
                </p>
                <div className="mt-4 p-2.5 bg-white rounded-xl border border-[#E4E8ED] text-left">
                  <span className="text-[10px] text-[#687385] uppercase font-semibold block">
                    Single confirmed location:
                  </span>
                  <span className="text-xs font-bold text-[#1D2430]">
                    {lastLocation}
                  </span>
                </div>
              </div>
            ) : (
              <div className="relative pl-6 space-y-3.5 pt-2">
                {/* Vertical timeline rule */}
                <div className="absolute left-2.5 top-3 bottom-3 w-0.5 bg-[#E4E8ED]"></div>

                {steps.map((st, idx) => {
                  const isLatest = idx === steps.length - 1;
                  return (
                    <div key={idx} className="relative flex items-start gap-3">
                      {/* Step Dot */}
                      <div
                        className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center z-10 ${
                          isLatest
                            ? 'bg-[#1E6B38] border-[#A7F3D0] text-white shadow-xs'
                            : 'bg-white border-[#315B8A] text-[#315B8A]'
                        }`}
                      >
                        {isLatest ? (
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        ) : (
                          <span className="text-[9px] font-bold">{st.step}</span>
                        )}
                      </div>

                      <div
                        className={`flex-1 p-3 rounded-xl border transition-all ${
                          isLatest
                            ? 'bg-[#E8F5E9]/50 border-[#C8E6C9]'
                            : 'bg-[#F7F8FA] border-[#E4E8ED]'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[#1D2430]">
                            {st.room}
                          </span>
                          <span className="text-[11px] text-[#687385] font-mono">
                            {st.time}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#687385] mt-0.5">
                          Surface: {st.surface}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Last Confirmed Banner */}
          <div className="p-3.5 rounded-xl bg-white border border-[#E4E8ED] flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#687385] block">
                Last Confirmed Location
              </span>
              <span className="text-xs font-bold text-[#1D2430]">
                {lastLocation}
              </span>
            </div>
            <span className="text-[10px] font-semibold text-[#1E6B38] bg-[#E8F5E9] px-2 py-0.5 rounded border border-[#C8E6C9]">
              Start Here
            </span>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 bg-[#315B8A] hover:bg-[#26466B] active:scale-98 text-white rounded-xl text-xs font-semibold shadow-2xs transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
