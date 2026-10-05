/**
 * Robust JSON extraction and validation helper
 */

export class JsonParser {
  public static extractAndParse<T = any>(rawText: string): T {
    if (!rawText || typeof rawText !== 'string') {
      throw new Error('Empty response received from model.');
    }

    // Strip markdown code fences if model enclosed in ```json ... ```
    let clean = rawText.trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Find JSON start and end indices
    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      clean = clean.substring(firstBrace, lastBrace + 1);
    }

    try {
      return JSON.parse(clean);
    } catch (err: any) {
      console.error('[JsonParser] JSON parse error:', err.message, '\nRaw was:', rawText);
      throw new Error(`Failed to parse model response as JSON: ${err.message}`);
    }
  }

  public static validateImageAnalysis(data: any): {
    object_name: string;
    category: string;
    visual_identity: {
      color: string;
      material: string;
      shape: string;
      distinctive_features: string[];
    };
    location: {
      room: string;
      surface: string;
    };
    nearby_objects: string[];
    scene_description: string;
    confidence: number;
    bounding_box?: {
      ymin: number;
      xmin: number;
      ymax: number;
      xmax: number;
    };
  } {
    if (!data || typeof data !== 'object') {
      throw new Error('Malformed object data structure.');
    }

    const object_name = (data.object_name || 'everyday object').trim().toLowerCase();
    const category = data.category || 'personal_item';

    const visual_identity = {
      color: data.visual_identity?.color || 'unspecified color',
      material: data.visual_identity?.material || 'unspecified material',
      shape: data.visual_identity?.shape || 'unspecified shape',
      distinctive_features: Array.isArray(data.visual_identity?.distinctive_features)
        ? data.visual_identity.distinctive_features
        : [],
    };

    const location = {
      room: data.location?.room || 'Unknown room',
      surface: data.location?.surface || 'Unknown surface',
    };

    const nearby_objects = Array.isArray(data.nearby_objects) ? data.nearby_objects : [];
    const scene_description = data.scene_description || `A ${object_name} was observed.`;
    const confidence = typeof data.confidence === 'number' ? Math.min(1, Math.max(0, data.confidence)) : 0.85;

    let bounding_box = undefined;
    if (data.bounding_box && typeof data.bounding_box.ymin === 'number') {
      bounding_box = {
        ymin: Math.min(1000, Math.max(0, Math.round(data.bounding_box.ymin))),
        xmin: Math.min(1000, Math.max(0, Math.round(data.bounding_box.xmin))),
        ymax: Math.min(1000, Math.max(0, Math.round(data.bounding_box.ymax))),
        xmax: Math.min(1000, Math.max(0, Math.round(data.bounding_box.xmax))),
      };
    }

    return {
      object_name,
      category,
      visual_identity,
      location,
      nearby_objects,
      scene_description,
      confidence,
      bounding_box,
    };
  }
}
