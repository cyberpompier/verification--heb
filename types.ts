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
  description: string;
  performedBy: string;
  equipmentId?: string;
}

export interface Vehicle {
  id: string;
  callSign: string;
  type: VehicleType;
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