import fs from 'fs';
import path from 'path';

export interface ObjectEntity {
  id: string;
  name: string;
  category: string;
  visualDescription: string;
  createdAt: string;
  lastSeenAt: string;
  distinctiveFeatures?: string[];
}

export interface ObservationEntity {
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

export interface RelationshipEntity {
  id: string;
  observationId: string;
  objectA: string;
  relationship: 'ON' | 'NEAR' | 'IN' | 'BESIDE';
  objectB: string;
  confidence: number;
}

export interface DatabaseSchema {
  objects: ObjectEntity[];
  observations: ObservationEntity[];
  relationships: RelationshipEntity[];
}

export class AppDatabase {
  private dbPath: string;
  private imagesDir: string;
  private data: DatabaseSchema = {
    objects: [],
    observations: [],
    relationships: [],
  };

  constructor() {
    const rootDataDir = path.resolve(process.cwd(), 'data');
    this.dbPath = path.join(rootDataDir, 'findback_room.json');
    this.imagesDir = path.join(rootDataDir, 'images');

    this.initStorage();
  }

  private initStorage() {
    const rootDataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(rootDataDir)) {
      fs.mkdirSync(rootDataDir, { recursive: true });
    }
    if (!fs.existsSync(this.imagesDir)) {
      fs.mkdirSync(this.imagesDir, { recursive: true });
    }

    if (fs.existsSync(this.dbPath)) {
      try {
        const raw = fs.readFileSync(this.dbPath, 'utf-8');
        this.data = JSON.parse(raw);
      } catch (err) {
        console.error('[Database] Failed to read database file, initializing fresh:', err);
        this.data = { objects: [], observations: [], relationships: [] };
        this.persist();
      }
    } else {
      // EMPTY by default - NO DUMMY DATA per strict requirement
      this.data = { objects: [], observations: [], relationships: [] };
      this.persist();
    }
  }

  public persist(): void {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Database] Failed to persist data to disk:', err);
      throw err;
    }
  }

  // Object DAO methods
  public getAllObjects(): ObjectEntity[] {
    return [...this.data.objects].sort(
      (a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime()
    );
  }

  public getObjectById(id: string): ObjectEntity | undefined {
    return this.data.objects.find((o) => o.id === id);
  }

  public findObjectByName(name: string): ObjectEntity | undefined {
    const lower = name.trim().toLowerCase();
    return this.data.objects.find((o) => o.name.toLowerCase() === lower);
  }

  public insertObject(obj: ObjectEntity): ObjectEntity {
    this.data.objects.unshift(obj);
    this.persist();
    return obj;
  }

  public updateObject(obj: ObjectEntity): ObjectEntity {
    const idx = this.data.objects.findIndex((o) => o.id === obj.id);
    if (idx !== -1) {
      this.data.objects[idx] = obj;
      this.persist();
    }
    return obj;
  }

  // Observation DAO methods
  public getAllObservations(): ObservationEntity[] {
    return [...this.data.observations].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  public getObservationsForObject(objectId: string): ObservationEntity[] {
    return this.data.observations
      .filter((obs) => obs.objectId === objectId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public getObservationById(id: string): ObservationEntity | undefined {
    return this.data.observations.find((o) => o.id === id);
  }

  public insertObservation(obs: ObservationEntity): ObservationEntity {
    this.data.observations.unshift(obs);
    this.persist();
    return obs;
  }

  // Relationship DAO methods
  public insertRelationship(rel: RelationshipEntity): RelationshipEntity {
    this.data.relationships.unshift(rel);
    this.persist();
    return rel;
  }

  public getRelationshipsForObservation(observationId: string): RelationshipEntity[] {
    return this.data.relationships.filter((r) => r.observationId === observationId);
  }

  // Real image file persistence
  public saveEvidenceImage(observationId: string, base64Data: string): string {
    const cleanBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    const fileName = `${observationId}.jpg`;
    const filePath = path.join(this.imagesDir, fileName);

    fs.writeFileSync(filePath, buffer);
    return `/api/images/${fileName}`;
  }

  public getImageFilePath(fileName: string): string | null {
    const safeName = path.basename(fileName);
    const fullPath = path.join(this.imagesDir, safeName);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
    return null;
  }

  // Real "Delete all memories" execution
  public deleteAllMemories(): { objectsDeleted: number; observationsDeleted: number; imagesDeleted: number } {
    const objectsDeleted = this.data.objects.length;
    const observationsDeleted = this.data.observations.length;

    // Delete image files physically
    let imagesDeleted = 0;
    try {
      if (fs.existsSync(this.imagesDir)) {
        const files = fs.readdirSync(this.imagesDir);
        for (const file of files) {
          const p = path.join(this.imagesDir, file);
          fs.unlinkSync(p);
          imagesDeleted++;
        }
      }
    } catch (err) {
      console.error('[Database] Error deleting images:', err);
    }

    this.data = {
      objects: [],
      observations: [],
      relationships: [],
    };
    this.persist();

    return { objectsDeleted, observationsDeleted, imagesDeleted };
  }
}

export const appDatabase = new AppDatabase();
