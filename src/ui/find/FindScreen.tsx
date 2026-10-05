import React, { useState } from 'react';
import { Search, Mic, MicOff, ArrowRight, Eye, History, Navigation, MapPin, Clock, ShieldCheck, HelpCircle } from 'lucide-react';
import { GroundedFindResult } from '../../types/client';

interface FindScreenProps {
  onViewEvidence: (observationId: string) => void;
  onViewHistory: (objectId: string) => void;
  onRetrace: (steps: any[], objectName: string, lastLocation: string) => void;
}

export const FindScreen: React.FC<FindScreenProps> = ({
  onViewEvidence,
  onViewHistory,
  onRetrace,
}) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [result, setResult] = useState<GroundedFindResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const SUGGESTED_QUERIES = [
    "Where's my wallet?",
    "Where did I leave my keys?",
    "Where was my charger?",
    "Where do I usually keep my keys?",
    "Help me retrace my steps",
  ];

  const handleSpeechInput = () => {
    if (typeof window === 'undefined') return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRec) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRec();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    if (!isListening) {
      setIsListening(true);
      recognition.start();

      recognition.onresult = (e: any) => {
        const text = e.results[0][0].transcript;
        setQuery(text);
        setIsListening(false);
        performSearch(text);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };
    } else {
      setIsListening(false);
      recognition.stop();
    }
  };

  const performSearch = async (textToSearch: string) => {
    const q = textToSearch.trim();
    if (!q) return;

    setIsSearching(true);
    setSearchError(null);

    try {
      const response = await fetch('/api/memory/find', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });

      if (!response.ok) {
        throw new Error('Failed to retrieve memory answer');
      }

      const data: GroundedFindResult = await response.json();
      setResult(data);
    } catch (err: any) {
      console.error('[FindScreen] Search error:', err);
      setSearchError(err.message || 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'LAST_SEEN':
        return (
          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-[#E8F5E9] text-[#1E6B38] border border-[#C8E6C9]">
            Last Seen
          </span>
        );
      case 'LAST_KNOWN':
        return (
          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">
            Last Known
          </span>
        );
      case 'INFERRED':
        return (
          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
            Inferred
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-[#F3F4F6] text-[#687385] border border-[#E5E7EB]">
            No Record
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col px-5 pt-3 pb-6 animate-fadeIn">
      {/* Title */}
      <div className="mb-4">
        <h1 className="text-xl font-bold tracking-tight text-[#1D2430]">
          Find Something
        </h1>
        <p className="text-xs text-[#687385] mt-0.5">
          Ask questions naturally. Grounded strictly in your camera observations.
        </p>
      </div>

      {/* Natural Language Search Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          performSearch(query);
        }}
        className="relative mb-3"
      >
        <div className="relative flex items-center">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Where did I put that?"
            className="w-full bg-white border border-[#E4E8ED] focus:border-[#315B8A] rounded-2xl py-3 pl-4 pr-20 text-xs text-[#1D2430] placeholder:text-[#9CA3AF] focus:outline-none transition-all shadow-2xs"
          />

          <div className="absolute right-1.5 flex items-center gap-1">
            <button
              type="button"
              onClick={handleSpeechInput}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                isListening
                  ? 'bg-[#B91C1C] text-white animate-pulse'
                  : 'bg-[#F7F8FA] text-[#687385] hover:text-[#1D2430]'
              }`}
              title={isListening ? 'Listening...' : 'Voice input'}
            >
              {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>

            <button
              type="submit"
              disabled={isSearching}
              className="w-7 h-7 rounded-lg bg-[#315B8A] hover:bg-[#26466B] active:scale-95 text-white flex items-center justify-center shadow-2xs transition-all"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </form>

      {/* Suggested Query Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-none">
        {SUGGESTED_QUERIES.map((sq, i) => (
          <button
            key={i}
            onClick={() => {
              setQuery(sq);
              performSearch(sq);
            }}
            className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-white hover:bg-[#F0F2F5] border border-[#E4E8ED] text-[11px] text-[#687385] font-medium active:scale-95 transition-all shadow-2xs flex-shrink-0"
          >
            {sq}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {isSearching && (
        <div className="p-8 text-center bg-white rounded-2xl border border-[#E4E8ED] my-4 shadow-2xs">
          <div className="w-6 h-6 border-2 border-[#315B8A] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs font-semibold text-[#1D2430]">Retrieving grounded memories…</p>
          <p className="text-[11px] text-[#687385] mt-0.5">Searching Room database records</p>
        </div>
      )}

      {/* Error state */}
      {searchError && (
        <div className="p-3.5 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-xs text-[#B91C1C] mb-4">
          {searchError}
        </div>
      )}

      {/* Grounded Result UI (Section 12) */}
      {!isSearching && result && (
        <div className="bg-white border border-[#E4E8ED] rounded-2xl p-4 shadow-2xs flex flex-col space-y-3.5 animate-fadeIn">
          {/* Top Info */}
          <div className="flex items-start justify-between border-b border-[#E4E8ED] pb-3">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#687385] block">
                {result.targetObjectName}
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                {getStatusBadge(result.status)}
                {result.freshnessLabel && (
                  <span className="text-xs text-[#687385]">
                    {result.freshnessLabel}
                  </span>
                )}
              </div>
            </div>

            {result.confidence > 0 && (
              <span className="text-xs font-semibold text-[#1E6B38]">
                {Math.round(result.confidence * 100)}% Confidence
              </span>
            )}
          </div>

          {/* Location Focus */}
          {result.status !== 'NOT_FOUND' && (
            <div>
              <div className="text-[11px] font-semibold text-[#687385] uppercase">
                Location
              </div>
              <h2 className="text-base font-bold text-[#1D2430] uppercase tracking-tight mt-0.5">
                {result.locationSummary.room} · {result.locationSummary.surface}
              </h2>
              {result.locationSummary.nearby.length > 0 && (
                <div className="text-xs text-[#687385] mt-1">
                  Near: <span className="text-[#1D2430] font-medium">{result.locationSummary.nearby.join(', ')}</span>
                </div>
              )}
            </div>
          )}

          {/* AI Grounded Narrative */}
          <div className="text-xs text-[#1D2430] leading-relaxed bg-[#F7F8FA] p-3 rounded-xl border border-[#E4E8ED]">
            {result.answer}
          </div>

          {/* Action Buttons: [ View Evidence ] [ View History ] [ Retrace My Steps ] */}
          {result.primaryObservation && (
            <div className="flex flex-col gap-2 pt-1">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onViewEvidence(result.primaryObservation!.id)}
                  className="py-2 px-3 rounded-xl bg-white hover:bg-[#F7F8FA] active:scale-95 text-[#1D2430] text-xs font-semibold flex items-center justify-center gap-1.5 border border-[#E4E8ED] shadow-2xs transition-all"
                >
                  <Eye className="w-3.5 h-3.5 text-[#315B8A]" />
                  <span>View Evidence</span>
                </button>

                <button
                  onClick={() => {
                    const objId = result.matched_object_id || result.primaryObservation?.objectId;
                    if (objId) {
                      onViewHistory(objId);
                    }
                  }}
                  className="py-2 px-3 rounded-xl bg-white hover:bg-[#F7F8FA] active:scale-95 text-[#1D2430] text-xs font-semibold flex items-center justify-center gap-1.5 border border-[#E4E8ED] shadow-2xs transition-all"
                >
                  <History className="w-3.5 h-3.5 text-[#315B8A]" />
                  <span>View History</span>
                </button>
              </div>

              <button
                onClick={() =>
                  onRetrace(
                    result.retraceSteps,
                    result.targetObjectName,
                    `${result.locationSummary.room} ${result.locationSummary.surface}`
                  )
                }
                className="w-full py-2.5 px-3 rounded-xl bg-[#315B8A] hover:bg-[#26466B] active:scale-98 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-all"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Retrace My Steps</span>
              </button>
            </div>
          )}

          {/* "Why I think this" Grounding Trust Box (Section 12) */}
          {result.whyIThinkThis && result.status !== 'NOT_FOUND' && (
            <div className="pt-2 border-t border-[#E4E8ED] text-xs space-y-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#687385] block">
                Why I think this
              </span>
              <div className="grid grid-cols-3 gap-2 text-[11px] bg-[#F7F8FA] p-2.5 rounded-lg border border-[#E4E8ED]">
                <div>
                  <span className="text-[#687385] block text-[10px]">Last visual observation</span>
                  <span className="font-medium text-[#1D2430] truncate block">
                    {result.whyIThinkThis.lastVisualObservation}
                  </span>
                </div>
                <div>
                  <span className="text-[#687385] block text-[10px]">AI-estimated surface</span>
                  <span className="font-medium text-[#1D2430] truncate block">
                    {result.whyIThinkThis.aiEstimatedSurface}
                  </span>
                </div>
                <div>
                  <span className="text-[#687385] block text-[10px]">Nearby</span>
                  <span className="font-medium text-[#1D2430] truncate block">
                    {result.whyIThinkThis.nearbyContext}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Usual Location Statistic */}
          {result.usualLocationStat && (
            <div className="text-[11px] text-[#687385] bg-[#F7F8FA] p-2.5 rounded-lg border border-[#E4E8ED]">
              <strong className="text-[#1D2430]">Frequency insight: </strong>
              {result.usualLocationStat}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
