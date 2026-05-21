export const NAF_LABELS: Record<string, string> = {
  "4511Z": "Concessionnaire automobile",
  "4519Z": "Autres véhicules",
  "4540Z": "Moto / nautisme",
  "6810Z": "Immobilier — marchands de biens",
  "6820A": "Location immobilière",
  "5510Z": "Hôtellerie",
  "5610A": "Restauration traditionnelle",
  "5610C": "Restauration rapide",
  "8230Z": "Événementiel",
  "9319Z": "Activités sportives",
  "7311Z": "Agence de publicité",
  "7312Z": "Régie publicitaire",
  "9311Z": "Gestion installations sportives",
  "9312Z": "Clubs sportifs",
}

export const NAF_SECTEUR: Record<string, string> = {
  "4511Z": "Automobile",
  "4519Z": "Automobile",
  "4540Z": "Sport & loisirs",
  "6810Z": "Immobilier",
  "6820A": "Immobilier",
  "5510Z": "Hôtellerie",
  "5610A": "Restauration",
  "5610C": "Restauration",
  "8230Z": "Événementiel",
  "9319Z": "Sport & loisirs",
  "7311Z": "Communication",
  "7312Z": "Communication",
  "9311Z": "Sport & loisirs",
  "9312Z": "Sport & loisirs",
}

export const ALL_SECTEURS = [...new Set(Object.values(NAF_SECTEUR))].sort()
