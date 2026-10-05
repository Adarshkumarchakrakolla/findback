import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { appDatabase } from './server/data/database/AppDatabase';
import { geminiService } from './server/ai/GeminiService';
import { memoryRepository } from './server/memory/MemoryRepository';
import { memoryReasoner } from './server/memory/MemoryReasoner';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '35mb' }));

/**
 * 1. REAL GEMINI CAMERA ANALYSIS ENDPOINT
 * Analyzes captured image and returns strict structured JSON
 */
app.post('/api/camera/analyze', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', userHint } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Image base64 data is required.' });
    }

    const analysis = await geminiService.analyzeImage(imageBase64, mimeType, userHint);
    return res.json(analysis);
  } catch (err: any) {
    console.error('[API /api/camera/analyze] Error:', err.message);
    return res.status(500).json({
      error: err.message || 'Failed to analyze image with Gemini.',
      canRetry: true,
      canSaveManually: true,
    });
  }
});

/**
 * 2. REAL PERSISTENT MEMORY SAVE
 * Saves real image to local disk and saves Object + Observation + Relationship entities to Room/SQLite database
 */
app.post('/api/memory/save', async (req, res) => {
  try {
    const {
      objectName,
      category,
      visualIdentity,
      location,
      nearbyObjects,
      sceneDescription,
      confidence,
      evidenceImageBase64,
      boundingBox,
      source,
      forcedObjectId,
    } = req.body;

    if (!objectName || !evidenceImageBase64) {
      return res.status(400).json({ error: 'objectName and evidenceImageBase64 are required.' });
    }

    const result = await memoryRepository.saveObservation({
      objectName,
      category: category || 'personal_item',
      visualIdentity: visualIdentity || {
        color: 'unspecified',
        material: 'unspecified',
        shape: 'unspecified',
        distinctive_features: [],
      },
      location: location || { room: 'Unknown room', surface: 'Unknown surface' },
      nearbyObjects: nearbyObjects || [],
      sceneDescription: sceneDescription || `${objectName} observed.`,
      confidence: typeof confidence === 'number' ? confidence : 0.85,
      evidenceImageBase64,
      boundingBox,
      source: source || 'AI + USER CONFIRMED',
      forcedObjectId,
    });

    return res.json({
      success: true,
      message: 'Memory saved',
      object: result.object,
      observation: result.observation,
      isNewObject: result.isNewObject,
    });
  } catch (err: any) {
    console.error('[API /api/memory/save] Error:', err.message);
    return res.status(500).json({ error: 'Failed to save memory: ' + err.message });
  }
});

/**
 * 3. REAL GROUNDED FIND QUERY
 * Natural language reasoning grounded STRICTLY in database records
 */
app.post('/api/memory/find', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required.' });
    }

    const result = await memoryReasoner.reasonAboutQuery(query);
    return res.json(result);
  } catch (err: any) {
    console.error('[API /api/memory/find] Error:', err.message);
    return res.status(500).json({ error: 'Failed to process query: ' + err.message });
  }
});

/**
 * 4. GET ALL OBJECTS
 */
app.get('/api/memory/objects', (_req, res) => {
  try {
    const objects = appDatabase.getAllObjects();
    const enriched = objects.map((obj) => {
      const observations = appDatabase.getObservationsForObject(obj.id);
      const latestObs = observations[0] || null;
      return {
        ...obj,
        latestObservation: latestObs,
        observationCount: observations.length,
      };
    });
    return res.json(enriched);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 5. GET OBJECT DETAILS WITH ALL OBSERVATIONS
 */
app.get('/api/memory/objects/:id', (req, res) => {
  try {
    const object = appDatabase.getObjectById(req.params.id);
    if (!object) {
      return res.status(404).json({ error: 'Object not found' });
    }
    const observations = appDatabase.getObservationsForObject(object.id);
    const stats = memoryRepository.calculateUsualLocation(object.id);

    return res.json({
      object,
      observations,
      stats,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 6. "WHERE DO I USUALLY KEEP IT?" REAL CALCULATION
 */
app.get('/api/memory/stats/:objectId', (req, res) => {
  try {
    const stats = memoryRepository.calculateUsualLocation(req.params.objectId);
    return res.json(stats);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 7. REAL "DELETE ALL MEMORIES"
 * Physically wipes all database records and deletes all saved image files
 */
app.delete('/api/memory/all', (_req, res) => {
  try {
    const summary = appDatabase.deleteAllMemories();
    return res.json({
      success: true,
      message: 'All memories and stored images have been deleted.',
      ...summary,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete memories: ' + err.message });
  }
});

/**
 * 8. REAL LOCAL IMAGE SERVING
 * Serves the actual captured evidence image from disk
 */
app.get('/api/images/:filename', (req, res) => {
  try {
    const filePath = appDatabase.getImageFilePath(req.params.filename);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Image not found' });
    }
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return fs.createReadStream(filePath).pipe(res);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 9. STATUS ENDPOINT
 */
app.get('/api/status', (_req, res) => {
  res.json({
    appName: 'FIND-BACK',
    status: 'online',
    geminiConfigured: geminiService.isConfigured(),
    objectsStored: appDatabase.getAllObjects().length,
    observationsStored: appDatabase.getAllObservations().length,
  });
});

// Vite middleware in dev or static files in production
const isDev = process.env.NODE_ENV !== 'production';

async function startServer() {
  if (isDev) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[FIND-BACK] Real Prototype running on http://0.0.0.0:${PORT}`);
    console.log(`[FIND-BACK] Gemini status: ${geminiService.isConfigured() ? 'CONFIGURED' : 'NEEDS_API_KEY'}`);
  });
}

startServer();
