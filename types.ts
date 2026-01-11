
export enum VehicleStatus {
  AVAILABLE = 'Disponible',
  OUT_ON_CALL = 'En intervention',
  MAINTENANCE = 'Maintenance',
  OUT_OF_SERVICE = 'Hors service'
}

export enum VehicleType {
  ENGINE = 'Fourgon Pompe-Tonne (FPT)',
  LADDER = 'Échelle Pivotante (EPA)',
  TANKER = 'Citerne (CCGC)',
  RESCUE = 'Secours Routier (VSR)',
  COMMAND = 'Véhicule de Commandement (VLC)'
}

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  grade: string;
  assignment: string;
  email: string;
  avatarUrl: string;
}

export interface EquipmentDocument {
  id: string;
  name: string;
  url: string;
  type: 'pdf' | 'doc' | 'link';
}

export interface Equipment {
  id: string;
  name: string;
  category: string;
  location: string; // Emplacement physique (ex: Coffre 1, Tiroir Jaune, Toit)
  quantity: number;
  lastChecked: string;
  condition: 'Bon' | 'Moyen' | 'Mauvais' | 'À remplacer';
  notes?: string;
  anomaly?: string;
  anomalyTags?: string[];
  reportedBy?: string; // Nom du personnel ayant signalé l'anomalie
  thumbnailUrl?: string;
  manualUrl?: string;
  videoUrl?: string;
  documents?: EquipmentDocument[];
}

export interface HistoryEntry {
  id: string;
  date: string;
  timestamp: string;
  type: 'status' | 'maintenance' | 'note' | 'equipment';
  status?: 'success' | 'danger' | 'warning' | 'info'; // Pour le code couleur
  description: string;
  performedBy: string;
  equipmentId?: string;
}

export interface Vehicle {
  id: string;
  callSign: string;
  type: string;
  status: VehicleStatus;
  mileage: number;
  location: string;
  lastService: string;
  crewCapacity: number;
  equipment: Equipment[];
  history: HistoryEntry[];
  imageUrl: string;
}

export interface FleetStats {
  totalVehicles: number;
  available: number;
  maintenance: number;
  outOnCall: number;
}
