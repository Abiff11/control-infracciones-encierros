import 'dotenv/config';

import {
  type DeepPartial,
  type FindOptionsWhere,
  type ObjectLiteral,
  type Repository,
} from 'typeorm';

import dataSource from '../data-source';
import { ClaseVehiculo } from '../../modules/catalogos/entities/clase-vehiculo.entity';
import { Delegacion } from '../../modules/catalogos/entities/delegacion.entity';
import { EstatusInfraccion } from '../../modules/catalogos/entities/estatus-infraccion.entity';
import { LineaVehiculo } from '../../modules/catalogos/entities/linea-vehiculo.entity';
import { MarcaVehiculo } from '../../modules/catalogos/entities/marca-vehiculo.entity';
import { Operativo } from '../../modules/catalogos/entities/operativo.entity';
import { Region } from '../../modules/catalogos/entities/region.entity';
import { Servicio } from '../../modules/catalogos/entities/servicio.entity';
import { Sexo } from '../../modules/catalogos/entities/sexo.entity';
import { TipoProcedimiento } from '../../modules/catalogos/entities/tipo-procedimiento.entity';
import { Encierro } from '../../modules/encierros/entities/encierro.entity';
import { Motivo } from '../../modules/motivos/entities/motivo.entity';
import { Rol } from '../../modules/roles/entities/rol.entity';

interface SeedSummary {
  created: number;
  existing: number;
  processed: number;
}

interface MotivoSeed {
  clave: string;
  descripcion: string;
}

const PLAZAS_ORIGEN_CONTROL_PERSONAL = [
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
] as const;

const ROLES_SEED = ['ADMIN', 'OPERADOR', 'CONSULTA'] as const;

const ESTATUS_INFRACCION_SEED = [
  'CAPTURADA',
  'PAGADA',
  'LIBERACION_GENERADA',
  'VEHICULO_ENTREGADO',
] as const;

const SEXOS_SEED = ['MASCULINO', 'FEMENINO', 'SE IGNORA'] as const;

const SERVICIOS_SEED = ['PARTICULAR', 'PUBLICO', 'CARGA'] as const;

const CLASES_VEHICULO_SEED = [
  'AUTOMOVIL',
  'CAMIONETA',
  'MOTOCICLETA',
  'CAMION',
  'TAXI',
] as const;

const MARCAS_VEHICULO_SEED = [
  'NISSAN',
  'VOLKSWAGEN',
  'TOYOTA',
  'CHEVROLET',
  'FORD',
  'HONDA',
  'ITALIKA',
] as const;

const LINEAS_VEHICULO_SEED = [
  { marca: 'NISSAN', linea: 'TSURU' },
  { marca: 'NISSAN', linea: 'VERSA' },
  { marca: 'VOLKSWAGEN', linea: 'JETTA' },
  { marca: 'TOYOTA', linea: 'HILUX' },
  { marca: 'CHEVROLET', linea: 'AVEO' },
  { marca: 'FORD', linea: 'FIESTA' },
  { marca: 'HONDA', linea: 'CIVIC' },
  { marca: 'ITALIKA', linea: 'FT150' },
] as const;

const TIPOS_PROCEDIMIENTO_SEED = [
  'INFRACCION',
  'RETENCION',
  'LIBERACION',
] as const;

const ENCIERROS_SEED = ['ENCIERRO MUNICIPAL', 'ENCIERRO OFICIAL'] as const;

const OPERATIVOS_SEED = ['OPERATIVO GENERAL'] as const;

const MOTIVOS_OFICIALES_SEED: MotivoSeed[] = [
  { clave: 'A', descripcion: 'FALTA DE PLACAS' },
  { clave: 'B', descripcion: 'FALTA DE LICENCIA' },
  { clave: 'C', descripcion: 'FALTA DE TARJETA DE CIRCULACION' },
  { clave: 'D', descripcion: 'FALTA DE ENGOMADO' },
  { clave: 'E', descripcion: 'PLACAS EXTEMPORANEAS' },
  { clave: 'F', descripcion: 'PERMISO VENCIDO' },
  { clave: 'G', descripcion: 'CONTAR CON ADITAMENTOS' },
  { clave: 'H', descripcion: 'FALTA DE REVISTA' },
  { clave: 'I', descripcion: 'FALTA DE RAZON SOCIAL' },
  { clave: 'J', descripcion: 'OSTENTAR COLORES DE SERVICIO PUBLICO' },
  {
    clave: 'K',
    descripcion: 'NO CONTAR CON COLORES OFICIALES PARA EL SERV. PUB.',
  },
  { clave: 'L', descripcion: 'HACER SERVICIO FUERA DE RUTA' },
  { clave: 'M', descripcion: 'CIRCULAR CON LA CAJUELA ABIERTA' },
  { clave: 'N', descripcion: 'CIRCULAR EN SENTIDO CONTRARIO' },
  { clave: 'Ñ', descripcion: 'PASARSE EL ALTO DEL SEMAFORO' },
  { clave: 'O', descripcion: 'ESTACIONARSE EN ENTRADA/ SALIDA DE GARAGE' },
  { clave: 'P', descripcion: 'FALTA DE CORTESIA Y ASEO' },
  { clave: 'Q', descripcion: 'NO GUARDAR DISTANCIA REGLAMENTARIA' },
  { clave: 'R', descripcion: 'POR TRAER PERSONAS EN LUGAR DE LA CARGA' },
  { clave: 'S', descripcion: 'FALTA DE PRECAUCION PROVOCANDO CHOQUE' },
  { clave: 'T', descripcion: 'ESTACIONARSE EN LUGAR PROHIBIDO' },
  { clave: 'U', descripcion: 'DAR VUELTA EN U EN LUGAR PROHIBIDO' },
  { clave: 'V', descripcion: 'ASCENSO DE PASAJE EN LUGAR NO AUTORIZADO' },
  { clave: 'W', descripcion: 'HACER TERMINAL Y TIEMPO INECESARIO' },
  { clave: 'X', descripcion: 'EXCESO DE HUMO' },
  { clave: 'Y', descripcion: 'TRAER PERSONAS EN EL ESTRIBO' },
  { clave: 'Z', descripcion: 'MAL COMPORTAMIENTO DEL CONDUCTOR' },
  { clave: 'A1', descripcion: 'EXCESO DE PASAJE' },
  { clave: 'A2', descripcion: 'FALTA DE CASCO' },
  { clave: 'A3', descripcion: 'FALTA DE POLIZA DE SEGURO' },
  { clave: 'A4', descripcion: 'MANEJAR EN ESTADO DE EBRIEDAD' },
  { clave: 'A5', descripcion: 'REALIZAR ARRASTRE SIN AUTORIZACION' },
  { clave: 'A6', descripcion: 'ESTACIONARSE EN SENTIDO CONTRARIO' },
  { clave: 'A7', descripcion: 'EXCESO DE VELOCIDAD' },
  { clave: 'A8', descripcion: 'DOBLE FILA' },
  { clave: 'A9', descripcion: 'CIRCULAR CON LAS PUERTAS ABIERTAS' },
  { clave: 'A10', descripcion: 'ABANDONO EN VIA PUBLICA' },
  { clave: 'A11', descripcion: 'REALIZAR MANIOBRA EN LUGAR PROHIBIDO' },
  { clave: 'A12', descripcion: 'FALTA DE VERIFICACION' },
  { clave: 'A13', descripcion: 'CAMBIO DE PROPIETARIO' },
  { clave: 'A14', descripcion: 'PARABRISAS ESTRELLADO' },
  { clave: 'A15', descripcion: 'FALTA DE UNA PLACA' },
  { clave: 'A16', descripcion: 'REALIZAR SERVICIO PUBLICO SIN AUTORIZACION' },
  { clave: 'A17', descripcion: 'TARJETON DE CARGA' },
  {
    clave: 'A18',
    descripcion: 'DARSE A LA FUGA DESPUES DE COMETER UNA INFRACCION',
  },
  { clave: 'A19', descripcion: 'HACER SERVICIO DE GRUA SIN AUTORIZACION' },
  { clave: 'A20', descripcion: 'HACER CASO OMISO AL AGENTE' },
  { clave: 'A21', descripcion: 'CAIDA DE PERSONA' },
  { clave: 'A22', descripcion: 'ALTERAR TARIFA SIN AUTORIZACION' },
  {
    clave: 'A23',
    descripcion:
      'MANEJAR LOS CONDUCTORES ESTANDO DISTRAIDOS O PLATICANDO, ABASTECER CON EL MOTOR EN MARCHA',
  },
  {
    clave: 'A24',
    descripcion: 'OSTENTAR RAZON SOCIAL Y CIRCULAR CON PERMISO PARTICULAR',
  },
  { clave: 'A25', descripcion: 'CIRCULAR SIN LUCES' },
  { clave: 'A26', descripcion: 'SEGURO VIAJERO VENCIDO' },
  { clave: 'A27', descripcion: 'HACER USO INDEBIDO DEL CLAXON' },
  { clave: 'A28', descripcion: 'CAMBIAR INTEMPESTIVAMENTE DE CARRIL' },
  { clave: 'A29', descripcion: 'PLACAS OCULTAS' },
  { clave: 'A30', descripcion: 'TRANSPORTAR CARGA O ANIMALES SIN AUT.' },
  { clave: 'A31', descripcion: 'OBSTRUIR EL PASO PEATONAL' },
  { clave: 'A32', descripcion: 'FALTA DE NUMERO ECONOMICO' },
  { clave: 'A33', descripcion: 'PORTAR DIADEMA Y COPETE' },
  { clave: 'A34', descripcion: 'VEHICULO EN MALAS CONDICIONES' },
  {
    clave: 'A35',
    descripcion: 'SALIR INTEMPESTIVAMENTE Y SIN PRECAUCION DEL ESTACIONAMIENTO',
  },
  { clave: 'A36', descripcion: 'OLVIDO DE LICENCIA' },
  { clave: 'A37', descripcion: 'LICENCIA VENCIDA' },
  {
    clave: 'A38',
    descripcion: 'VIAJAR MAS DE DOS PERSONAS MOTOCICLISTAS',
  },
  { clave: 'A39', descripcion: 'INFLUENCIA DE DROGAS ENERVANTES' },
  { clave: 'A40', descripcion: 'PORTANDO VIDRIOS POLARIZADOS' },
  {
    clave: 'A41',
    descripcion: 'EXCESO DE VOLUMEN DE CARGA PARA CAMIONES',
  },
  { clave: 'A42', descripcion: 'FALTA DE CROMATICA' },
  { clave: 'A43', descripcion: 'HABLAR POR CELULAR AL IR CONDUCIENDO' },
  { clave: 'A44', descripcion: 'NO PORTAR EL CINTURON DE SEGURIDAD' },
  { clave: 'A45', descripcion: 'FALTA DE ABANDERAMIENTO' },
  { clave: 'A46', descripcion: 'CIRCULAR EN ZONA DE CICLOVIA' },
  {
    clave: 'A47',
    descripcion:
      'ESTACIONARSE EN CAJON PARA PERSONAS CON CAPACIDADES DIFERENTES',
  },
  { clave: 'A48', descripcion: 'ESTACIONARSE SOBRE LA BANQUETA' },
];

function normalizeValue(value: string): string {
  return value
    .trim()
    .replace(/CAÃ‘ADA/g, 'CAÑADA')
    .replace(/Ã‘/g, 'Ñ')
    .toUpperCase();
}

function createSummary(): SeedSummary {
  return {
    created: 0,
    existing: 0,
    processed: 0,
  };
}

async function seedCatalogEntry<T extends ObjectLiteral>(
  repository: Repository<T>,
  where: FindOptionsWhere<T>,
  entityData: DeepPartial<T>,
  label: string,
  summary: SeedSummary,
): Promise<T> {
  summary.processed += 1;

  const existing = await repository.findOne({ where });

  if (existing) {
    summary.existing += 1;
    console.log(`${label} existente: ${JSON.stringify(where)}`);
    return existing;
  }

  const created = await repository.save(repository.create(entityData));
  summary.created += 1;
  console.log(`${label} creado: ${JSON.stringify(where)}`);
  return created;
}

async function seedInitialCatalogs(): Promise<void> {
  await dataSource.initialize();

  const summary = createSummary();

  try {
    const rolesRepository = dataSource.getRepository(Rol);
    const estatusRepository = dataSource.getRepository(EstatusInfraccion);
    const sexosRepository = dataSource.getRepository(Sexo);
    const regionesRepository = dataSource.getRepository(Region);
    const delegacionesRepository = dataSource.getRepository(Delegacion);
    const serviciosRepository = dataSource.getRepository(Servicio);
    const clasesVehiculoRepository = dataSource.getRepository(ClaseVehiculo);
    const marcasVehiculoRepository = dataSource.getRepository(MarcaVehiculo);
    const lineasVehiculoRepository = dataSource.getRepository(LineaVehiculo);
    const tiposProcedimientoRepository =
      dataSource.getRepository(TipoProcedimiento);
    const encierrosRepository = dataSource.getRepository(Encierro);
    const operativosRepository = dataSource.getRepository(Operativo);
    const motivosRepository = dataSource.getRepository(Motivo);

    for (const nombreRol of ROLES_SEED) {
      const normalizedNombreRol = normalizeValue(nombreRol);

      await seedCatalogEntry(
        rolesRepository,
        { nombreRol: normalizedNombreRol },
        { nombreRol: normalizedNombreRol },
        'Rol',
        summary,
      );
    }

    for (const nombreEstatus of ESTATUS_INFRACCION_SEED) {
      const normalizedNombreEstatus = normalizeValue(nombreEstatus);

      await seedCatalogEntry(
        estatusRepository,
        {
          nombreEstatus: normalizedNombreEstatus,
        },
        {
          nombreEstatus: normalizedNombreEstatus,
        },
        'Estatus infraccion',
        summary,
      );
    }

    for (const nombreSexo of SEXOS_SEED) {
      const normalizedNombreSexo = normalizeValue(nombreSexo);

      await seedCatalogEntry(
        sexosRepository,
        { nombreSexo: normalizedNombreSexo },
        { nombreSexo: normalizedNombreSexo },
        'Sexo',
        summary,
      );
    }

    const regionesOrigen = [...new Set(PLAZAS_ORIGEN_CONTROL_PERSONAL)].map(
      normalizeValue,
    );
    const regionesSeed =
      regionesOrigen.length > 0 ? regionesOrigen : ['OAXACA'];

    for (const nombreRegion of regionesSeed) {
      const region = await seedCatalogEntry(
        regionesRepository,
        { nombreRegion },
        { nombreRegion },
        'Region',
        summary,
      );

      await seedCatalogEntry(
        delegacionesRepository,
        {
          region: { idRegion: region.idRegion } as FindOptionsWhere<Region>,
          nombreDelegacion: 'CENTRO',
        },
        {
          region,
          nombreDelegacion: 'CENTRO',
        },
        'Delegacion',
        summary,
      );
    }

    for (const nombreServicio of SERVICIOS_SEED) {
      const normalizedNombreServicio = normalizeValue(nombreServicio);

      await seedCatalogEntry(
        serviciosRepository,
        {
          nombreServicio: normalizedNombreServicio,
        },
        {
          nombreServicio: normalizedNombreServicio,
        },
        'Servicio',
        summary,
      );
    }

    for (const nombreClaseVehiculo of CLASES_VEHICULO_SEED) {
      const normalizedNombreClaseVehiculo = normalizeValue(nombreClaseVehiculo);

      await seedCatalogEntry(
        clasesVehiculoRepository,
        {
          nombreClaseVehiculo: normalizedNombreClaseVehiculo,
        },
        {
          nombreClaseVehiculo: normalizedNombreClaseVehiculo,
        },
        'Clase vehiculo',
        summary,
      );
    }

    for (const nombreMarcaVehiculo of MARCAS_VEHICULO_SEED) {
      const normalizedNombreMarcaVehiculo = normalizeValue(nombreMarcaVehiculo);

      await seedCatalogEntry(
        marcasVehiculoRepository,
        {
          nombreMarcaVehiculo: normalizedNombreMarcaVehiculo,
        },
        {
          nombreMarcaVehiculo: normalizedNombreMarcaVehiculo,
        },
        'Marca vehiculo',
        summary,
      );
    }

    for (const lineaSeed of LINEAS_VEHICULO_SEED) {
      const marcaVehiculo = await marcasVehiculoRepository.findOneOrFail({
        where: {
          nombreMarcaVehiculo: normalizeValue(lineaSeed.marca),
        },
      });
      const nombreLineaVehiculo = normalizeValue(lineaSeed.linea);

      await seedCatalogEntry(
        lineasVehiculoRepository,
        {
          marcaVehiculo: {
            idMarcaVehiculo: marcaVehiculo.idMarcaVehiculo,
          } as FindOptionsWhere<MarcaVehiculo>,
          nombreLineaVehiculo,
        },
        {
          marcaVehiculo,
          nombreLineaVehiculo,
        },
        'Linea vehiculo',
        summary,
      );
    }

    for (const nombreTipoProcedimiento of TIPOS_PROCEDIMIENTO_SEED) {
      const normalizedNombreTipoProcedimiento = normalizeValue(
        nombreTipoProcedimiento,
      );

      await seedCatalogEntry(
        tiposProcedimientoRepository,
        {
          nombreTipoProcedimiento: normalizedNombreTipoProcedimiento,
        },
        {
          nombreTipoProcedimiento: normalizedNombreTipoProcedimiento,
        },
        'Tipo procedimiento',
        summary,
      );
    }

    for (const nombreEncierro of ENCIERROS_SEED) {
      const normalizedNombreEncierro = normalizeValue(nombreEncierro);

      await seedCatalogEntry(
        encierrosRepository,
        {
          nombreEncierro: normalizedNombreEncierro,
        },
        {
          nombreEncierro: normalizedNombreEncierro,
        },
        'Encierro',
        summary,
      );
    }

    for (const nombreOperativo of OPERATIVOS_SEED) {
      const normalizedNombreOperativo = normalizeValue(nombreOperativo);

      await seedCatalogEntry(
        operativosRepository,
        {
          nombreOperativo: normalizedNombreOperativo,
        },
        {
          nombreOperativo: normalizedNombreOperativo,
        },
        'Operativo',
        summary,
      );
    }

    for (const motivoSeed of MOTIVOS_OFICIALES_SEED) {
      const claveMotivo = normalizeValue(motivoSeed.clave);
      const descripcionMotivo = normalizeValue(motivoSeed.descripcion);

      await seedCatalogEntry(
        motivosRepository,
        {
          nombreMotivo: claveMotivo,
        },
        {
          nombreMotivo: claveMotivo,
          descripcionMotivo,
        },
        'Motivo',
        summary,
      );
    }

    console.log('Seed initial catalogs summary:');
    console.log(`- creados: ${summary.created}`);
    console.log(`- existentes: ${summary.existing}`);
    console.log(`- total procesados: ${summary.processed}`);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

seedInitialCatalogs().catch((error: unknown) => {
  console.error('Error ejecutando seed initial de catalogos:', error);
  process.exitCode = 1;
});
