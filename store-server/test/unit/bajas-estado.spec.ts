/**
 * Unit tests de la maquina de estados de BajasService (F3-T1), SIN base de
 * datos real: se mockean PrismaService/InventarioService/SeguridadService,
 * mismo patron que test/unit/sync-outbox.spec.ts. Cubren el requisito NUCLEO
 * de la tarea: "la baja no impacta stock hasta ser aprobada".
 *
 * El test de integracion real contra Postgres (create -> aprobar mueve stock,
 * rechazar nunca lo mueve) vive en test/integration/bajas.integration.spec.ts.
 */
import { Decimal } from "@prisma/client/runtime/library";
import { BajasService } from "../../src/bajas/bajas.service";
import type { PrismaService } from "../../src/common/prisma/prisma.service";
import type { InventarioService } from "../../src/inventario/inventario.service";
import type { SeguridadService } from "../../src/seguridad/seguridad.service";

function crearMocks() {
  const solicitudBaja = {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
  };
  const insumo = { findUnique: jest.fn() };
  const ubicacion = { findUnique: jest.fn() };
  const stock = { findUnique: jest.fn() };

  const prisma = { solicitudBaja, insumo, ubicacion, stock } as unknown as PrismaService;

  const registrarMermaAprobada = jest.fn().mockResolvedValue(undefined);
  const inventario = { registrarMermaAprobada } as unknown as InventarioService;

  const registrarAuditoria = jest.fn().mockResolvedValue(undefined);
  const seguridad = { registrarAuditoria } as unknown as SeguridadService;

  return { prisma, solicitudBaja, insumo, ubicacion, stock, inventario, registrarMermaAprobada, seguridad, registrarAuditoria };
}

const SOLICITUD_PENDIENTE = {
  id: "baja-1",
  ubicacionId: "ubic-test",
  insumoId: "insu-test",
  cantidad: new Decimal(5),
  motivo: "caducado",
  etiqueta: "lote-42",
  solicitadoPorId: "user-cajero",
  estado: "pendiente",
  revisadoPorId: null,
  revisadoEn: null,
  valorEstimado: null,
};

describe("BajasService — maquina de estados (F3-T1, sin DB)", () => {
  it("solicitarBaja crea la solicitud en 'pendiente' y NUNCA mueve stock", async () => {
    const { prisma, solicitudBaja, insumo, ubicacion, inventario, registrarMermaAprobada, seguridad } = crearMocks();
    insumo.findUnique.mockResolvedValue({ id: "insu-test", costoUnitario: new Decimal(2) });
    ubicacion.findUnique.mockResolvedValue({ id: "ubic-test", umbralMermaPorcentaje: new Decimal(3) });
    solicitudBaja.create.mockResolvedValue({ ...SOLICITUD_PENDIENTE });

    const service = new BajasService(prisma, inventario, seguridad);
    const resultado: any = await service.solicitarBaja(
      { ubicacionId: "ubic-test", insumoId: "insu-test", cantidad: 5, motivo: "caducado", etiqueta: "lote-42" },
      "user-cajero",
    );

    expect(resultado.estado).toBe("pendiente");
    expect(solicitudBaja.create).toHaveBeenCalledTimes(1);
    expect(solicitudBaja.create.mock.calls[0][0].data.estado).toBe("pendiente");
    // El requisito nucleo de F3-T1: solicitar NUNCA toca stock.
    expect(registrarMermaAprobada).not.toHaveBeenCalled();
  });

  it("aprobarBaja sobre una solicitud pendiente mueve stock exactamente UNA vez y la marca 'aprobada'", async () => {
    const { prisma, solicitudBaja, insumo, ubicacion, stock, inventario, registrarMermaAprobada, seguridad } = crearMocks();
    solicitudBaja.findUnique.mockResolvedValue({ ...SOLICITUD_PENDIENTE });
    insumo.findUnique.mockResolvedValue({ id: "insu-test", costoUnitario: new Decimal(2) });
    ubicacion.findUnique.mockResolvedValue({ id: "ubic-test", umbralMermaPorcentaje: new Decimal(3) });
    stock.findUnique.mockResolvedValue({ cantidadActual: new Decimal(1000) });
    solicitudBaja.update.mockResolvedValue({ ...SOLICITUD_PENDIENTE, estado: "aprobada" });

    const service = new BajasService(prisma, inventario, seguridad);
    const resultado: any = await service.aprobarBaja("baja-1", "user-gerente");

    expect(resultado.estado).toBe("aprobada");
    expect(registrarMermaAprobada).toHaveBeenCalledTimes(1);
    expect(registrarMermaAprobada).toHaveBeenCalledWith(
      expect.objectContaining({ ubicacionId: "ubic-test", insumoId: "insu-test", usuarioId: "user-gerente" }),
    );
    expect(solicitudBaja.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "baja-1" },
        data: expect.objectContaining({ estado: "aprobada", revisadoPorId: "user-gerente" }),
      }),
    );
  });

  it("aprobar una solicitud YA aprobada responde 409 (no un no-op silencioso) y NO mueve stock de nuevo", async () => {
    const { prisma, solicitudBaja, inventario, registrarMermaAprobada, seguridad } = crearMocks();
    solicitudBaja.findUnique.mockResolvedValue({ ...SOLICITUD_PENDIENTE, estado: "aprobada" });

    const service = new BajasService(prisma, inventario, seguridad);
    await expect(service.aprobarBaja("baja-1", "user-gerente")).rejects.toMatchObject({
      codigo: "solicitud_baja_ya_revisada",
      status: 409,
    });
    expect(registrarMermaAprobada).not.toHaveBeenCalled();
  });

  it("aprobar una solicitud YA rechazada tambien responde 409 y NO mueve stock", async () => {
    const { prisma, solicitudBaja, inventario, registrarMermaAprobada, seguridad } = crearMocks();
    solicitudBaja.findUnique.mockResolvedValue({ ...SOLICITUD_PENDIENTE, estado: "rechazada" });

    const service = new BajasService(prisma, inventario, seguridad);
    await expect(service.aprobarBaja("baja-1", "user-gerente")).rejects.toMatchObject({
      codigo: "solicitud_baja_ya_revisada",
      status: 409,
    });
    expect(registrarMermaAprobada).not.toHaveBeenCalled();
  });

  it("rechazarBaja sobre una solicitud pendiente la marca 'rechazada' y NUNCA mueve stock", async () => {
    const { prisma, solicitudBaja, inventario, registrarMermaAprobada, seguridad, registrarAuditoria } = crearMocks();
    solicitudBaja.findUnique.mockResolvedValue({ ...SOLICITUD_PENDIENTE });
    solicitudBaja.update.mockResolvedValue({ ...SOLICITUD_PENDIENTE, estado: "rechazada", motivoRechazo: "duplicado" });

    const service = new BajasService(prisma, inventario, seguridad);
    const resultado: any = await service.rechazarBaja("baja-1", "user-gerente", "duplicado");

    expect(resultado.estado).toBe("rechazada");
    expect(registrarMermaAprobada).not.toHaveBeenCalled();
    expect(registrarAuditoria).toHaveBeenCalledWith(expect.objectContaining({ tipo: "bajaRechazada" }));
  });

  it("rechazar una solicitud YA revisada responde 409, no un no-op silencioso", async () => {
    const { prisma, solicitudBaja, inventario, registrarMermaAprobada, seguridad } = crearMocks();
    solicitudBaja.findUnique.mockResolvedValue({ ...SOLICITUD_PENDIENTE, estado: "aprobada" });

    const service = new BajasService(prisma, inventario, seguridad);
    await expect(service.rechazarBaja("baja-1", "user-gerente")).rejects.toMatchObject({
      codigo: "solicitud_baja_ya_revisada",
      status: 409,
    });
    expect(registrarMermaAprobada).not.toHaveBeenCalled();
  });

  it("aprobar/rechazar una solicitud inexistente responde 404", async () => {
    const { prisma, solicitudBaja, inventario, seguridad } = crearMocks();
    solicitudBaja.findUnique.mockResolvedValue(null);

    const service = new BajasService(prisma, inventario, seguridad);
    await expect(service.aprobarBaja("no-existe", "user-gerente")).rejects.toMatchObject({
      codigo: "solicitud_baja_no_encontrada",
      status: 404,
    });
    await expect(service.rechazarBaja("no-existe", "user-gerente")).rejects.toMatchObject({
      codigo: "solicitud_baja_no_encontrada",
      status: 404,
    });
  });

  it("aprobarBaja emite la alerta 'alertaMerma' cuando la aprobacion cruza el umbral configurado", async () => {
    const { prisma, solicitudBaja, insumo, ubicacion, stock, inventario, seguridad, registrarAuditoria } = crearMocks();
    solicitudBaja.findUnique.mockResolvedValue({ ...SOLICITUD_PENDIENTE, cantidad: new Decimal(20) });
    // costoUnitario=2, cantidad=20 => valorEstaAprobacion = 40
    insumo.findUnique.mockResolvedValue({ id: "insu-test", costoUnitario: new Decimal(2) });
    // base = cantidadActual(500) * costoUnitario(2) = 1000 => 40/1000*100 = 4% > umbral 3%
    stock.findUnique.mockResolvedValue({ cantidadActual: new Decimal(500) });
    ubicacion.findUnique.mockResolvedValue({ id: "ubic-test", umbralMermaPorcentaje: new Decimal(3) });
    solicitudBaja.update.mockResolvedValue({ ...SOLICITUD_PENDIENTE, estado: "aprobada" });
    solicitudBaja.findMany.mockResolvedValue([]); // sin merma previa en el periodo

    const service = new BajasService(prisma, inventario, seguridad);
    await service.aprobarBaja("baja-1", "user-gerente");

    expect(registrarAuditoria).toHaveBeenCalledWith(expect.objectContaining({ tipo: "alertaMerma" }));
  });

  it("aprobarBaja NO emite 'alertaMerma' cuando la merma acumulada queda por debajo del umbral", async () => {
    const { prisma, solicitudBaja, insumo, ubicacion, stock, inventario, seguridad, registrarAuditoria } = crearMocks();
    solicitudBaja.findUnique.mockResolvedValue({ ...SOLICITUD_PENDIENTE, cantidad: new Decimal(1) });
    // costoUnitario=2, cantidad=1 => valorEstaAprobacion = 2
    insumo.findUnique.mockResolvedValue({ id: "insu-test", costoUnitario: new Decimal(2) });
    // base = cantidadActual(1000) * costoUnitario(2) = 2000 => 2/2000*100 = 0.1% < umbral 3%
    stock.findUnique.mockResolvedValue({ cantidadActual: new Decimal(1000) });
    ubicacion.findUnique.mockResolvedValue({ id: "ubic-test", umbralMermaPorcentaje: new Decimal(3) });
    solicitudBaja.update.mockResolvedValue({ ...SOLICITUD_PENDIENTE, estado: "aprobada" });
    solicitudBaja.findMany.mockResolvedValue([]);

    const service = new BajasService(prisma, inventario, seguridad);
    await service.aprobarBaja("baja-1", "user-gerente");

    expect(registrarAuditoria).not.toHaveBeenCalledWith(expect.objectContaining({ tipo: "alertaMerma" }));
  });
});
