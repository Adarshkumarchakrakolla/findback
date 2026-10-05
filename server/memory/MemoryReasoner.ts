import { appDatabase, ObservationEntity } from '../data/database/AppDatabase';
import { geminiService } from '../ai/GeminiService';
import { memoryRepository } from './MemoryRepository';

export interface ReasonedMemoryResult {
  query: string;
  targetObjectName: string;
  status: 'LAST_SEEN' | 'LAST_KNOWN' | 'INFERRED' | 'NOT_FOUND';
  answer: string;
  freshnessLabel: string;
  primaryObservation: ObservationEntity | null;
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

export class MemoryReasoner {
  public static calculateFreshness(timestamp: string): { label: string; relativeText: string } {
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const diffMins = Math.round(diffMs / (1000 * 60));
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffMins < 30) {
      return {
        label: 'Recent',
        relativeText: diffMins <= 1 ? 'Just now' : `${diffMins} minutes ago`,
      };
    } else if (diffHours < 6) {
      return {
        label: 'Earlier today',
        relativeText: `${Math.round(diffHours)} hours ago`,
      };
    } else if (diffHours < 24) {
      return {
        label: 'Today',
        relativeText: 'Earlier today',
      };
    } else if (diffHours < 48) {
      return {
        label: 'Yesterday',
        relativeText: 'Yesterday',
      };
    } else {
      const days = Math.round(diffHours / 24);
      return {
        label: `${days} days ago`,
        relativeText: `${days} days ago`,
      };
    }
  }

  public async reasonAboutQuery(query: string): Promise<ReasonedMemoryResult> {
    const cleanQuery = query.toLowerCase().trim();
    const allObjects = appDatabase.getAllObjects();

    // 1. Fast direct match against saved database objects
    let matchedObject = allObjects.find(
      (o) =>
        cleanQuery.includes(o.name.toLowerCase()) ||
        o.name.toLowerCase().includes(cleanQuery)
    );

    let parsedQuery = {
      target_object: matchedObject ? matchedObject.name : query.replace(/^(where\s+is\s+my|where's\s+my|where\s+did\s+i\s+leave\s+my|where\s+was\s+my|where\s+is\s+the|find\s+my|show\s+my)\s+/i, '').replace(/[\?\.\!]/g, '').trim(),
      requested_operation: cleanQuery.includes('usually') ? 'usual_spot' : 'find_last_location',
    };

    // If no direct name match, parse with AI
    if (!matchedObject && allObjects.length > 0) {
      try {
        const aiParsed = await Promise.race([
          geminiService.interpretQuery(query),
          new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2500)),
        ]);
        parsedQuery = { ...parsedQuery, ...aiParsed };

        const targetWord = (aiParsed.target_object || '').toLowerCase().trim();
        matchedObject = allObjects.find(
          (o) =>
            o.name.toLowerCase() === targetWord ||
            o.name.toLowerCase().includes(targetWord) ||
            targetWord.includes(o.name.toLowerCase()) ||
            o.category.toLowerCase().includes(targetWord) ||
            o.visualDescription.toLowerCase().includes(targetWord)
        );
      } catch (err) {
        // Fallback keyword matching
        const words = cleanQuery.split(/\s+/);
        matchedObject = allObjects.find((o) =>
          words.some((w) => w.length > 2 && o.name.toLowerCase().includes(w))
        );
      }
    }

    if (!matchedObject) {
      return {
        query,
        targetObjectName: parsedQuery.target_object,
        status: 'NOT_FOUND',
        answer: `I don't have any recorded observations for "${parsedQuery.target_object || query}" in memory yet. Scan it using the camera to start remembering it.`,
        freshnessLabel: 'No records',
        primaryObservation: null,
        locationSummary: {
          room: 'None',
          surface: 'None',
          nearby: [],
          timeStr: 'Never seen',
        },
        confidence: 0,
        retraceSteps: [],
        suggestedAction: 'Point the camera at this item and tap Remember.',
        whyIThinkThis: {
          lastVisualObservation: 'None',
          aiEstimatedSurface: 'None',
          nearbyContext: 'None',
        },
      };
    }

    // 3. Retrieve all observations for this object sorted by timestamp (newest first)
    const observations = appDatabase.getObservationsForObject(matchedObject.id);

    if (observations.length === 0) {
      return {
        query,
        targetObjectName: matchedObject.name,
        status: 'NOT_FOUND',
        answer: `Your ${matchedObject.name} exists in memory, but has no recorded visual observations.`,
        freshnessLabel: 'No observations',
        primaryObservation: null,
        locationSummary: {
          room: 'None',
          surface: 'None',
          nearby: [],
          timeStr: 'Never observed',
        },
        confidence: 0,
        retraceSteps: [],
        suggestedAction: 'Capture an observation with the camera.',
        whyIThinkThis: {
          lastVisualObservation: 'None',
          aiEstimatedSurface: 'None',
          nearbyContext: 'None',
        },
      };
    }

    // 4. Calculate actual statistics for "Where do I usually keep it?"
    const usualStat = memoryRepository.calculateUsualLocation(matchedObject.id);
    const latest = observations[0];

    // 5. Generate Grounded Answer strictly from observations (with timeout safeguard)
    const groundedResult = await Promise.race([
      geminiService.generateGroundedAnswer(
        query,
        parsedQuery,
        observations,
        usualStat.summaryText
      ),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error('AI generation timeout')), 3500)),
    ]).catch(() => {
      // Deterministic fallback grounded strictly in database observations
      const dateObj = new Date(latest.timestamp);
      const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const nearbyStr = latest.nearbyObjects.length > 0 ? `, beside your ${latest.nearbyObjects.join(' and ')}` : '';
      return {
        target_object_name: matchedObject!.name,
        matched_object_id: matchedObject!.id,
        status: 'LAST_SEEN',
        answer: `Your ${matchedObject!.name} was last seen on the ${latest.room} ${latest.surface} at ${timeStr}${nearbyStr}. Confidence: ${Math.round(latest.confidence * 100)}%.`,
        primary_observation_id: latest.id,
        location_summary: {
          room: latest.room,
          surface: latest.surface,
          nearby: latest.nearbyObjects,
          time_str: timeStr,
        },
        confidence: latest.confidence,
        retrace_steps: observations.slice(0, 5).reverse().map((obs, idx) => ({
          step: idx + 1,
          time: new Date(obs.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          room: obs.room,
          surface: obs.surface,
          note: obs.sceneDescription,
        })),
        suggested_action: `Start searching at the ${latest.room} ${latest.surface}.`,
        why_i_think_this: {
          last_visual_observation: timeStr,
          ai_estimated_surface: `${latest.room} · ${latest.surface}`,
          nearbyContext: latest.nearbyObjects.join(' + ') || 'None recorded',
        },
      };
    });

    const freshness = MemoryReasoner.calculateFreshness(latest.timestamp);

    // Retrace steps: all observations for this object in chronological order
    const chronological = [...observations].reverse();
    const retraceSteps = chronological.map((obs, idx) => ({
      step: idx + 1,
      time: new Date(obs.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      room: obs.room,
      surface: obs.surface,
      note: obs.sceneDescription,
    }));

    return {
      query,
      targetObjectName: matchedObject.name,
      status: groundedResult.status,
      answer: groundedResult.answer,
      freshnessLabel: freshness.relativeText,
      primaryObservation: latest,
      locationSummary: {
        room: latest.room,
        surface: latest.surface,
        nearby: latest.nearbyObjects,
        timeStr: new Date(latest.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
      confidence: latest.confidence,
      retraceSteps,
      suggestedAction: groundedResult.suggested_action,
      whyIThinkThis: {
        lastVisualObservation: `${new Date(latest.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })} (${freshness.relativeText})`,
        aiEstimatedSurface: `${latest.room} · ${latest.surface}`,
        nearbyContext: latest.nearbyObjects.length > 0 ? latest.nearbyObjects.join(' + ') : 'None detected',
      },
      usualLocationStat: usualStat.summaryText,
    };
  }
}

export const memoryReasoner = new MemoryReasoner();
