"use client";

/**
 * /jornada/pantalla — pantalla CENTRAL de la tienda (chequeo de inicio de
 * jornada, etapa 2) — DUENO: rrhh-personal-pos.
 *
 * Pensada para quedar fija en una tablet/terminal COMPARTIDA de la tienda
 * (ej. la del gerente), no ligada a un usuario en particular. Por eso esta
 * ruta esta exenta del guard de sesion del shell (ver
 * components/shell/AppShell.tsx, `RUTAS_SIN_GUARD`) y se renderiza
 * "desnuda" (sin sidebar/topbar): cualquiera frente a la tablet fisica debe
 * poder verla, y no tendria sentido pedirle un PIN de usuario a una pantalla
 * compartida de kiosko.
 *
 * Muestra el codigo TOTP de 6 digitos vigente (unico endpoint autorizado a
 * revelarlo: GET /api/v1/jornada/codigo) + un anillo de progreso de los 10s
 * hasta que rote. Hace poll cada 1s; el servidor sigue siendo la fuente de
 * verdad del codigo y de los segundos restantes (evita depender del reloj
 * del dispositivo).
 */

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/shell/I18nProvider";
import { listarUbicaciones } from "@/components/empleados/api";
import { obtenerCodigoVigente, ErrorApi } from "@/components/jornada/api";
import type { Ubicacion } from "@/lib/domain/types";

const PERIODO_TOTP_SEG = 10;
const RADIO = 90;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

export default function PantallaJornadaPage() {
  const { t } = useI18n();
  const [ubicacion, setUbicacion] = useState<Ubicacion | null>(null);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [segundosRestantes, setSegundosRestantes] = useState<number>(PERIODO_TOTP_SEG);
  const [error, setError] = useState<string | null>(null);

  // Resuelve la ubicacion una sola vez (demo: la primera tienda activa; en
  // produccion la tablet vendria pre-aprovisionada con su ubicacionId fijo).
  useEffect(() => {
    let vivo = true;
    listarUbicaciones()
      .then((ubicaciones) => {
        if (!vivo) return;
        const activa = ubicaciones.find((u) => u.activo) ?? ubicaciones[0] ?? null;
        setUbicacion(activa);
      })
      .catch(() => {
        if (vivo) setError(t("jornada.pantalla.errorUbicacion"));
      });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ubicacion) return;
    let vivo = true;

    async function refrescar() {
      try {
        const vigente = await obtenerCodigoVigente(ubicacion!.id);
        if (!vivo) return;
        setCodigo(vigente.codigo);
        setSegundosRestantes(vigente.segundosRestantes);
        setError(null);
      } catch (err) {
        if (vivo) setError(err instanceof ErrorApi ? err.message : t("jornada.pantalla.errorCodigo"));
      }
    }

    refrescar();
    const intervalo = setInterval(refrescar, 1000);
    return () => {
      vivo = false;
      clearInterval(intervalo);
    };
  }, [ubicacion, t]);

  const progreso = segundosRestantes / PERIODO_TOTP_SEG;
  const dashOffset = CIRCUNFERENCIA * (1 - progreso);
  const digitos = (codigo ?? "------").split("");

  return (
    <main className="grid min-h-screen place-items-center bg-neutral-950 p-6 text-center text-white">
      <div className="w-full max-w-2xl">
        <p className="mb-1 text-sm uppercase tracking-[0.3em] text-neutral-400">
          {t("jornada.pantalla.marca")}
        </p>
        <h1 className="mb-1 text-3xl font-black">{t("jornada.pantalla.titulo")}</h1>
        <p className="mb-8 text-base text-neutral-400">
          {ubicacion ? `${ubicacion.nombre}` : t("jornada.pantalla.cargando")}
        </p>

        <div className="relative mx-auto mb-8 grid h-56 w-56 place-items-center">
          <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full -rotate-90">
            <circle cx="100" cy="100" r={RADIO} fill="none" stroke="#292524" strokeWidth="10" />
            <circle
              cx="100"
              cy="100"
              r={RADIO}
              fill="none"
              stroke="#facc15"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={CIRCUNFERENCIA}
              strokeDashoffset={dashOffset}
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          <span className="text-5xl font-black text-ck-gold">{segundosRestantes}</span>
        </div>

        <div className="mb-6 flex justify-center gap-2 sm:gap-3">
          {digitos.map((d, i) => (
            <div
              key={i}
              className="grid h-16 w-12 place-items-center rounded-xl bg-neutral-900 text-4xl font-black tabular-nums sm:h-20 sm:w-16 sm:text-5xl"
            >
              {d}
            </div>
          ))}
        </div>

        <p className="mx-auto max-w-md text-sm text-neutral-400">
          {t("jornada.pantalla.instruccion")}
        </p>

        {error && <p className="mt-4 text-sm font-semibold text-ck-red">{error}</p>}

        <p className="mt-10 text-xs text-neutral-600">{t("jornada.pantalla.demoAviso")}</p>
      </div>
    </main>
  );
}
