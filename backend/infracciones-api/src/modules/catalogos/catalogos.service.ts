import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ClaseVehiculo } from './entities/clase-vehiculo.entity';
import { Delegacion } from './entities/delegacion.entity';
import { EstatusInfraccion } from './entities/estatus-infraccion.entity';
import { LineaVehiculo } from './entities/linea-vehiculo.entity';
import { MarcaVehiculo } from './entities/marca-vehiculo.entity';
import { Operativo } from './entities/operativo.entity';
import { Region } from './entities/region.entity';
import { Sexo } from './entities/sexo.entity';
import { Servicio } from './entities/servicio.entity';
import { TipoProcedimiento } from './entities/tipo-procedimiento.entity';
import { Motivo } from '../motivos/entities/motivo.entity';
import { Encierro } from '../encierros/entities/encierro.entity';
import { Rol } from '../roles/entities/rol.entity';
import { FindDelegacionesQueryDto } from './dto/find-delegaciones-query.dto';
import { FindLineasVehiculoQueryDto } from './dto/find-lineas-vehiculo-query.dto';

@Injectable()
export class CatalogosService {
  constructor(
    @InjectRepository(Region)
    private readonly regionesRepository: Repository<Region>,
    @InjectRepository(Delegacion)
    private readonly delegacionesRepository: Repository<Delegacion>,
    @InjectRepository(Sexo)
    private readonly sexosRepository: Repository<Sexo>,
    @InjectRepository(Servicio)
    private readonly serviciosRepository: Repository<Servicio>,
    @InjectRepository(ClaseVehiculo)
    private readonly clasesVehiculoRepository: Repository<ClaseVehiculo>,
    @InjectRepository(MarcaVehiculo)
    private readonly marcasVehiculoRepository: Repository<MarcaVehiculo>,
    @InjectRepository(LineaVehiculo)
    private readonly lineasVehiculoRepository: Repository<LineaVehiculo>,
    @InjectRepository(TipoProcedimiento)
    private readonly tiposProcedimientoRepository: Repository<TipoProcedimiento>,
    @InjectRepository(Operativo)
    private readonly operativosRepository: Repository<Operativo>,
    @InjectRepository(EstatusInfraccion)
    private readonly estatusInfraccionRepository: Repository<EstatusInfraccion>,
    @InjectRepository(Motivo)
    private readonly motivosRepository: Repository<Motivo>,
    @InjectRepository(Encierro)
    private readonly encierrosRepository: Repository<Encierro>,
    @InjectRepository(Rol)
    private readonly rolesRepository: Repository<Rol>,
  ) {}

  findRegiones(): Promise<Region[]> {
    return this.regionesRepository.find({
      order: {
        nombreRegion: 'ASC',
      },
    });
  }

  findDelegaciones(query?: FindDelegacionesQueryDto): Promise<Delegacion[]> {
    return this.delegacionesRepository.find({
      where: query?.idRegion
        ? {
            region: {
              idRegion: query.idRegion,
            },
          }
        : undefined,
      relations: {
        region: true,
      },
      order: {
        nombreDelegacion: 'ASC',
      },
    });
  }

  findSexos(): Promise<Sexo[]> {
    return this.sexosRepository.find({
      order: {
        nombreSexo: 'ASC',
      },
    });
  }

  findServicios(): Promise<Servicio[]> {
    return this.serviciosRepository.find({
      order: {
        nombreServicio: 'ASC',
      },
    });
  }

  findClasesVehiculo(): Promise<ClaseVehiculo[]> {
    return this.clasesVehiculoRepository.find({
      order: {
        nombreClaseVehiculo: 'ASC',
      },
    });
  }

  findMarcasVehiculo(): Promise<MarcaVehiculo[]> {
    return this.marcasVehiculoRepository.find({
      order: {
        nombreMarcaVehiculo: 'ASC',
      },
    });
  }

  findLineasVehiculo(
    query?: FindLineasVehiculoQueryDto,
  ): Promise<LineaVehiculo[]> {
    return this.lineasVehiculoRepository.find({
      where: query?.idMarcaVehiculo
        ? {
            marcaVehiculo: {
              idMarcaVehiculo: query.idMarcaVehiculo,
            },
          }
        : undefined,
      relations: {
        marcaVehiculo: true,
      },
      order: {
        nombreLineaVehiculo: 'ASC',
      },
    });
  }

  findTiposProcedimiento(): Promise<TipoProcedimiento[]> {
    return this.tiposProcedimientoRepository.find({
      order: {
        nombreTipoProcedimiento: 'ASC',
      },
    });
  }

  findOperativos(): Promise<Operativo[]> {
    return this.operativosRepository.find({
      order: {
        nombreOperativo: 'ASC',
      },
    });
  }

  findEstatusInfraccion(): Promise<EstatusInfraccion[]> {
    return this.estatusInfraccionRepository.find({
      order: {
        nombreEstatus: 'ASC',
      },
    });
  }

  findMotivos(): Promise<Motivo[]> {
    return this.motivosRepository.find({
      order: {
        nombreMotivo: 'ASC',
      },
    });
  }

  findEncierros(): Promise<Encierro[]> {
    return this.encierrosRepository.find({
      order: {
        nombreEncierro: 'ASC',
      },
    });
  }

  findRoles(): Promise<Array<Pick<Rol, 'idRol' | 'nombreRol'>>> {
    return this.rolesRepository
      .find({
        order: {
          nombreRol: 'ASC',
        },
      })
      .then((roles) =>
        roles.map((rol) => ({
          idRol: rol.idRol,
          nombreRol: rol.nombreRol,
        })),
      );
  }
}
