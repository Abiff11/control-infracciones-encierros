export interface RegionTerritorial {
  readonly nombreRegion: string;
  readonly delegaciones: readonly string[];
}

// Distribucion operativa confirmada de la Policia Vial Estatal.
export const CATALOGO_TERRITORIAL_OFICIAL: readonly RegionTerritorial[] = [
  {
    nombreRegion: 'PLAZA',
    delegaciones: [
      'CENTRO',
    ],
  },
  {
    nombreRegion: 'VALLES CENTRALES ZONA NORTE',
    delegaciones: [
      'ETLA',
      'IXTLAN DE JUAREZ',
      'MITLA',
      'RETIRO',
      'TLACOLULA',
    ],
  },
  {
    nombreRegion: 'VALLES CENTRALES ZONA SUR',
    delegaciones: [
      'EJUTLA',
      'OCOTLAN',
      'MIAHUATLAN',
      'ZAACHILA',
      'ZIMATLAN',
      'SOLA DE VEGA',
    ],
  },
  {
    nombreRegion: 'ISTMO ZONA NORTE',
    delegaciones: [
      'GUICHICOVI',
      'MARIA LOMBARDO',
      'MATIAS',
      'TAPANATEPEC',
    ],
  },
  {
    nombreRegion: 'ISTMO ZONA SUR',
    delegaciones: [
      'IXTEPEC',
      'JUCHITAN',
      'SALINA CRUZ',
      'TEHUANTEPEC',
    ],
  },
  {
    nombreRegion: 'COSTA ZONA ORIENTE',
    delegaciones: [
      'HUATULCO',
      'NOPALA',
      'POCHUTLA',
      'PUERTO ESCONDIDO',
    ],
  },
  {
    nombreRegion: 'COSTA ZONA PONIENTE',
    delegaciones: [
      'CACAHUATEPEC',
      'JAMILTEPEC',
      'JUQUILA',
      'PINOTEPA',
      'RIO GRANDE',
    ],
  },
  {
    nombreRegion: 'CAÑADA',
    delegaciones: [
      'CUICATLAN',
      'HUAUTLA',
      'TEOTITLAN',
    ],
  },
  {
    nombreRegion: 'MIXTECA',
    delegaciones: [
      'HUAJUAPAN',
      'JUXTLAHUACA',
      'TEPOSCOLULA',
      'NOCHIXTLAN',
      'PUTLA',
      'TAMAZULAPAM',
      'TLAXIACO',
    ],
  },
  {
    nombreRegion: 'CUENCA',
    delegaciones: [
      'ACATLAN',
      'COSOLAPA',
      'JALAPA',
      'LOMA BONITA',
      'TEMASCAL',
      'TUXTEPEC',
      'VALLE NACIONAL',
    ],
  },
];

// Solo equivalencias expresamente confirmadas. No asignar nombres genericos.
export const EQUIVALENCIAS_DELEGACION: readonly {
  readonly origen: string;
  readonly destino: string;
}[] = [{ origen: 'EL RETIRO', destino: 'RETIRO' }];
