import React from 'react';
import { Plus, Search, MapPin, Clock, ChevronRight, Sparkles, Inbox } from 'lucide-react';
import { ObjectRecord } from '../../types/client';

interface HomeScreenProps {
  objects: ObjectRecord[];
  onRememberClick: () => void;
  onFindClick: () => void;
  onSelectObject: (objectId: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  objects,
  onRememberClick,
  onFindClick,
  onSelectObject,
}) => {
  return (
    <div className="flex-1 flex flex-col px-5 pt-3 pb-6">
      {/* Top Brand Header */}
      <div className="flex flex-col mb-6">
        <h1 className="text-xl font-bold tracking-tight text-[#1D2430]">
          FIND-BACK
        </h1>
        <p className="text-sm text-[#687385] mt-0.5">
          Your phone remembers where you left it.
        </p>
      </div>

      {/* Large Primary Action: [ + Remember an Object ] */}
      <button
        onClick={onRememberClick}
        className="w-full bg-[#315B8A] hover:bg-[#26466B] active:scale-[0.99] text-white p-4 rounded-2xl shadow-sm transition-all flex items-center justify-between mb-3 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white">
            <Plus className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">Remember an Object</div>
            <div className="text-xs text-white/80">Point camera to record location</div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-white/70" />
      </button>

      {/* Secondary Action: [ Find Something ] */}
      <button
        onClick={onFindClick}
        className="w-full bg-white hover:bg-[#F0F2F5] active:scale-[0.99] border border-[#E4E8ED] p-3.5 rounded-2xl transition-all flex items-center justify-between mb-6 text-left shadow-2xs"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#F7F8FA] border border-[#E4E8ED] flex items-center justify-center text-[#315B8A]">
            <Search className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-[#1D2430]">Find Something</div>
            <div className="text-[11px] text-[#687385]">"Where's my wallet?"</div>
          </div>
        </div>
        <span className="text-[11px] font-medium text-[#315B8A]">Ask</span>
      </button>

      {/* Recent Memories Section Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#687385]">
          Recent Memories
        </h2>
        {objects.length > 0 && (
          <span className="text-xs text-[#687385]">
            {objects.length} {objects.length === 1 ? 'item' : 'items'}
          </span>
        )}
      </div>

      {/* List or Empty State */}
      {objects.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-14 px-4 text-center bg-white border border-[#E4E8ED] rounded-2xl shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-[#F7F8FA] border border-[#E4E8ED] flex items-center justify-center text-[#687385] mb-3">
            <Inbox className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-[#1D2430]">No memories yet.</h3>
          <p className="text-xs text-[#687385] mt-1 max-w-[240px]">
            Scan something important to remember it.
          </p>
          <button
            onClick={onRememberClick}
            className="mt-4 px-4 py-2 bg-[#315B8A] hover:bg-[#26466B] text-white text-xs font-medium rounded-xl transition-all shadow-2xs active:scale-95"
          >
            Scan an Object
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {objects.map((obj) => {
            const obs = obj.latestObservation;
            const timeStr = obs
              ? new Date(obs.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '';
            const confidencePct = obs ? Math.round(obs.confidence * 100) : 0;

            return (
              <div
                key={obj.id}
                onClick={() => onSelectObject(obj.id)}
                className="group p-3 rounded-2xl bg-white hover:bg-[#FDFDFE] border border-[#E4E8ED] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-between shadow-2xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Real Image Thumbnail */}
                  <div className="w-12 h-12 rounded-xl bg-[#F7F8FA] border border-[#E4E8ED] flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {obs?.evidenceImagePath ? (
                      <img
                        src={obs.evidenceImagePath}
                        alt={obj.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-semibold text-[#687385]">
                        {obj.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-[#1D2430] truncate">
                      {obj.name}
                    </h3>

                    <div className="flex items-center gap-1.5 text-xs text-[#687385] mt-0.5 truncate">
                      <MapPin className="w-3 h-3 text-[#315B8A] flex-shrink-0" />
                      <span className="truncate">
                        {obs ? `${obs.room} · ${obs.surface}` : 'Location recorded'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-[#687385] mt-0.5">
                      {timeStr && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#9CA3AF]" />
                          {timeStr}
                        </span>
                      )}
                      {confidencePct > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-[#1E6B38] font-medium">{confidencePct}% conf.</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#1D2430] transition-colors" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
