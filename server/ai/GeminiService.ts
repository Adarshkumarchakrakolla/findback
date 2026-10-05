import { GoogleGenAI, Type } from '@google/genai';
import { PromptBuilder } from './PromptBuilder';
import { JsonParser } from './JsonParser';

export class GeminiService {
  private ai: GoogleGenAI;
  private hasKey: boolean;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || '';
    this.hasKey = !!apiKey && apiKey !== 'MY_GEMINI_API_KEY';
    this.ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  public isConfigured(): boolean {
    return this.hasKey;
  }

  /**
   * Real Multimodal Image Analysis using Gemini 3.8 Flash
   */
  public async analyzeImage(
    base64Data: string,
    mimeType = 'image/jpeg',
    userHint?: string
  ): Promise<any> {
    if (!this.hasKey) {
      throw new Error('GEMINI_API_KEY is not configured on the server. Please provide a valid Gemini API Key in the environment.');
    }

    const cleanBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
    const prompt = PromptBuilder.buildImageAnalysisPrompt(userHint);

    let rawText = '';
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: cleanBase64,
              },
            },
            {
              text: prompt,
            },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              object_name: { type: Type.STRING },
              category: { type: Type.STRING },
              visual_identity: {
                type: Type.OBJECT,
                properties: {
                  color: { type: Type.STRING },
                  material: { type: Type.STRING },
                  shape: { type: Type.STRING },
                  distinctive_features: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ['color', 'material', 'shape'],
              },
              location: {
                type: Type.OBJECT,
                properties: {
                  room: { type: Type.STRING },
                  surface: { type: Type.STRING },
                },
                required: ['room', 'surface'],
              },
              nearby_objects: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              scene_description: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
              bounding_box: {
                type: Type.OBJECT,
                properties: {
                  ymin: { type: Type.INTEGER },
                  xmin: { type: Type.INTEGER },
                  ymax: { type: Type.INTEGER },
                  xmax: { type: Type.INTEGER },
                },
              },
            },
            required: [
              'object_name',
              'category',
              'visual_identity',
              'location',
              'nearby_objects',
              'scene_description',
              'confidence',
            ],
          },
        },
      });

      rawText = response.text || '';
      const parsed = JsonParser.extractAndParse(rawText);
      return JsonParser.validateImageAnalysis(parsed);
    } catch (err: any) {
      console.warn('[GeminiService] Primary analysis error, attempting strict retry:', err.message);

      // Retry once with direct JSON instruction
      try {
        const retryResponse = await this.ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: cleanBase64,
                },
              },
              {
                text: `${prompt}\nCRITICAL: Output ONLY a single JSON object. No explanation.`,
              },
            ],
          },
          config: {
            responseMimeType: 'application/json',
          },
        });
        rawText = retryResponse.text || '';
        const parsed = JsonParser.extractAndParse(rawText);
        return JsonParser.validateImageAnalysis(parsed);
      } catch (retryErr: any) {
        console.error('[GeminiService] Analysis failed after retry:', retryErr.message);
        throw new Error(`Gemini Multimodal Analysis failed: ${retryErr.message}`);
      }
    }
  }

  /**
   * Check whether new visual observation matches an existing object
   */
  public async checkDeduplication(
    candidate: { name: string; category: string; visualDescription: string; distinctiveFeatures: string[] },
    existing: { name: string; category: string; visualDescription: string; distinctiveFeatures: string[] }
  ): Promise<{ is_same_object: boolean; confidence: number; reasoning: string; requires_user_confirmation: boolean }> {
    if (!this.hasKey) {
      // Fallback logic if without key: match on exact name
      const isSame = candidate.name.toLowerCase() === existing.name.toLowerCase();
      return {
        is_same_object: isSame,
        confidence: isSame ? 0.8 : 0.2,
        reasoning: 'Evaluated by name comparison.',
        requires_user_confirmation: true,
      };
    }

    const prompt = PromptBuilder.buildObjectDeduplicationPrompt(candidate, existing);
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      return JsonParser.extractAndParse(response.text || '{}');
    } catch (err: any) {
      console.error('[GeminiService] Deduplication check failed:', err.message);
      return {
        is_same_object: candidate.name.toLowerCase() === existing.name.toLowerCase(),
        confidence: 0.5,
        reasoning: 'Matching error, falling back to name heuristic.',
        requires_user_confirmation: true,
      };
    }
  }

  /**
   * Parse user natural language query
   */
  public async interpretQuery(query: string): Promise<{
    target_object: string;
    requested_operation: 'find_last_location' | 'history' | 'retrace' | 'usual_spot' | 'nearby_query' | 'general';
    time_constraint: string | null;
    relationship_constraint: string | null;
  }> {
    if (!this.hasKey) {
      // Basic rule extraction
      const q = query.toLowerCase();
      let target = 'item';
      for (const noun of ['wallet', 'keys', 'key', 'charger', 'passport', 'glasses', 'earbuds', 'id', 'remote', 'notebook', 'bottle', 'backpack']) {
        if (q.includes(noun)) {
          target = noun;
          break;
        }
      }
      return {
        target_object: target,
        requested_operation: q.includes('retrace')
          ? 'retrace'
          : q.includes('history')
          ? 'history'
          : q.includes('usually')
          ? 'usual_spot'
          : 'find_last_location',
        time_constraint: q.includes('yesterday') ? 'yesterday' : null,
        relationship_constraint: null,
      };
    }

    const prompt = PromptBuilder.buildQueryInterpretationPrompt(query);
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              target_object: { type: Type.STRING },
              requested_operation: {
                type: Type.STRING,
                description: 'Must be find_last_location, history, retrace, usual_spot, nearby_query, or general',
              },
              time_constraint: { type: Type.STRING, nullable: true },
              relationship_constraint: { type: Type.STRING, nullable: true },
            },
            required: ['target_object', 'requested_operation'],
          },
        },
      });

      return JsonParser.extractAndParse(response.text || '{}');
    } catch (err: any) {
      console.error('[GeminiService] Query interpretation failed:', err.message);
      return {
        target_object: query.replace(/[^a-zA-Z0-9\s]/g, '').trim(),
        requested_operation: 'find_last_location',
        time_constraint: null,
        relationship_constraint: null,
      };
    }
  }

  /**
   * Grounded answer synthesis - ONLY uses database observations, strictly never hallucinates
   */
  public async generateGroundedAnswer(
    query: string,
    parsedQuery: any,
    observations: any[],
    usualSpotStat?: string
  ): Promise<{
    target_object_name: string;
    matched_object_id: string | null;
    status: 'LAST_SEEN' | 'LAST_KNOWN' | 'INFERRED' | 'NOT_FOUND';
    answer: string;
    primary_observation_id: string | null;
    location_summary: {
      room: string;
      surface: string;
      nearby: string[];
      time_str: string;
    };
    confidence: number;
    retrace_steps: Array<{
      step: number;
      time: string;
      room: string;
      surface: string;
      note: string;
    }>;
    suggested_action: string;
    why_i_think_this: {
      last_visual_observation: string;
      ai_estimated_surface: string;
      nearby_context: string;
    };
  }> {
    if (observations.length === 0) {
      return {
        target_object_name: parsedQuery.target_object || 'item',
        matched_object_id: null,
        status: 'NOT_FOUND',
        answer: `I don't have any recorded memories for "${parsedQuery.target_object || query}" yet. Point the camera at it and tap "Remember" to store your first observation.`,
        primary_observation_id: null,
        location_summary: {
          room: 'None',
          surface: 'None',
          nearby: [],
          time_str: 'Never observed',
        },
        confidence: 0,
        retrace_steps: [],
        suggested_action: 'Scan this object to record where it is.',
        why_i_think_this: {
          last_visual_observation: 'No visual observations in database',
          ai_estimated_surface: 'None',
          nearby_context: 'None',
        },
      };
    }

    const latest = observations[0];
    const prompt = PromptBuilder.buildGroundedAnswerPrompt(
      query,
      parsedQuery,
      observations,
      usualSpotStat
    );

    if (!this.hasKey) {
      // Deterministic grounded synthesis purely from database observations
      const dateObj = new Date(latest.timestamp);
      const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const nearbyStr = latest.nearbyObjects.length > 0 ? ` beside your ${latest.nearbyObjects.join(' and ')}` : '';

      return {
        target_object_name: parsedQuery.target_object || 'object',
        matched_object_id: latest.objectId,
        status: 'LAST_SEEN',
        answer: `Your ${parsedQuery.target_object || 'item'} was last seen on the ${latest.room} ${latest.surface} at ${timeStr}${nearbyStr}. Confidence: ${Math.round(latest.confidence * 100)}%.`,
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
          ai_estimated_surface: `${latest.room} ${latest.surface}`,
          nearby_context: latest.nearbyObjects.join(' + ') || 'None recorded',
        },
      };
    }

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              target_object_name: { type: Type.STRING },
              matched_object_id: { type: Type.STRING, nullable: true },
              status: {
                type: Type.STRING,
                description: 'Must be LAST_SEEN, LAST_KNOWN, INFERRED, or NOT_FOUND',
              },
              answer: { type: Type.STRING },
              primary_observation_id: { type: Type.STRING, nullable: true },
              location_summary: {
                type: Type.OBJECT,
                properties: {
                  room: { type: Type.STRING },
                  surface: { type: Type.STRING },
                  nearby: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  time_str: { type: Type.STRING },
                },
                required: ['room', 'surface', 'nearby', 'time_str'],
              },
              confidence: { type: Type.NUMBER },
              retrace_steps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    step: { type: Type.INTEGER },
                    time: { type: Type.STRING },
                    room: { type: Type.STRING },
                    surface: { type: Type.STRING },
                    note: { type: Type.STRING },
                  },
                  required: ['step', 'time', 'room', 'surface'],
                },
              },
              suggested_action: { type: Type.STRING },
              why_i_think_this: {
                type: Type.OBJECT,
                properties: {
                  last_visual_observation: { type: Type.STRING },
                  ai_estimated_surface: { type: Type.STRING },
                  nearby_context: { type: Type.STRING },
                },
                required: ['last_visual_observation', 'ai_estimated_surface', 'nearby_context'],
              },
            },
            required: [
              'target_object_name',
              'status',
              'answer',
              'confidence',
              'location_summary',
              'suggested_action',
              'why_i_think_this',
            ],
          },
        },
      });

      return JsonParser.extractAndParse(response.text || '{}');
    } catch (err: any) {
      console.error('[GeminiService] Grounded response generation failed:', err.message);

      const dateObj = new Date(latest.timestamp);
      const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return {
        target_object_name: parsedQuery.target_object || 'object',
        matched_object_id: latest.objectId,
        status: 'LAST_SEEN',
        answer: `Your ${parsedQuery.target_object || 'item'} was last seen on the ${latest.room} ${latest.surface} at ${timeStr}. Confidence: ${Math.round(latest.confidence * 100)}%.`,
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
          ai_estimated_surface: `${latest.room} ${latest.surface}`,
          nearby_context: latest.nearbyObjects.join(' + ') || 'None recorded',
        },
      };
    }
  }
}

export const geminiService = new GeminiService();
