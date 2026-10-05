/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AndroidFrame } from './ui/AndroidFrame';
import { HomeScreen } from './ui/home/HomeScreen';
import { CameraScreen } from './ui/camera/CameraScreen';
import { FindScreen } from './ui/find/FindScreen';
import { MemoryListScreen } from './ui/memory/MemoryListScreen';
import { ObjectDetailScreen } from './ui/history/ObjectDetailScreen';
import { EvidenceModal } from './ui/evidence/EvidenceModal';
import { RetraceModal } from './ui/retrace/RetraceModal';
import { SettingsScreen } from './ui/settings/SettingsScreen';
import { ObjectRecord } from './types/client';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'find' | 'memory' | 'settings'>('home');
  const [objects, setObjects] = useState<ObjectRecord[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [evidenceObservationId, setEvidenceObservationId] = useState<string | null>(null);

  const [retraceState, setRetraceState] = useState<{
    open: boolean;
    steps: any[];
    objectName: string;
    lastLocation: string;
  }>({
    open: false,
    steps: [],
    objectName: 'Object',
    lastLocation: 'Unknown',
  });

  const loadObjects = async () => {
    try {
      const res = await fetch('/api/memory/objects');
      if (res.ok) {
        const data = await res.json();
        setObjects(data);
      }
    } catch (err) {
      console.error('[App] Failed to load objects from database:', err);
    }
  };

  useEffect(() => {
    loadObjects();
  }, []);

  const handleOpenRemember = () => {
    setSelectedObjectId(null);
    setIsCameraOpen(true);
  };

  const handleSavedObservation = (savedObjectId: string) => {
    setIsCameraOpen(false);
    loadObjects();
    setSelectedObjectId(savedObjectId);
  };

  const handleOpenRetrace = (steps: any[], objectName: string, lastLocation: string) => {
    setRetraceState({
      open: true,
      steps,
      objectName,
      lastLocation,
    });
  };

  return (
    <AndroidFrame
      activeTab={activeTab}
      onTabChange={(tab) => {
        setIsCameraOpen(false);
        setSelectedObjectId(null);
        setActiveTab(tab);
      }}
    >
      {/* 1. Camera Screen (Full Viewport Scanner) */}
      {isCameraOpen ? (
        <CameraScreen
          onBack={() => setIsCameraOpen(false)}
          onSaved={handleSavedObservation}
        />
      ) : selectedObjectId ? (
        /* 2. Object Detail & Observation History View */
        <ObjectDetailScreen
          objectId={selectedObjectId}
          onBack={() => {
            setSelectedObjectId(null);
            loadObjects();
          }}
          onViewEvidence={(obsId) => setEvidenceObservationId(obsId)}
          onRetrace={(steps, objName, lastLoc) => handleOpenRetrace(steps, objName, lastLoc)}
        />
      ) : activeTab === 'home' ? (
        /* 3. Home Screen */
        <HomeScreen
          objects={objects}
          onRememberClick={handleOpenRemember}
          onFindClick={() => setActiveTab('find')}
          onSelectObject={(objId) => setSelectedObjectId(objId)}
        />
      ) : activeTab === 'find' ? (
        /* 4. Find Screen */
        <FindScreen
          onViewEvidence={(obsId) => setEvidenceObservationId(obsId)}
          onViewHistory={(objId) => setSelectedObjectId(objId)}
          onRetrace={(steps, objName, lastLoc) => handleOpenRetrace(steps, objName, lastLoc)}
        />
      ) : activeTab === 'memory' ? (
        /* 5. Memory List Screen */
        <MemoryListScreen
          objects={objects}
          onSelectObject={(objId) => setSelectedObjectId(objId)}
          onRememberClick={handleOpenRemember}
        />
      ) : (
        /* 6. Settings Screen */
        <SettingsScreen
          onMemoriesCleared={() => {
            setSelectedObjectId(null);
            loadObjects();
          }}
        />
      )}

      {/* Real Captured Evidence Modal */}
      {evidenceObservationId && (
        <EvidenceModal
          observationId={evidenceObservationId}
          onClose={() => setEvidenceObservationId(null)}
        />
      )}

      {/* Retrace My Steps Modal */}
      {retraceState.open && (
        <RetraceModal
          steps={retraceState.steps}
          objectName={retraceState.objectName}
          lastLocation={retraceState.lastLocation}
          onClose={() => setRetraceState((prev) => ({ ...prev, open: false }))}
        />
      )}
    </AndroidFrame>
  );
}
