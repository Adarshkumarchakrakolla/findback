import React from 'react';
import { Layers, MapPin, Clock, ChevronRight, Inbox, Plus } from 'lucide-react';
import { ObjectRecord } from '../../types/client';

interface MemoryListScreenProps {
  objects: ObjectRecord[];
  onSelectObject: (objectId: string) => void;
  onRememberClick: () => void;
}

export const MemoryListScreen: React.FC<MemoryListScreenProps> = ({
  objects,
  onSelectObject,
  onRememberClick,
}) => {
  return (
    <div className="flex-1 flex flex-col px-5 pt-3 pb-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#1D2430]">
            Memory
          </h1>
          <p className="text-xs text-[#687385] mt-0.5">
            Physical objects recorded in your environment
          </p>
        </div>

        <button
          onClick={onRememberClick}
          className="w-8 h-8 rounded-lg bg-[#315B8A] hover:bg-[#26466B] active:scale-95 text-white flex items-center justify-center shadow-2xs transition-all"
          title="Remember new object"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Object List or Empty State (Section 19 & 27) */}
      {objects.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-16 px-4 text-center bg-white border border-[#E4E8ED] rounded-2xl shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-[#F7F8FA] border border-[#E4E8ED] flex items-center justify-center text-[#687385] mb-3">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-[#1D2430]">No memories yet.</h3>
          <p className="text-xs text-[#687385] mt-1 max-w-[240px]">
            Scan an object to give FIND-BACK its first memory.
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
            const obsCount = obj.observationCount || 1;

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

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-[#1D2430] truncate">
                        {obj.name}
                      </h3>
                      <span className="text-[10px] text-[#687385] bg-[#F7F8FA] px-1.5 py-0.2 rounded border border-[#E4E8ED]">
                        {obsCount} {obsCount === 1 ? 'obs' : 'obs'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-[#687385] mt-0.5 truncate">
                      <MapPin className="w-3 h-3 text-[#315B8A] flex-shrink-0" />
                      <span className="truncate">
                        {obs ? `${obs.room} · ${obs.surface}` : 'Location recorded'}
                      </span>
                    </div>

                    {timeStr && (
                      <div className="flex items-center gap-1 text-[11px] text-[#687385] mt-0.5">
                        <Clock className="w-3 h-3 text-[#9CA3AF]" />
                        <span>Last seen: {timeStr}</span>
                      </div>
                    )}
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
