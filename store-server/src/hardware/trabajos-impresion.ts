/**
 * Composicion de trabajos de impresion completos (recibo / comanda de
 * cocina) a partir de los comandos ESC/POS puros de `esc-pos.ts`. Sigue
 * siendo PURO (sin `net`): recibe los datos ya resueltos y devuelve el
 * `Buffer` final listo para escribir en el socket. Separado de
 * `esc-pos-impresora.adapter.ts` para poder testear la composicion completa
 * (orden de comandos, presencia de init/corte) sin abrir ninguna conexion de
 * red (test/unit/esc-pos.spec.ts).
 */
import {
  comandoAbrirCajon,
  comandoAlineacion,
  comandoCorte,
  comandoInicializar,
  comandoNegrita,
  comandoSaltoLinea,
  comandoTamano,
  comandoTexto,
  concatenarComandos,
} from "./esc-pos";
import type { DatosComandaCocina, DatosRecibo } from "./impresora-adapter.interface";

const ANCHO_LINEA = 32; // caracteres por linea en una impresora termica de 58mm tipica (referencia, no bloqueante)

function linea(caracter = "-"): string {
  return caracter.repeat(ANCHO_LINEA);
}

export function construirTrabajoRecibo(datos: DatosRecibo): Buffer {
  const partes: Buffer[] = [];
  partes.push(comandoInicializar());
  partes.push(comandoAlineacion("centro"));
  partes.push(comandoTamano(2, 2));
  partes.push(comandoNegrita(true));
  partes.push(comandoTexto(`CHICKEN KITCHEN`));
  partes.push(comandoSaltoLinea());
  partes.push(comandoTamano(1, 1));
  partes.push(comandoTexto(`Pedido #${datos.numeroOrden}`));
  partes.push(comandoSaltoLinea());
  partes.push(comandoNegrita(false));
  partes.push(comandoAlineacion("izquierda"));
  partes.push(comandoTexto(linea()));
  partes.push(comandoSaltoLinea());

  for (const l of datos.lineas) {
    partes.push(comandoTexto(`${l.cantidad}x ${l.descripcion}`));
    partes.push(comandoSaltoLinea());
    partes.push(comandoTexto(`  ${l.precioUnitario} c/u -> ${l.subtotalLinea}`));
    partes.push(comandoSaltoLinea());
  }

  partes.push(comandoTexto(linea()));
  partes.push(comandoSaltoLinea());
  partes.push(comandoTexto(`Subtotal:   ${datos.subtotal}`));
  partes.push(comandoSaltoLinea());
  partes.push(comandoTexto(`Descuento:  ${datos.descuentoTotal}`));
  partes.push(comandoSaltoLinea());
  partes.push(comandoTexto(`Impuesto:   ${datos.impuestoTotal}`));
  partes.push(comandoSaltoLinea());
  partes.push(comandoTexto(`Propina:    ${datos.propinaTotal}`));
  partes.push(comandoSaltoLinea());
  partes.push(comandoNegrita(true));
  partes.push(comandoTexto(`TOTAL:      ${datos.total}`));
  partes.push(comandoNegrita(false));
  partes.push(comandoSaltoLinea());
  partes.push(comandoTexto(`Metodo: ${datos.metodoPago}`));
  partes.push(comandoSaltoLinea());

  if (datos.montoRecibido != null && datos.cambio != null) {
    partes.push(comandoTexto(`Recibido: ${datos.montoRecibido}  Cambio: ${datos.cambio}`));
    partes.push(comandoSaltoLinea());
  }

  partes.push(comandoSaltoLinea(3));
  partes.push(comandoCorte(false));
  return concatenarComandos(...partes);
}

export function construirTrabajoComandaCocina(datos: DatosComandaCocina): Buffer {
  const partes: Buffer[] = [];
  partes.push(comandoInicializar());
  partes.push(comandoAlineacion("centro"));
  partes.push(comandoTamano(2, 2));
  partes.push(comandoNegrita(true));
  partes.push(comandoTexto(datos.liberacionParcial ? "COMANDA (parcial)" : "COMANDA"));
  partes.push(comandoSaltoLinea());
  partes.push(comandoTamano(1, 1));
  partes.push(comandoTexto(`Pedido #${datos.numeroOrden}`));
  partes.push(comandoNegrita(false));
  partes.push(comandoSaltoLinea());
  partes.push(comandoAlineacion("izquierda"));
  partes.push(comandoTexto(linea()));
  partes.push(comandoSaltoLinea());

  for (const l of datos.lineas) {
    partes.push(comandoNegrita(true));
    partes.push(comandoTexto(`${l.cantidad}x ${l.descripcion}`));
    partes.push(comandoNegrita(false));
    partes.push(comandoSaltoLinea());
    for (const m of l.modificadores) {
      partes.push(comandoTexto(`   - ${m}`));
      partes.push(comandoSaltoLinea());
    }
    if (l.notas) {
      partes.push(comandoTexto(`   * ${l.notas}`));
      partes.push(comandoSaltoLinea());
    }
  }

  partes.push(comandoSaltoLinea(3));
  partes.push(comandoCorte(false));
  return concatenarComandos(...partes);
}

/** Trabajo minimo para abrir el cajon (sin texto, solo el pulso). */
export function construirTrabajoAbrirCajon(): Buffer {
  return comandoAbrirCajon();
}
