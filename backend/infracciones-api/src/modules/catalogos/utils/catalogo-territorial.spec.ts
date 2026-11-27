import {
  CATALOGO_TERRITORIAL_OFICIAL,
  EQUIVALENCIAS_DELEGACION,
} from '../constants/catalogo-territorial.constants';
import {
  esDelegacionDeRegion,
  normalizeNombreTerritorial,
  resolveDelegacionTerritorial,
} from './catalogo-territorial';

describe('catalogo territorial oficial', () => {
  const delegaciones = CATALOGO_TERRITORIAL_OFICIAL.flatMap((region) =>
    region.delegaciones.map((nombreDelegacion) => ({
      nombreRegion: region.nombreRegion,
      nombreDelegacion,
    })),
  );

  it('Q5.2a-01 contiene las diez regiones oficiales sin duplicados', () => {
    const regiones = CATALOGO_TERRITORIAL_OFICIAL.map(
      (region) => region.nombreRegion,
    );
    expect(regiones).toEqual([
      'PLAZA',
      'VALLES CENTRALES ZONA NORTE',
      'VALLES CENTRALES ZONA SUR',
      'ISTMO ZONA NORTE',
      'ISTMO ZONA SUR',
      'COSTA ZONA ORIENTE',
      'COSTA ZONA PONIENTE',
      'CAÑADA',
      'MIXTECA',
      'CUENCA',
    ]);
    expect(new Set(regiones.map(normalizeNombreTerritorial)).size).toBe(10);
  });

  it('Q5.2a-02 contiene las 46 delegaciones con la distribucion autorizada', () => {
    expect(delegaciones).toHaveLength(46);
    expect(CATALOGO_TERRITORIAL_OFICIAL).toEqual([
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
    ]);
  });

  it('Q5.2a-03 CENTRO pertenece exclusivamente a PLAZA', () => {
    expect(
      delegaciones.filter(
        (delegacion) => delegacion.nombreDelegacion === 'CENTRO',
      ),
    ).toEqual([{ nombreRegion: 'PLAZA', nombreDelegacion: 'CENTRO' }]);
    expect(resolveDelegacionTerritorial('CENTRO')).toEqual({
      nombreRegion: 'PLAZA',
      nombreDelegacion: 'CENTRO',
    });
  });

  it('Q5.2a-04 resuelve solo la equivalencia autorizada EL RETIRO', () => {
    expect(EQUIVALENCIAS_DELEGACION).toEqual([
      { origen: 'EL RETIRO', destino: 'RETIRO' },
    ]);
    expect(resolveDelegacionTerritorial('EL RETIRO')).toEqual({
      nombreRegion: 'VALLES CENTRALES ZONA NORTE',
      nombreDelegacion: 'RETIRO',
    });
    expect(resolveDelegacionTerritorial('  el   retiro ')).toEqual(
      resolveDelegacionTerritorial('RETIRO'),
    );
  });

  it('Q5.2a-05 RETIRO pertenece a VALLES CENTRALES ZONA NORTE', () => {
    expect(resolveDelegacionTerritorial('RETIRO')).toEqual({
      nombreRegion: 'VALLES CENTRALES ZONA NORTE',
      nombreDelegacion: 'RETIRO',
    });
    expect(esDelegacionDeRegion('PLAZA', 'RETIRO')).toBe(false);
    expect(
      esDelegacionDeRegion('VALLES CENTRALES ZONA NORTE', 'EL RETIRO'),
    ).toBe(true);
  });

  it('Q5.2a-06 resuelve las 46 delegaciones sin colisiones normalizadas', () => {
    const claves = delegaciones.map((delegacion) =>
      normalizeNombreTerritorial(delegacion.nombreDelegacion),
    );
    expect(new Set(claves).size).toBe(46);
    for (const delegacion of delegaciones) {
      expect(resolveDelegacionTerritorial(delegacion.nombreDelegacion)).toEqual(
        delegacion,
      );
      expect(
        esDelegacionDeRegion(
          delegacion.nombreRegion,
          delegacion.nombreDelegacion,
        ),
      ).toBe(true);
    }
  });

  it.each([
    {
      entrada: '  Ixtlán   de Juárez ',
      nombreRegion: 'VALLES CENTRALES ZONA NORTE',
      nombreDelegacion: 'IXTLAN DE JUAREZ',
    },
    {
      entrada: 'tuxtepec',
      nombreRegion: 'CUENCA',
      nombreDelegacion: 'TUXTEPEC',
    },
    {
      entrada: 'Huajuapan',
      nombreRegion: 'MIXTECA',
      nombreDelegacion: 'HUAJUAPAN',
    },
    {
      entrada: 'Cuicatlán',
      nombreRegion: 'CAÑADA',
      nombreDelegacion: 'CUICATLAN',
    },
    {
      entrada: ' Río  Grande ',
      nombreRegion: 'COSTA ZONA PONIENTE',
      nombreDelegacion: 'RIO GRANDE',
    },
  ])('Q5.2a-07 normaliza $entrada y conserva nombres oficiales', ({
    entrada,
    nombreRegion,
    nombreDelegacion,
  }) => {
    expect(resolveDelegacionTerritorial(entrada)).toEqual({
      nombreRegion,
      nombreDelegacion,
    });
  });

  it.each(['', '   ', null, undefined, 'DESCONOCIDA', 'CENTRO CUENCA', '__proto__'])(
    'Q5.2a-08 no asigna delegacion para %s',
    (entrada) => {
      expect(resolveDelegacionTerritorial(entrada)).toBeNull();
    },
  );

  it.each([
    ['CUENCA', 'CENTRO'],
    ['PLAZA', 'EL RETIRO'],
    ['MIXTECA', 'TUXTEPEC'],
    ['DESCONOCIDA', 'CENTRO'],
    ['', 'CENTRO'],
    ['CUENCA', 'DESCONOCIDA'],
    ['CUENCA', ''],
  ])('Q5.2a-09 rechaza asociacion %s - %s', (region, delegacion) => {
    expect(esDelegacionDeRegion(region, delegacion)).toBe(false);
  });

  it('Q5.2a-09 acepta una region normalizada sin alterar su nombre oficial', () => {
    expect(esDelegacionDeRegion('  cañada ', 'Cuicatlán')).toBe(true);
    expect(resolveDelegacionTerritorial('CUICATLAN')?.nombreRegion).toBe(
      'CAÑADA',
    );
  });

  it('no expone referencias mutables al indice interno', () => {
    const first = resolveDelegacionTerritorial('CENTRO');
    const second = resolveDelegacionTerritorial('CENTRO');
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
  });
});
