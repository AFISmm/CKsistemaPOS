import * as net from "node:net";
import { Logger } from "@nestjs/common";
import { comandoAbrirCajon } from "./esc-pos";
import type {
  DatosComandaCocina,
  DatosRecibo,
  ImpresoraAdapter,
} from "./impresora-adapter.interface";
import { construirTrabajoComandaCocina, construirTrabajoRecibo } from "./trabajos-impresion";

const TIMEOUT_CONEXION_MS = 5000;

/**
 * EscPosImpresoraAdapter — implementacion REAL del `ImpresoraAdapter` (F2-T4).
 *
 * =============================================================================
 * CODIGO DE PROTOCOLO REAL, NUNCA PROBADO CONTRA HARDWARE FISICO EN ESTE
 * SANDBOX. Los bytes ESC/POS que emite (`esc-pos.ts`) son correctos segun la
 * especificacion publica y estable de Epson/ESC-POS (ver el encabezado de ese
 * archivo para la referencia byte a byte) y estan cubiertos por
 * test/unit/esc-pos.spec.ts, pero esta clase en si (el transporte TCP) NO se
 * ha ejecutado nunca contra una impresora Epson TM-m30III/Star TSP143IV real
 * (ADR-0006 F0-T3): eso requiere una impresora fisica durante el piloto
 * (F4-T1), no es algo que mas codigo pueda resolver en un entorno sin
 * hardware. Ver store-server/README.md seccion "Hardware".
 * =============================================================================
 *
 * Transporte: impresion ESC/POS en red plana (RAW) sobre TCP puerto 9100 —
 * el estandar de facto soportado tanto por impresoras Epson como Star en modo
 * ESC/POS (arquitectura.md §3 "Impresion / cajon: ESC/POS (USB o TCP 9100)").
 * Se usa el modulo nativo `net` de Node (sin dependencia npm nueva): el
 * protocolo es "abrir socket, escribir bytes, cerrar" — no requiere ningun
 * framming/negociacion adicional que justifique una libreria como
 * `node-thermal-printer` para el MVP; si en el futuro se necesita status de
 * impresora (papel bajo, tapa abierta via respuesta del socket) esa
 * dependencia se puede sumar sin cambiar `ImpresoraAdapter`.
 */
export class EscPosImpresoraAdapter implements ImpresoraAdapter {
  private readonly logger = new Logger(EscPosImpresoraAdapter.name);

  constructor(
    private readonly host: string,
    private readonly puerto: number,
  ) {
    this.logger.warn(
      `IMPRESORA_HOST configurado: EscPosImpresoraAdapter activo hacia ${host}:${puerto} (ESC/POS sobre TCP). ` +
        "Codigo de protocolo real (bytes ESC/POS verificados por spec), pero el transporte de red NUNCA fue " +
        "probado contra una impresora fisica en este entorno — validar contra hardware real antes del piloto (F4-T1).",
    );
  }

  async imprimirRecibo(datos: DatosRecibo): Promise<void> {
    await this.enviar(construirTrabajoRecibo(datos), "recibo");
  }

  async imprimirComandaCocina(datos: DatosComandaCocina): Promise<void> {
    await this.enviar(construirTrabajoComandaCocina(datos), "comanda de cocina");
  }

  async abrirCajon(): Promise<void> {
    await this.enviar(comandoAbrirCajon(), "apertura de cajon");
  }

  /**
   * Abre un socket TCP, escribe el buffer de comandos ESC/POS y cierra.
   * Cualquier error (impresora apagada, red caida, timeout) se propaga como
   * excepcion: el LLAMADOR (VentasService/PagosService) decide si eso debe
   * bloquear la operacion o solo loguearse (arquitectura.md §2.2,
   * degradacion controlada — un periferico caido no detiene la venta).
   */
  private enviar(buffer: Buffer, descripcion: string): Promise<void> {
    return new Promise((resolve, reject) => {
      let asentado = false;
      const socket = new net.Socket();

      const liquidar = (fn: () => void) => {
        if (asentado) return;
        asentado = true;
        clearTimeout(temporizador);
        fn();
      };

      const temporizador = setTimeout(() => {
        socket.destroy();
        liquidar(() =>
          reject(
            new Error(
              `EscPosImpresoraAdapter: timeout (${TIMEOUT_CONEXION_MS}ms) enviando "${descripcion}" a ${this.host}:${this.puerto}`,
            ),
          ),
        );
      }, TIMEOUT_CONEXION_MS);

      socket.once("error", (err) => {
        liquidar(() => reject(err));
      });

      socket.connect(this.puerto, this.host, () => {
        socket.end(buffer);
      });

      socket.once("close", () => {
        liquidar(() => resolve());
      });
    });
  }
}
