import React, { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, Clock, Eye, Navigation, Tag, BarChart2, Shield } from 'lucide-react';
import { ObjectRecord, ObservationRecord, UsualLocationStat } from '../../types/client';

interface ObjectDetailScreenProps {
  objectId: string;
  onBack: () => void;
  onViewEvidence: (observationId: string) => void;
  onRetrace: (steps: any[], objectName: string, lastLocation: string) => void;
}

export const ObjectDetailScreen: React.FC<ObjectDetailScreenProps> = ({
  objectId,
  onBack,
  onViewEvidence,
  onRetrace,
}) => {
  const [objectData, setObjectData] = useState<{
    object: ObjectRecord;
    observations: ObservationRecord[];
    stats: UsualLocationStat;
  } | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/memory/objects/${objectId}`);
        if (!res.ok) throw new Error('Failed to load object');
        const data = await res.json();
        setObjectData(data);
      } catch (err) {
        console.error('[ObjectDetail] Load error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [objectId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-6 h-6 border-2 border-[#315B8A] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!objectData) {
    return (
      <div className="flex-1 p-6 text-center">
        <p className="text-xs text-[#687385]">Object not found in memory.</p>
        <button onClick={onBack} className="mt-3 text-xs text-[#315B8A] font-medium">
          Go Back
        </button>
      </div>
    );
  }

  const { object, observations, stats } = objectData;
  const latestObs = observations[0];
  const timeStr = latestObs
    ? new Date(latestObs.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  const retraceSteps = [...observations].reverse().map((obs, idx) => ({
    step: idx + 1,
    time: new Date(obs.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    room: obs.room,
    surface: obs.surface,
    note: obs.sceneDescription,
  }));

  return (
    <div className="flex-1 flex flex-col px-5 pt-3 pb-8 animate-fadeIn">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-lg bg-white border border-[#E4E8ED] flex items-center justify-center text-[#1D2430] active:scale-95 transition-all shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-semibold uppercase tracking-wider text-[#687385]">
          Object Memory
        </span>
        <div className="w-8 h-8"></div>
      </div>

      {/* Object Hero Card */}
      <div className="bg-white border border-[#E4E8ED] rounded-2xl p-4 shadow-2xs mb-4">
        <div className="flex items-center gap-3.5">
          <div className="w-16 h-16 rounded-xl bg-[#F7F8FA] border border-[#E4E8ED] overflow-hidden flex items-center justify-center flex-shrink-0">
            {latestObs?.evidenceImagePath ? (
              <img
                src={latestObs.evidenceImagePath}
                alt={object.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-base font-bold text-[#687385]">
                {object.name.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>

          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#315B8A] block">
              {object.category}
            </span>
            <h1 className="text-lg font-bold text-[#1D2430] truncate">
              {object.name}
            </h1>
            <div className="text-[11px] text-[#687385] mt-0.5 leading-snug line-clamp-2">
              {object.visualDescription}
            </div>
          </div>
        </div>

        {/* Current Status Highlights (Section 11 & 25) */}
        {latestObs && (
          <div className="mt-3.5 pt-3 border-t border-[#E4E8ED] grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-[#687385] text-[10px] uppercase font-semibold block">Status</span>
              <span className="font-semibold text-[#1E6B38]">Last seen</span>
            </div>
            <div>
              <span className="text-[#687385] text-[10px] uppercase font-semibold block">Location</span>
              <span className="font-semibold text-[#1D2430] truncate block">
                {latestObs.surface || latestObs.room}
              </span>
            </div>
            <div>
              <span className="text-[#687385] text-[10px] uppercase font-semibold block">Observed</span>
              <span className="font-semibold text-[#1D2430]">{timeStr}</span>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons: [ View Evidence ] [ Retrace My Steps ] */}
      {latestObs && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => onViewEvidence(latestObs.id)}
            className="py-2.5 px-3 rounded-xl bg-white hover:bg-[#F7F8FA] active:scale-95 text-[#1D2430] text-xs font-semibold flex items-center justify-center gap-1.5 border border-[#E4E8ED] shadow-2xs transition-all"
          >
            <Eye className="w-3.5 h-3.5 text-[#315B8A]" />
            <span>View Evidence</span>
          </button>

          <button
            onClick={() =>
              onRetrace(
                retraceSteps,
                object.name,
                `${latestObs.room} ${latestObs.surface}`
              )
            }
            className="py-2.5 px-3 rounded-xl bg-[#315B8A] hover:bg-[#26466B] active:scale-95 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-all"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Retrace Steps</span>
          </button>
        </div>
      )}

      {/* "Where do I usually keep it?" Real Statistic (Section 17) */}
      {stats && stats.totalObservations > 0 && (
        <div className="bg-white border border-[#E4E8ED] rounded-2xl p-3.5 shadow-2xs mb-4">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#687385] mb-2">
            <BarChart2 className="w-3.5 h-3.5 text-[#315B8A]" />
            <span>Frequency Insight</span>
          </div>
          <p className="text-xs text-[#1D2430] leading-snug">
            {stats.summaryText}
          </p>

          {stats.breakdown.length > 1 && (
            <div className="mt-2.5 pt-2 border-t border-[#E4E8ED] space-y-1.5">
              {stats.breakdown.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-[11px] text-[#687385]">
                  <span className="truncate pr-2">{item.location}</span>
                  <span className="font-medium text-[#1D2430]">{item.count} ({item.percentage}%)</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Observation History Timeline (Section 14) */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#687385]">
            Observation History
          </h2>
          <span className="text-[11px] text-[#687385]">
            {observations.length} {observations.length === 1 ? 'record' : 'records'}
          </span>
        </div>

        <div className="relative pl-4 border-l border-[#E4E8ED] space-y-3">
          {observations.map((obs) => {
            const obsTime = new Date(obs.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
            const obsDate = new Date(obs.timestamp).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
            });

            return (
              <div
                key={obs.id}
                onClick={() => onViewEvidence(obs.id)}
                className="group p-3 rounded-xl bg-white hover:bg-[#FDFDFE] border border-[#E4E8ED] active:scale-[0.99] cursor-pointer transition-all flex items-center justify-between shadow-2xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#1D2430]">
                      {obsTime}
                    </span>
                    <span className="text-[11px] text-[#687385]">({obsDate})</span>
                    <span className="text-[#D1D5DB]">·</span>
                    <span className="text-xs font-medium text-[#1D2430] truncate">
                      {obs.room} · {obs.surface}
                    </span>
                  </div>

                  {obs.nearbyObjects.length > 0 && (
                    <div className="text-[11px] text-[#687385] mt-0.5 truncate">
                      Near: {obs.nearbyObjects.join(', ')}
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-[10px] text-[#687385] mt-1">
                    <span className="text-[#1E6B38] font-medium">
                      {Math.round(obs.confidence * 100)}% conf.
                    </span>
                    <span>·</span>
                    <span>{obs.source}</span>
                  </div>
                </div>

                <div className="pl-2 flex items-center text-[#9CA3AF] group-hover:text-[#315B8A]">
                  <Eye className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
