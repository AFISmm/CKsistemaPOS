import { Module } from "@nestjs/common";
import { EscPosImpresoraAdapter } from "./esc-pos-impresora.adapter";
import { SimuladorImpresoraAdapter } from "./simulador-impresora.adapter";
import { leerConfigImpresoraEnv, resolverConfigImpresora } from "./hardware-config";
import { IMPRESORA_ADAPTER } from "./impresora-adapter.interface";

/**
 * HardwareModule (F2-T4) — modulo hoja (sin dependencias de Ventas/Pagos),
 * mismo patron que `PspModule` (src/pagos/psp/psp.module.ts): expone un
 * unico provider bajo el token `IMPRESORA_ADAPTER`, elegido en el arranque
 * segun variables de entorno:
 *  - `IMPRESORA_HOST` definido -> `EscPosImpresoraAdapter` (ESC/POS real via
 *    TCP `IMPRESORA_PUERTO`, default 9100).
 *  - `IMPRESORA_HOST` ausente (DEFAULT) -> `SimuladorImpresoraAdapter`
 *    (consola), para desarrollo/sandbox sin hardware fisico.
 *
 * VentasModule y PagosModule importan este modulo directamente (ambos
 * necesitan `IMPRESORA_ADAPTER`: comanda de cocina y recibo/cajon
 * respectivamente) sin crear ciclo, igual que hacen con PspModule/VentasModule.
 */
@Module({
  providers: [
    {
      provide: IMPRESORA_ADAPTER,
      useFactory: () => {
        const config = resolverConfigImpresora(leerConfigImpresoraEnv());
        if (config.modo === "real") {
          return new EscPosImpresoraAdapter(config.host, config.puerto);
        }
        return new SimuladorImpresoraAdapter();
      },
    },
  ],
  exports: [IMPRESORA_ADAPTER],
})
export class HardwareModule {}
