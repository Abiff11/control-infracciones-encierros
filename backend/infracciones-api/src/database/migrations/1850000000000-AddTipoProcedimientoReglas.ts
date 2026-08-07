import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableUnique,
} from 'typeorm';

const TABLE_TIPO_PROCEDIMIENTO = 'tipo_procedimiento';
const UNIQUE_CLAVE_CONSTRAINT =
  'UQ_tipo_procedimiento_clave_tipo_procedimiento';

interface TipoProcedimientoConfig {
  clave: string;
  nombre: string;
  esTipoExpediente: boolean;
  requiereFolioInfraccion: boolean;
  requiereNumParteInformativo: boolean;
  requiereMotivos: boolean;
  permiteRetencion: boolean;
  activo: boolean;
}

interface TipoProcedimientoRow {
  idTipoProcedimiento: number;
  claveTipoProcedimiento?: string | null;
  nombreTipoProcedimiento: string;
}

const TIPOS_PROCEDIMIENTO: TipoProcedimientoConfig[] = [
  {
    clave: 'INFRACCION',
    nombre: 'INFRACCION',
    esTipoExpediente: true,
    requiereFolioInfraccion: true,
    requiereNumParteInformativo: false,
    requiereMotivos: true,
    permiteRetencion: true,
    activo: true,
  },
  {
    clave: 'INFRACCION_SIN_RETENCION',
    nombre: 'INFRACCION SIN RETENCION',
    esTipoExpediente: true,
    requiereFolioInfraccion: true,
    requiereNumParteInformativo: false,
    requiereMotivos: true,
    permiteRetencion: false,
    activo: true,
  },
  {
    clave: 'VEHICULO_SIN_INFRACCION',
    nombre: 'VEHICULO SIN INFRACCION',
    esTipoExpediente: true,
    requiereFolioInfraccion: false,
    requiereNumParteInformativo: true,
    requiereMotivos: false,
    permiteRetencion: true,
    activo: true,
  },
  {
    clave: 'RETENCION',
    nombre: 'RETENCION',
    esTipoExpediente: false,
    requiereFolioInfraccion: false,
    requiereNumParteInformativo: false,
    requiereMotivos: false,
    permiteRetencion: true,
    activo: true,
  },
  {
    clave: 'LIBERACION',
    nombre: 'LIBERACION',
    esTipoExpediente: false,
    requiereFolioInfraccion: false,
    requiereNumParteInformativo: false,
    requiereMotivos: false,
    permiteRetencion: false,
    activo: true,
  },
];

function normalizeNombreToClave(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/[\s-]+/g, '_')
    .replace(/_+/g, '_')
    .toUpperCase();
}

async function seedTipoProcedimiento(
  queryRunner: QueryRunner,
  tipo: TipoProcedimientoConfig,
): Promise<void> {
  const currentRows = (await queryRunner.query(
    `
      SELECT
        id_tipo_procedimiento AS "idTipoProcedimiento",
        clave_tipo_procedimiento AS "claveTipoProcedimiento",
        nombre_tipo_procedimiento AS "nombreTipoProcedimiento"
      FROM tipo_procedimiento
      WHERE clave_tipo_procedimiento = $1
         OR nombre_tipo_procedimiento = $2
    `,
    [tipo.clave, tipo.nombre],
  )) as TipoProcedimientoRow[];

  const existingByNombre = currentRows.find(
    (row) => row.nombreTipoProcedimiento === tipo.nombre,
  );
  const existingByClave = currentRows.find(
    (row) => row.claveTipoProcedimiento === tipo.clave,
  );

  if (existingByNombre) {
    if (
      existingByClave &&
      existingByClave.idTipoProcedimiento !==
        existingByNombre.idTipoProcedimiento
    ) {
      await queryRunner.query(
        `
          UPDATE tipo_procedimiento
          SET clave_tipo_procedimiento = $2
          WHERE id_tipo_procedimiento = $1
        `,
        [
          existingByClave.idTipoProcedimiento,
          `${tipo.clave}_${existingByClave.idTipoProcedimiento}`,
        ],
      );
    }

    await queryRunner.query(
      `
        UPDATE tipo_procedimiento
        SET
          clave_tipo_procedimiento = $2,
          nombre_tipo_procedimiento = $3,
          es_tipo_expediente = $4,
          requiere_folio_infraccion = $5,
          requiere_num_parte_informativo = $6,
          requiere_motivos = $7,
          permite_retencion = $8,
          activo = $9
        WHERE id_tipo_procedimiento = $1
      `,
      [
        existingByNombre.idTipoProcedimiento,
        tipo.clave,
        tipo.nombre,
        tipo.esTipoExpediente,
        tipo.requiereFolioInfraccion,
        tipo.requiereNumParteInformativo,
        tipo.requiereMotivos,
        tipo.permiteRetencion,
        tipo.activo,
      ],
    );
    return;
  }

  if (existingByClave) {
    await queryRunner.query(
      `
        UPDATE tipo_procedimiento
        SET
          clave_tipo_procedimiento = $2,
          nombre_tipo_procedimiento = $3,
          es_tipo_expediente = $4,
          requiere_folio_infraccion = $5,
          requiere_num_parte_informativo = $6,
          requiere_motivos = $7,
          permite_retencion = $8,
          activo = $9
        WHERE id_tipo_procedimiento = $1
      `,
      [
        existingByClave.idTipoProcedimiento,
        tipo.clave,
        tipo.nombre,
        tipo.esTipoExpediente,
        tipo.requiereFolioInfraccion,
        tipo.requiereNumParteInformativo,
        tipo.requiereMotivos,
        tipo.permiteRetencion,
        tipo.activo,
      ],
    );
    return;
  }

  await queryRunner.query(
    `
      INSERT INTO tipo_procedimiento (
        clave_tipo_procedimiento,
        nombre_tipo_procedimiento,
        es_tipo_expediente,
        requiere_folio_infraccion,
        requiere_num_parte_informativo,
        requiere_motivos,
        permite_retencion,
        activo
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
    [
      tipo.clave,
      tipo.nombre,
      tipo.esTipoExpediente,
      tipo.requiereFolioInfraccion,
      tipo.requiereNumParteInformativo,
      tipo.requiereMotivos,
      tipo.permiteRetencion,
      tipo.activo,
    ],
  );
}

export class AddTipoProcedimientoReglas1850000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      TABLE_TIPO_PROCEDIMIENTO,
      new TableColumn({
        name: 'clave_tipo_procedimiento',
        type: 'varchar',
        length: '100',
        isNullable: true,
      }),
    );

    await queryRunner.addColumns(TABLE_TIPO_PROCEDIMIENTO, [
      new TableColumn({
        name: 'es_tipo_expediente',
        type: 'boolean',
        isNullable: false,
        default: false,
      }),
      new TableColumn({
        name: 'requiere_folio_infraccion',
        type: 'boolean',
        isNullable: false,
        default: false,
      }),
      new TableColumn({
        name: 'requiere_num_parte_informativo',
        type: 'boolean',
        isNullable: false,
        default: false,
      }),
      new TableColumn({
        name: 'requiere_motivos',
        type: 'boolean',
        isNullable: false,
        default: false,
      }),
      new TableColumn({
        name: 'permite_retencion',
        type: 'boolean',
        isNullable: false,
        default: false,
      }),
      new TableColumn({
        name: 'activo',
        type: 'boolean',
        isNullable: false,
        default: true,
      }),
    ]);

    const rows = (await queryRunner.query(
      `
        SELECT
          id_tipo_procedimiento AS "idTipoProcedimiento",
          nombre_tipo_procedimiento AS "nombreTipoProcedimiento"
        FROM tipo_procedimiento
        ORDER BY id_tipo_procedimiento ASC
      `,
    )) as TipoProcedimientoRow[];

    const assignedKeys = new Set<string>();

    for (const row of rows) {
      const baseKey = normalizeNombreToClave(row.nombreTipoProcedimiento);
      const technicalKey = assignedKeys.has(baseKey)
        ? `${baseKey}_${row.idTipoProcedimiento}`
        : baseKey;

      assignedKeys.add(technicalKey);

      await queryRunner.query(
        `
          UPDATE tipo_procedimiento
          SET clave_tipo_procedimiento = $2
          WHERE id_tipo_procedimiento = $1
        `,
        [row.idTipoProcedimiento, technicalKey],
      );
    }

    for (const tipo of TIPOS_PROCEDIMIENTO) {
      await seedTipoProcedimiento(queryRunner, tipo);
    }

    await queryRunner.changeColumn(
      TABLE_TIPO_PROCEDIMIENTO,
      'clave_tipo_procedimiento',
      new TableColumn({
        name: 'clave_tipo_procedimiento',
        type: 'varchar',
        length: '100',
        isNullable: false,
      }),
    );

    await queryRunner.createUniqueConstraint(
      TABLE_TIPO_PROCEDIMIENTO,
      new TableUnique({
        name: UNIQUE_CLAVE_CONSTRAINT,
        columnNames: ['clave_tipo_procedimiento'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropUniqueConstraint(
      TABLE_TIPO_PROCEDIMIENTO,
      UNIQUE_CLAVE_CONSTRAINT,
    );

    await queryRunner.dropColumn(TABLE_TIPO_PROCEDIMIENTO, 'activo');
    await queryRunner.dropColumn(TABLE_TIPO_PROCEDIMIENTO, 'permite_retencion');
    await queryRunner.dropColumn(TABLE_TIPO_PROCEDIMIENTO, 'requiere_motivos');
    await queryRunner.dropColumn(
      TABLE_TIPO_PROCEDIMIENTO,
      'requiere_num_parte_informativo',
    );
    await queryRunner.dropColumn(
      TABLE_TIPO_PROCEDIMIENTO,
      'requiere_folio_infraccion',
    );
    await queryRunner.dropColumn(
      TABLE_TIPO_PROCEDIMIENTO,
      'es_tipo_expediente',
    );
    await queryRunner.dropColumn(
      TABLE_TIPO_PROCEDIMIENTO,
      'clave_tipo_procedimiento',
    );
  }
}
