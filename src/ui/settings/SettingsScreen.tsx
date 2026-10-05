import React, { useState, useEffect } from 'react';
import { Settings, Shield, Cpu, HardDrive, Trash2, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

interface SettingsScreenProps {
  onMemoriesCleared: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onMemoriesCleared }) => {
  const [statusData, setStatusData] = useState<{
    appName: string;
    status: string;
    geminiConfigured: boolean;
    objectsStored: number;
    observationsStored: number;
  } | null>(null);

  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        setStatusData(data);
      }
    } catch (err) {
      console.error('[Settings] Status error:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch('/api/memory/all', {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Deletion failed');
      const data = await res.json();

      setShowConfirm(false);
      setNotice(`Cleared ${data.objectsDeleted} objects, ${data.observationsDeleted} observations, and ${data.imagesDeleted} images.`);
      onMemoriesCleared();
      fetchStatus();
      setTimeout(() => setNotice(null), 4000);
    } catch (err: any) {
      alert('Failed to clear memories: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col px-5 pt-3 pb-8 animate-fadeIn">
      {/* Toast */}
      {notice && (
        <div className="mb-3 p-3 bg-[#E8F5E9] border border-[#C8E6C9] rounded-xl text-xs text-[#1E6B38] font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold tracking-tight text-[#1D2430]">
          Settings
        </h1>
        <p className="text-xs text-[#687385] mt-0.5">
          Privacy, local storage &amp; AI connectivity
        </p>
      </div>

      <div className="space-y-4">
        {/* Privacy & Core Principle (Section 28) */}
        <div className="bg-white border border-[#E4E8ED] rounded-2xl p-4 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#1D2430] uppercase tracking-wider">
            <Shield className="w-4 h-4 text-[#315B8A]" />
            <span>Privacy Principle</span>
          </div>
          <p className="text-xs text-[#1D2430] leading-relaxed">
            "We don't track your things. We remember your world."
          </p>
          <p className="text-[11px] text-[#687385] leading-relaxed">
            FIND-BACK never performs continuous background camera recording. The camera is only accessed when you explicitly tap to remember an object.
          </p>
        </div>

        {/* AI Multimodal Service Status */}
        <div className="bg-white border border-[#E4E8ED] rounded-2xl p-4 shadow-2xs space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#1D2430] uppercase tracking-wider">
            <Cpu className="w-4 h-4 text-[#315B8A]" />
            <span>AI Service</span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-[#E4E8ED]">
            <span className="text-[#687385]">Model</span>
            <span className="font-semibold text-[#1D2430]">Gemini 3.8 Flash</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#687385]">Connection</span>
            <span className={`font-semibold flex items-center gap-1.5 ${statusData?.geminiConfigured ? 'text-[#1E6B38]' : 'text-[#B45309]'}`}>
              <span className={`w-2 h-2 rounded-full ${statusData?.geminiConfigured ? 'bg-[#1E6B38]' : 'bg-[#B45309]'}`}></span>
              {statusData?.geminiConfigured ? 'Connected' : 'Needs Server Key'}
            </span>
          </div>
        </div>

        {/* Local Persistent Storage Metrics (Section 28) */}
        <div className="bg-white border border-[#E4E8ED] rounded-2xl p-4 shadow-2xs space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#1D2430] uppercase tracking-wider">
            <HardDrive className="w-4 h-4 text-[#315B8A]" />
            <span>Room / SQLite Database</span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#E4E8ED]">
            <div className="bg-[#F7F8FA] p-2.5 rounded-xl border border-[#E4E8ED]">
              <span className="text-[10px] text-[#687385] uppercase block">Saved Objects</span>
              <span className="text-sm font-bold text-[#1D2430]">
                {statusData?.objectsStored ?? 0}
              </span>
            </div>
            <div className="bg-[#F7F8FA] p-2.5 rounded-xl border border-[#E4E8ED]">
              <span className="text-[10px] text-[#687385] uppercase block">Visual Observations</span>
              <span className="text-sm font-bold text-[#1D2430]">
                {statusData?.observationsStored ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* About FIND-BACK */}
        <div className="bg-white border border-[#E4E8ED] rounded-2xl p-4 shadow-2xs space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#1D2430] uppercase tracking-wider">
            <Info className="w-4 h-4 text-[#315B8A]" />
            <span>About FIND-BACK</span>
          </div>
          <p className="text-xs text-[#687385]">
            FIND-BACK Physical-Object Memory Prototype. Built for Android-first personal productivity.
          </p>
        </div>

        {/* Delete All Memories Button (Section 29) */}
        <div className="pt-2">
          <button
            onClick={() => setShowConfirm(true)}
            className="w-full py-3 px-4 bg-[#FEF2F2] hover:bg-[#FEE2E2] active:scale-98 border border-[#FCA5A5] text-[#B91C1C] text-xs font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-2xs"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete All Memories</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E8ED] p-5 rounded-2xl max-w-xs w-full text-center shadow-xl">
            <div className="w-10 h-10 rounded-full bg-[#FEF2F2] text-[#B91C1C] flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#1D2430]">Permanently Delete Memories?</h3>
            <p className="text-xs text-[#687385] mt-1 mb-4 leading-relaxed">
              This will physically wipe all Room database records and remove all stored evidence image files.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2 px-3 bg-[#F7F8FA] hover:bg-[#EAEBED] border border-[#E4E8ED] text-xs font-medium text-[#1D2430] rounded-xl"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={handleDeleteAll}
                className="flex-1 py-2 px-3 bg-[#B91C1C] hover:bg-[#991B1B] text-xs font-medium text-white rounded-xl shadow-xs"
              >
                {isDeleting ? 'Deleting...' : 'Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
