export interface ObjectRecord {
  id: string;
  name: string;
  category: string;
  visualDescription: string;
  createdAt: string;
  lastSeenAt: string;
  distinctiveFeatures?: string[];
  latestObservation?: ObservationRecord | null;
  observationCount?: number;
}

export interface ObservationRecord {
  id: string;
  objectId: string;
  timestamp: string;
  room: string;
  surface: string;
  nearbyObjects: string[];
  sceneDescription: string;
  confidence: number;
  evidenceImagePath: string;
  source: 'AI' | 'AI + USER CONFIRMED' | 'USER CONFIRMED';
  boundingBox?: {
    ymin: number;
    xmin: number;
    ymax: number;
    xmax: number;
  };
}

export interface UsualLocationStat {
  totalObservations: number;
  mostCommonLocation: string | null;
  count: number;
  percentage: number;
  breakdown: Array<{ location: string; count: number; percentage: number }>;
  summaryText: string;
}

export interface GroundedFindResult {
  query: string;
  targetObjectName: string;
  matched_object_id?: string;
  status: 'LAST_SEEN' | 'LAST_KNOWN' | 'INFERRED' | 'NOT_FOUND';
  answer: string;
  freshnessLabel: string;
  primaryObservation: ObservationRecord | null;
  locationSummary: {
    room: string;
    surface: string;
    nearby: string[];
    timeStr: string;
  };
  confidence: number;
  retraceSteps: Array<{
    step: number;
    time: string;
    room: string;
    surface: string;
    note: string;
  }>;
  suggestedAction: string;
  whyIThinkThis: {
    lastVisualObservation: string;
    aiEstimatedSurface: string;
    nearbyContext: string;
  };
  usualLocationStat?: string;
}
