import { Vehicle, VehicleType, VehicleStatus } from './types';

export const INITIAL_VEHICLES: Vehicle[] = [
  {
    id: 'v1',
    callSign: 'FPT 42',
    type: VehicleType.ENGINE,
    status: VehicleStatus.AVAILABLE,
    mileage: 12500,
    location: 'Caserne Centre',
    lastService: '2024-10-15',
    crewCapacity: 6,
    imageUrl: 'https://images.unsplash.com/photo-1582560475093-ba66accbc424?auto=format&fit=crop&q=80&w=600',
    equipment: [
      { id: 'e1', name: 'Tuyau de refoulement 70mm', category: 'Tuyaux', location: 'Coffre Arrière', quantity: 4, lastChecked: '2024-11-01', condition: 'Bon' },
      { id: 'e2', name: 'ARI (Appareil Respiratoire)', category: 'EPI', location: 'Cabine', quantity: 6, lastChecked: '2024-11-05', condition: 'Bon' },
      { id: 'e4', name: 'Lance Multi-débit', category: 'Lances', location: 'Coffre Latéral Droit', quantity: 2, lastChecked: '2024-11-10', condition: 'Bon' },
    ],
    history: [
      { id: 'h1', date: '2024-10-15', timestamp: '08:30', performedBy: 'Système', type: 'maintenance', description: 'Inspection complète du moteur et vidange.' },
      { id: 'h2', date: '2024-11-01', timestamp: '09:00', performedBy: 'Système', type: 'status', description: 'Véhicule remis en service actif à la Caserne Centre.' }
    ]
  },
  {
    id: 'v2',
    callSign: 'EPA 17',
    type: VehicleType.LADDER,
    status: VehicleStatus.MAINTENANCE,
    mileage: 8900,
    location: 'Atelier Central',
    lastService: '2024-12-01',
    crewCapacity: 4,
    imageUrl: 'https://images.ladepeche.fr/api/v1/images/view/61bc0f25d286c2743d5f2106/large/image.jpg',
    equipment: [
      { id: 'e3', name: 'Tronçonneuse à disque', category: 'Outils', location: 'Coffre Bas', quantity: 1, lastChecked: '2024-11-20', condition: 'Moyen' },
    ],
    history: [
      { id: 'h3', date: '2024-12-01', timestamp: '10:15', performedBy: 'Système', type: 'status', description: 'Entré en atelier pour réparation de fuite hydraulique.' }
    ]
  },
  {
    id: 'v3',
    callSign: 'VSR 1',
    type: VehicleType.RESCUE,
    status: VehicleStatus.OUT_ON_CALL,
    mileage: 15400,
    location: 'Secteur Centre-Ville',
    lastService: '2024-09-20',
    crewCapacity: 4,
    imageUrl: 'https://images.unsplash.com/photo-1599059813005-11265ba4b4ce?auto=format&fit=crop&q=80&w=600',
    equipment: [],
    history: [
      { id: 'h4', date: '2024-12-28', timestamp: '14:45', performedBy: 'Système', type: 'status', description: 'Engagé sur accident de la circulation.' }
    ]
  }
];