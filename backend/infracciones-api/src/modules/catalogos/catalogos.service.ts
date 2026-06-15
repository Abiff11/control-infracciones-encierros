import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Not, ObjectLiteral, Repository } from 'typeorm';

import { CreateClaseVehiculoDto } from './dto/create-clase-vehiculo.dto';
import { CreateDelegacionDto } from './dto/create-delegacion.dto';
import { CreateEncierroDto } from './dto/create-encierro.dto';
import { CreateEstatusInfraccionDto } from './dto/create-estatus-infraccion.dto';
import { CreateLineaVehiculoDto } from './dto/create-linea-vehiculo.dto';
import { CreateMarcaVehiculoDto } from './dto/create-marca-vehiculo.dto';
import { CreateMotivoDto } from './dto/create-motivo.dto';
import { CreateOperativoDto } from './dto/create-operativo.dto';
import { CreateRegionDto } from './dto/create-region.dto';
import { CreateServicioDto } from './dto/create-servicio.dto';
import { CreateSexoDto } from './dto/create-sexo.dto';
import { CreateTipoProcedimientoDto } from './dto/create-tipo-procedimiento.dto';
import { FindDelegacionesQueryDto } from './dto/find-delegaciones-query.dto';
import { FindLineasVehiculoQueryDto } from './dto/find-lineas-vehiculo-query.dto';
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
import { Encierro } from '../encierros/entities/encierro.entity';
import { Motivo } from '../motivos/entities/motivo.entity';
import { Rol } from '../roles/entities/rol.entity';

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

  async createRegion(dto: CreateRegionDto): Promise<Region> {
    const nombreRegion = dto.nombreRegion.trim();
    await this.throwIfExists(
      this.regionesRepository,
      { nombreRegion },
      'Region',
    );

    return this.regionesRepository.save(
      this.regionesRepository.create({ nombreRegion }),
    );
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

  async createDelegacion(dto: CreateDelegacionDto): Promise<Delegacion> {
    const region = await this.findRegionByIdOrFail(dto.idRegion);
    const nombreDelegacion = dto.nombreDelegacion.trim();

    await this.throwIfExists(
      this.delegacionesRepository,
      {
        region: {
          idRegion: region.idRegion,
        },
        nombreDelegacion,
      },
      'Delegacion',
    );

    return this.delegacionesRepository.save(
      this.delegacionesRepository.create({
        region,
        nombreDelegacion,
      }),
    );
  }

  findSexos(): Promise<Sexo[]> {
    return this.sexosRepository.find({
      order: {
        nombreSexo: 'ASC',
      },
    });
  }

  async createSexo(dto: CreateSexoDto): Promise<Sexo> {
    const nombreSexo = dto.claveSexo.trim();
    await this.throwIfExists(this.sexosRepository, { nombreSexo }, 'Sexo');

    return this.sexosRepository.save(
      this.sexosRepository.create({ nombreSexo }),
    );
  }

  findServicios(): Promise<Servicio[]> {
    return this.serviciosRepository.find({
      order: {
        nombreServicio: 'ASC',
      },
    });
  }

  async createServicio(dto: CreateServicioDto): Promise<Servicio> {
    const nombreServicio = dto.nombreServicio.trim();
    await this.throwIfExists(
      this.serviciosRepository,
      { nombreServicio },
      'Servicio',
    );

    return this.serviciosRepository.save(
      this.serviciosRepository.create({ nombreServicio }),
    );
  }

  findClasesVehiculo(): Promise<ClaseVehiculo[]> {
    return this.clasesVehiculoRepository.find({
      order: {
        nombreClaseVehiculo: 'ASC',
      },
    });
  }

  async createClaseVehiculo(
    dto: CreateClaseVehiculoDto,
  ): Promise<ClaseVehiculo> {
    const nombreClaseVehiculo = dto.nombreClase.trim();
    await this.throwIfExists(
      this.clasesVehiculoRepository,
      { nombreClaseVehiculo },
      'Clase vehiculo',
    );

    return this.clasesVehiculoRepository.save(
      this.clasesVehiculoRepository.create({ nombreClaseVehiculo }),
    );
  }

  findMarcasVehiculo(): Promise<MarcaVehiculo[]> {
    return this.marcasVehiculoRepository.find({
      order: {
        nombreMarcaVehiculo: 'ASC',
      },
    });
  }

  async createMarcaVehiculo(
    dto: CreateMarcaVehiculoDto,
  ): Promise<MarcaVehiculo> {
    const nombreMarcaVehiculo = dto.nombreMarca.trim();
    await this.throwIfExists(
      this.marcasVehiculoRepository,
      { nombreMarcaVehiculo },
      'Marca vehiculo',
    );

    return this.marcasVehiculoRepository.save(
      this.marcasVehiculoRepository.create({ nombreMarcaVehiculo }),
    );
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

  async createLineaVehiculo(
    dto: CreateLineaVehiculoDto,
  ): Promise<LineaVehiculo> {
    const marcaVehiculo = await this.findMarcaVehiculoByIdOrFail(
      dto.idMarcaVehiculo,
    );
    const nombreLineaVehiculo = dto.nombreLinea.trim();

    await this.throwIfExists(
      this.lineasVehiculoRepository,
      {
        marcaVehiculo: {
          idMarcaVehiculo: marcaVehiculo.idMarcaVehiculo,
        },
        nombreLineaVehiculo,
      },
      'Linea vehiculo',
    );

    return this.lineasVehiculoRepository.save(
      this.lineasVehiculoRepository.create({
        marcaVehiculo,
        nombreLineaVehiculo,
      }),
    );
  }

  findTiposProcedimiento(): Promise<TipoProcedimiento[]> {
    return this.tiposProcedimientoRepository.find({
      order: {
        nombreTipoProcedimiento: 'ASC',
      },
    });
  }

  async createTipoProcedimiento(
    dto: CreateTipoProcedimientoDto,
  ): Promise<TipoProcedimiento> {
    const nombreTipoProcedimiento = dto.procedimiento.trim();
    await this.throwIfExists(
      this.tiposProcedimientoRepository,
      { nombreTipoProcedimiento },
      'Tipo procedimiento',
    );

    return this.tiposProcedimientoRepository.save(
      this.tiposProcedimientoRepository.create({ nombreTipoProcedimiento }),
    );
  }

  findOperativos(): Promise<Operativo[]> {
    return this.operativosRepository.find({
      order: {
        nombreOperativo: 'ASC',
      },
    });
  }

  async createOperativo(dto: CreateOperativoDto): Promise<Operativo> {
    const nombreOperativo = dto.nombreOperativo.trim();
    await this.throwIfExists(
      this.operativosRepository,
      { nombreOperativo },
      'Operativo',
    );

    return this.operativosRepository.save(
      this.operativosRepository.create({ nombreOperativo }),
    );
  }

  findEstatusInfraccion(): Promise<EstatusInfraccion[]> {
    return this.estatusInfraccionRepository.find({
      order: {
        nombreEstatus: 'ASC',
      },
    });
  }

  async createEstatusInfraccion(
    dto: CreateEstatusInfraccionDto,
  ): Promise<EstatusInfraccion> {
    const nombreEstatus = dto.nombreEstatus.trim();
    await this.throwIfExists(
      this.estatusInfraccionRepository,
      { nombreEstatus },
      'Estatus infraccion',
    );

    return this.estatusInfraccionRepository.save(
      this.estatusInfraccionRepository.create({ nombreEstatus }),
    );
  }

  findMotivos(): Promise<Motivo[]> {
    return this.motivosRepository.find({
      order: {
        nombreMotivo: 'ASC',
      },
    });
  }

  async createMotivo(dto: CreateMotivoDto): Promise<Motivo> {
    const nombreMotivo = dto.claveMotivo.trim();
    const descripcionMotivo = dto.descripcionMotivo?.trim() || nombreMotivo;
    await this.throwIfExists(
      this.motivosRepository,
      { nombreMotivo },
      'Motivo',
    );

    return this.motivosRepository.save(
      this.motivosRepository.create({
        nombreMotivo,
        descripcionMotivo,
      }),
    );
  }

  findEncierros(): Promise<Encierro[]> {
    return this.encierrosRepository.find({
      order: {
        nombreEncierro: 'ASC',
      },
    });
  }

  async createEncierro(dto: CreateEncierroDto): Promise<Encierro> {
    const nombreEncierro = dto.nombreEncierro.trim();
    await this.throwIfExists(
      this.encierrosRepository,
      { nombreEncierro },
      'Encierro',
    );

    return this.encierrosRepository.save(
      this.encierrosRepository.create({ nombreEncierro }),
    );
  }

  async updateRegion(idRegion: number, dto: CreateRegionDto): Promise<Region> {
    const nombreRegion = dto.nombreRegion.trim();
    await this.throwIfExists(
      this.regionesRepository,
      {
        idRegion: Not(idRegion),
        nombreRegion,
      },
      'Region',
    );

    const region = await this.findRegionByIdOrFail(idRegion);
    region.nombreRegion = nombreRegion;

    return this.regionesRepository.save(region);
  }

  async updateDelegacion(
    idDelegacion: number,
    dto: CreateDelegacionDto,
  ): Promise<Delegacion> {
    const region = await this.findRegionByIdOrFail(dto.idRegion);
    const nombreDelegacion = dto.nombreDelegacion.trim();

    await this.throwIfExists(
      this.delegacionesRepository,
      {
        idDelegacion: Not(idDelegacion),
        region: {
          idRegion: region.idRegion,
        },
        nombreDelegacion,
      },
      'Delegacion',
    );

    const delegacion = await this.findEntityByIdOrFail(
      this.delegacionesRepository,
      { idDelegacion },
      'Delegacion',
    );

    delegacion.region = region;
    delegacion.nombreDelegacion = nombreDelegacion;

    return this.delegacionesRepository.save(delegacion);
  }

  async updateSexo(idSexo: number, dto: CreateSexoDto): Promise<Sexo> {
    const nombreSexo = dto.claveSexo.trim();
    await this.throwIfExists(
      this.sexosRepository,
      {
        idSexo: Not(idSexo),
        nombreSexo,
      },
      'Sexo',
    );

    const sexo = await this.findEntityByIdOrFail(
      this.sexosRepository,
      { idSexo },
      'Sexo',
    );

    sexo.nombreSexo = nombreSexo;
    return this.sexosRepository.save(sexo);
  }

  async updateServicio(
    idServicio: number,
    dto: CreateServicioDto,
  ): Promise<Servicio> {
    const nombreServicio = dto.nombreServicio.trim();
    await this.throwIfExists(
      this.serviciosRepository,
      {
        idServicio: Not(idServicio),
        nombreServicio,
      },
      'Servicio',
    );

    const servicio = await this.findEntityByIdOrFail(
      this.serviciosRepository,
      { idServicio },
      'Servicio',
    );

    servicio.nombreServicio = nombreServicio;
    return this.serviciosRepository.save(servicio);
  }

  async updateClaseVehiculo(
    idClaseVehiculo: number,
    dto: CreateClaseVehiculoDto,
  ): Promise<ClaseVehiculo> {
    const nombreClaseVehiculo = dto.nombreClase.trim();
    await this.throwIfExists(
      this.clasesVehiculoRepository,
      {
        idClaseVehiculo: Not(idClaseVehiculo),
        nombreClaseVehiculo,
      },
      'Clase vehiculo',
    );

    const claseVehiculo = await this.findEntityByIdOrFail(
      this.clasesVehiculoRepository,
      { idClaseVehiculo },
      'Clase vehiculo',
    );

    claseVehiculo.nombreClaseVehiculo = nombreClaseVehiculo;
    return this.clasesVehiculoRepository.save(claseVehiculo);
  }

  async updateMarcaVehiculo(
    idMarcaVehiculo: number,
    dto: CreateMarcaVehiculoDto,
  ): Promise<MarcaVehiculo> {
    const nombreMarcaVehiculo = dto.nombreMarca.trim();
    await this.throwIfExists(
      this.marcasVehiculoRepository,
      {
        idMarcaVehiculo: Not(idMarcaVehiculo),
        nombreMarcaVehiculo,
      },
      'Marca vehiculo',
    );

    const marcaVehiculo = await this.findEntityByIdOrFail(
      this.marcasVehiculoRepository,
      { idMarcaVehiculo },
      'Marca vehiculo',
    );

    marcaVehiculo.nombreMarcaVehiculo = nombreMarcaVehiculo;
    return this.marcasVehiculoRepository.save(marcaVehiculo);
  }

  async updateLineaVehiculo(
    idLineaVehiculo: number,
    dto: CreateLineaVehiculoDto,
  ): Promise<LineaVehiculo> {
    const marcaVehiculo = await this.findMarcaVehiculoByIdOrFail(
      dto.idMarcaVehiculo,
    );
    const nombreLineaVehiculo = dto.nombreLinea.trim();

    await this.throwIfExists(
      this.lineasVehiculoRepository,
      {
        idLineaVehiculo: Not(idLineaVehiculo),
        marcaVehiculo: {
          idMarcaVehiculo: marcaVehiculo.idMarcaVehiculo,
        },
        nombreLineaVehiculo,
      },
      'Linea vehiculo',
    );

    const lineaVehiculo = await this.findEntityByIdOrFail(
      this.lineasVehiculoRepository,
      { idLineaVehiculo },
      'Linea vehiculo',
    );

    lineaVehiculo.marcaVehiculo = marcaVehiculo;
    lineaVehiculo.nombreLineaVehiculo = nombreLineaVehiculo;

    return this.lineasVehiculoRepository.save(lineaVehiculo);
  }

  async updateTipoProcedimiento(
    idTipoProcedimiento: number,
    dto: CreateTipoProcedimientoDto,
  ): Promise<TipoProcedimiento> {
    const nombreTipoProcedimiento = dto.procedimiento.trim();
    await this.throwIfExists(
      this.tiposProcedimientoRepository,
      {
        idTipoProcedimiento: Not(idTipoProcedimiento),
        nombreTipoProcedimiento,
      },
      'Tipo procedimiento',
    );

    const tipoProcedimiento = await this.findEntityByIdOrFail(
      this.tiposProcedimientoRepository,
      { idTipoProcedimiento },
      'Tipo procedimiento',
    );

    tipoProcedimiento.nombreTipoProcedimiento = nombreTipoProcedimiento;
    return this.tiposProcedimientoRepository.save(tipoProcedimiento);
  }

  async updateOperativo(
    idOperativo: number,
    dto: CreateOperativoDto,
  ): Promise<Operativo> {
    const nombreOperativo = dto.nombreOperativo.trim();
    await this.throwIfExists(
      this.operativosRepository,
      {
        idOperativo: Not(idOperativo),
        nombreOperativo,
      },
      'Operativo',
    );

    const operativo = await this.findEntityByIdOrFail(
      this.operativosRepository,
      { idOperativo },
      'Operativo',
    );

    operativo.nombreOperativo = nombreOperativo;
    return this.operativosRepository.save(operativo);
  }

  async updateEstatusInfraccion(
    idEstatusInfraccion: number,
    dto: CreateEstatusInfraccionDto,
  ): Promise<EstatusInfraccion> {
    const nombreEstatus = dto.nombreEstatus.trim();
    await this.throwIfExists(
      this.estatusInfraccionRepository,
      {
        idEstatusInfraccion: Not(idEstatusInfraccion),
        nombreEstatus,
      },
      'Estatus infraccion',
    );

    const estatusInfraccion = await this.findEntityByIdOrFail(
      this.estatusInfraccionRepository,
      { idEstatusInfraccion },
      'Estatus infraccion',
    );

    estatusInfraccion.nombreEstatus = nombreEstatus;
    return this.estatusInfraccionRepository.save(estatusInfraccion);
  }

  async updateMotivo(idMotivo: number, dto: CreateMotivoDto): Promise<Motivo> {
    const nombreMotivo = dto.claveMotivo.trim();
    const descripcionMotivo = dto.descripcionMotivo?.trim() || nombreMotivo;

    await this.throwIfExists(
      this.motivosRepository,
      {
        idMotivo: Not(idMotivo),
        nombreMotivo,
      },
      'Motivo',
    );

    const motivo = await this.findEntityByIdOrFail(
      this.motivosRepository,
      { idMotivo },
      'Motivo',
    );

    motivo.nombreMotivo = nombreMotivo;
    motivo.descripcionMotivo = descripcionMotivo;

    return this.motivosRepository.save(motivo);
  }

  async updateEncierro(
    idEncierro: number,
    dto: CreateEncierroDto,
  ): Promise<Encierro> {
    const nombreEncierro = dto.nombreEncierro.trim();
    await this.throwIfExists(
      this.encierrosRepository,
      {
        idEncierro: Not(idEncierro),
        nombreEncierro,
      },
      'Encierro',
    );

    const encierro = await this.findEntityByIdOrFail(
      this.encierrosRepository,
      { idEncierro },
      'Encierro',
    );

    encierro.nombreEncierro = nombreEncierro;
    return this.encierrosRepository.save(encierro);
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

  private async throwIfExists<T extends ObjectLiteral>(
    repository: Repository<T>,
    where: FindOptionsWhere<T>,
    label: string,
  ): Promise<void> {
    const existing = await repository.findOne({ where });

    if (existing) {
      throw new ConflictException(`${label} ya existe`);
    }
  }

  private async findRegionByIdOrFail(idRegion: number): Promise<Region> {
    return this.findEntityByIdOrFail(
      this.regionesRepository,
      { idRegion },
      'Region',
    );
  }

  private async findMarcaVehiculoByIdOrFail(
    idMarcaVehiculo: number,
  ): Promise<MarcaVehiculo> {
    return this.findEntityByIdOrFail(
      this.marcasVehiculoRepository,
      { idMarcaVehiculo },
      'Marca vehiculo',
    );
  }

  private async findEntityByIdOrFail<T extends ObjectLiteral>(
    repository: Repository<T>,
    where: FindOptionsWhere<T>,
    label: string,
  ): Promise<T> {
    const entity = await repository.findOne({ where });

    if (!entity) {
      throw new NotFoundException(`${label} no encontrado`);
    }

    return entity;
  }
}
