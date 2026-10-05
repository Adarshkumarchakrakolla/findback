import { appDatabase, ObjectEntity, ObservationEntity, RelationshipEntity } from '../data/database/AppDatabase';
import { geminiService } from '../ai/GeminiService';

export interface SaveObservationPayload {
  objectName: string;
  category: string;
  visualIdentity: {
    color: string;
    material: string;
    shape: string;
    distinctive_features: string[];
  };
  location: {
    room: string;
    surface: string;
  };
  nearbyObjects: string[];
  sceneDescription: string;
  confidence: number;
  evidenceImageBase64: string;
  boundingBox?: {
    ymin: number;
    xmin: number;
    ymax: number;
    xmax: number;
  };
  source: 'AI' | 'AI + USER CONFIRMED' | 'USER CONFIRMED';
  forcedObjectId?: string; // If user explicitly confirmed it is the same or a new object
}

export class MemoryRepository {
  /**
   * Save a real captured observation with deduplication checking
   */
  public async saveObservation(payload: SaveObservationPayload): Promise<{
    object: ObjectEntity;
    observation: ObservationEntity;
    isNewObject: boolean;
    evidenceImagePath: string;
  }> {
    const normalizedName = payload.objectName.trim();
    const displayName = normalizedName.charAt(0).toUpperCase() + normalizedName.slice(1);
    const nowIso = new Date().toISOString();

    const visualDescription = `${payload.visualIdentity.color} ${payload.visualIdentity.material} with ${payload.visualIdentity.distinctive_features.join(', ') || 'standard finish'}.`;

    let targetObject: ObjectEntity | undefined;

    if (payload.forcedObjectId) {
      targetObject = appDatabase.getObjectById(payload.forcedObjectId);
    }

    if (!targetObject) {
      // Look for candidates with same or similar name
      const candidates = appDatabase.getAllObjects().filter(
        (o) => o.name.toLowerCase() === normalizedName.toLowerCase()
      );

      if (candidates.length > 0) {
        // Run AI deduplication against existing candidates
        for (const candidate of candidates) {
          const check = await geminiService.checkDeduplication(
            {
              name: displayName,
              category: payload.category,
              visualDescription,
              distinctiveFeatures: payload.visualIdentity.distinctive_features,
            },
            {
              name: candidate.name,
              category: candidate.category,
              visualDescription: candidate.visualDescription,
              distinctiveFeatures: candidate.distinctiveFeatures || [],
            }
          );

          if (check.is_same_object && check.confidence >= 0.65) {
            targetObject = candidate;
            break;
          }
        }
      }
    }

    let isNewObject = false;

    if (!targetObject) {
      // Create new ObjectEntity
      isNewObject = true;
      targetObject = {
        id: `obj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: displayName,
        category: payload.category || 'personal_item',
        visualDescription,
        createdAt: nowIso,
        lastSeenAt: nowIso,
        distinctiveFeatures: payload.visualIdentity.distinctive_features,
      };
      appDatabase.insertObject(targetObject);
    } else {
      // Update last seen timestamp and distinctive features
      targetObject.lastSeenAt = nowIso;
      if (payload.visualIdentity.distinctive_features.length > 0) {
        const combined = Array.from(
          new Set([...(targetObject.distinctiveFeatures || []), ...payload.visualIdentity.distinctive_features])
        );
        targetObject.distinctiveFeatures = combined;
      }
      appDatabase.updateObject(targetObject);
    }

    // Save actual image to disk
    const observationId = `obs_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const imagePath = appDatabase.saveEvidenceImage(observationId, payload.evidenceImageBase64);

    // Create ObservationEntity
    const observation: ObservationEntity = {
      id: observationId,
      objectId: targetObject.id,
      timestamp: nowIso,
      room: payload.location.room,
      surface: payload.location.surface,
      nearbyObjects: payload.nearbyObjects || [],
      sceneDescription: payload.sceneDescription,
      confidence: payload.confidence,
      evidenceImagePath: imagePath,
      source: payload.source,
      boundingBox: payload.boundingBox,
    };
    appDatabase.insertObservation(observation);

    // Create relationships
    if (payload.location.surface && payload.location.surface !== 'Unknown surface') {
      appDatabase.insertRelationship({
        id: `rel_${Date.now()}_1`,
        observationId,
        objectA: targetObject.name,
        relationship: 'ON',
        objectB: `${payload.location.room} ${payload.location.surface}`.trim(),
        confidence: payload.confidence,
      });
    }

    if (payload.nearbyObjects && payload.nearbyObjects.length > 0) {
      payload.nearbyObjects.forEach((nearby, idx) => {
        appDatabase.insertRelationship({
          id: `rel_${Date.now()}_${idx + 2}`,
          observationId,
          objectA: targetObject!.name,
          relationship: 'NEAR',
          objectB: nearby,
          confidence: Math.round((payload.confidence - 0.05) * 100) / 100,
        });
      });
    }

    return {
      object: targetObject,
      observation,
      isNewObject,
      evidenceImagePath: imagePath,
    };
  }

  /**
   * Real calculation for "Where do I usually keep it?"
   * Strictly computes statistics from Room/SQLite observation occurrences
   */
  public calculateUsualLocation(objectId: string): {
    totalObservations: number;
    mostCommonLocation: string | null;
    count: number;
    percentage: number;
    breakdown: Array<{ location: string; count: number; percentage: number }>;
    summaryText: string;
  } {
    const object = appDatabase.getObjectById(objectId);
    if (!object) {
      return {
        totalObservations: 0,
        mostCommonLocation: null,
        count: 0,
        percentage: 0,
        breakdown: [],
        summaryText: 'Object not found in memory.',
      };
    }

    const observations = appDatabase.getObservationsForObject(objectId);
    if (observations.length === 0) {
      return {
        totalObservations: 0,
        mostCommonLocation: null,
        count: 0,
        percentage: 0,
        breakdown: [],
        summaryText: `No recorded observations for ${object.name} yet.`,
      };
    }

    // Group by location string "Room Surface"
    const counts: Record<string, number> = {};
    observations.forEach((obs) => {
      const loc = `${obs.room} ${obs.surface}`.trim();
      counts[loc] = (counts[loc] || 0) + 1;
    });

    const breakdown = Object.entries(counts)
      .map(([location, count]) => ({
        location,
        count,
        percentage: Math.round((count / observations.length) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    const top = breakdown[0];
    const summaryText =
      breakdown.length === 1 && top.count === 1
        ? `You have observed your ${object.name} once at ${top.location}.`
        : `You most often leave your ${object.name} at ${top.location}: ${top.count} of ${observations.length} observations (${top.percentage}%).`;

    return {
      totalObservations: observations.length,
      mostCommonLocation: top ? top.location : null,
      count: top ? top.count : 0,
      percentage: top ? top.percentage : 0,
      breakdown,
      summaryText,
    };
  }
}

export const memoryRepository = new MemoryRepository();
