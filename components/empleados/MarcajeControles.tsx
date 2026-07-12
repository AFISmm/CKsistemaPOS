"use client";

import { useState } from "react";
import type { Marcaje } from "@/lib/domain/types";
import { registrarMarcaje } from "@/components/empleados/api";
import { useI18n } from "@/lib/shell/I18nProvider";
import { textoErrorApi } from "@/lib/i18n/erroresApi";

/**
 * Controles de marcaje (reloj checador) — DEMO.
 *
 * No hay geofencing ni verificacion de identidad reales: los checkboxes
 * "simular fuera de zona" / "simular fallo de verificacion" existen para
 * poder DEMOSTRAR las alertas que generaria una integracion real (tipo
 * XmartClock). En produccion esto se reemplaza por el marcaje que reporte el
 * proveedor de reloj checador via webhook/pull (ver README-DEMO.md).
 */
export default function MarcajeControles({
  empleadoId,
  ultimoTipo,
  onMarcado,
}: {
  empleadoId: string;
  ultimoTipo: "entrada" | "salida" | null;
  onMarcado: (marcaje: Marcaje) => void;
}) {
  const { t } = useI18n();
  const [simularFueraDeZona, setSimularFueraDeZona] = useState(false);
  const [simularFalloIdentidad, setSimularFalloIdentidad] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alerta, setAlerta] = useState<string | null>(null);

  const siguienteTipo: "entrada" | "salida" = ultimoTipo === "entrada" ? "salida" : "entrada";

  async function marcar() {
    setEnviando(true);
    setError(null);
    setAlerta(null);
    try {
      const marcaje = await registrarMarcaje({
        empleadoId,
        tipo: siguienteTipo,
        simularFueraDeZona,
        simularFalloIdentidad,
      });
      onMarcado(marcaje);
      const alertas: string[] = [];
      if (marcaje.tardanza) alertas.push(t("empleados.reloj.alertaTardanza"));
      if (!marcaje.dentroDeGeofence) alertas.push(t("empleados.reloj.alertaFueraGeofence"));
      if (!marcaje.identidadVerificada) alertas.push(t("empleados.reloj.alertaIdentidadNoVerificada"));
      if (alertas.length > 0) {
        setAlerta(t("empleados.reloj.alertaPrefijo", { detalle: alertas.join(", ") }));
      }
    } catch (err) {
      setError(textoErrorApi(err, t, "empleados.reloj.errorNoPudoRegistrar"));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <h3 className="mb-2 text-sm font-bold text-ck-dark">{t("empleados.reloj.titulo")}</h3>
      <p className="mb-3 text-xs text-neutral-500">
        {t("empleados.reloj.descripcion")}
      </p>

      <div className="mb-3 space-y-1">
        <label className="flex items-center gap-2 text-xs text-neutral-600">
          <input
            type="checkbox"
            checked={simularFueraDeZona}
            onChange={(e) => setSimularFueraDeZona(e.target.checked)}
          />
          {t("empleados.reloj.simularFueraZona")}
        </label>
        <label className="flex items-center gap-2 text-xs text-neutral-600">
          <input
            type="checkbox"
            checked={simularFalloIdentidad}
            onChange={(e) => setSimularFalloIdentidad(e.target.checked)}
          />
          {t("empleados.reloj.simularFalloIdentidad")}
        </label>
      </div>

      {error && <div className="mb-2 rounded-lg bg-red-50 p-2 text-xs text-ck-red">{error}</div>}
      {alerta && (
        <div className="mb-2 rounded-lg bg-ck-gold/20 p-2 text-xs font-semibold text-ck-gold">
          {alerta}
        </div>
      )}

      <button
        type="button"
        onClick={marcar}
        disabled={enviando}
        className={`w-full rounded-xl px-4 py-3 text-sm font-bold text-white disabled:opacity-50 ${
          siguienteTipo === "entrada" ? "bg-green-700" : "bg-ck-red"
        }`}
      >
        {enviando
          ? t("empleados.reloj.registrando")
          : siguienteTipo === "entrada"
            ? t("empleados.reloj.marcarEntrada")
            : t("empleados.reloj.marcarSalida")}
      </button>
    </div>
  );
}
