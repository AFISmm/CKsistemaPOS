"use client";

/**
 * Modal "Gestionar perfiles" — abierto desde el sidebar (permiso
 * "usuarios.gestionar", ver lib/db/store.ts). Lista los Usuario (nombre,
 * rol) y permite cambiar el PIN de acceso de cualquiera de ellos.
 *
 * REGLA DURA: solo habla con el backend via components/shell/api.ts
 * (patron ya establecido por el resto del shell).
 */

import { useCallback, useEffect, useState } from "react";
import type { Rol } from "@/lib/domain/types";
import { useI18n } from "@/lib/shell/I18nProvider";
import { textoErrorApi } from "@/lib/i18n/erroresApi";
import { nombreRolTraducido } from "@/lib/i18n/roles";
import {
  cambiarPinUsuario,
  listarRoles,
  listarUsuarios,
  type UsuarioSinPin,
} from "@/components/shell/api";

export default function GestionarPerfilesModal({ onCerrar }: { onCerrar: () => void }) {
  const { t } = useI18n();
  const [usuarios, setUsuarios] = useState<UsuarioSinPin[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cambiandoPinDe, setCambiandoPinDe] = useState<UsuarioSinPin | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [usuariosData, rolesData] = await Promise.all([listarUsuarios(), listarRoles()]);
      setUsuarios(usuariosData);
      setRoles(rolesData);
    } catch (err) {
      setError(textoErrorApi(err, t, "perfiles.modal.errorCarga"));
    } finally {
      setCargando(false);
    }
  }, [t]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function nombreRol(rolId: string): string {
    const interno = roles.find((r) => r.id === rolId)?.nombre ?? rolId;
    return nombreRolTraducido(interno, t);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-900">
        <div className="mb-1 flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-ck-dark dark:text-neutral-100">{t("perfiles.modal.titulo")}</h2>
          <button
            type="button"
            onClick={onCerrar}
            aria-label={t("perfiles.modal.cerrar")}
            className="text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
          >
            ✕
          </button>
        </div>
        <p className="mb-4 text-xs text-neutral-600 dark:text-neutral-400">{t("perfiles.modal.descripcion")}</p>

        {error && (
          <div className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-ck-red dark:bg-red-950/40 dark:text-red-300">{error}</div>
        )}

        {cargando ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{t("perfiles.modal.cargando")}</p>
        ) : (
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {usuarios.map((u) => (
              <li
                key={u.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-700"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ck-dark dark:text-neutral-100">{u.nombre}</p>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">{nombreRol(u.rolId)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCambiandoPinDe(u)}
                  className="shrink-0 rounded-lg border border-ck-red px-3 py-1 text-xs font-semibold text-ck-red dark:text-red-400"
                >
                  {t("perfiles.modal.cambiarPin")}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-600 dark:border-neutral-600 dark:text-neutral-300"
          >
            {t("perfiles.modal.cerrar")}
          </button>
        </div>
      </div>

      {cambiandoPinDe && (
        <CambiarPinSubmodal
          usuario={cambiandoPinDe}
          onCambiado={() => setCambiandoPinDe(null)}
          onCancelar={() => setCambiandoPinDe(null)}
        />
      )}
    </div>
  );
}

function CambiarPinSubmodal({
  usuario,
  onCambiado,
  onCancelar,
}: {
  usuario: UsuarioSinPin;
  onCambiado: () => void;
  onCancelar: () => void;
}) {
  const { t } = useI18n();
  const [pin, setPin] = useState("");
  const [pinConfirmar, setPinConfirmar] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function manejarSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);
    if (!/^\d{4}$/.test(pin)) {
      setError(t("perfiles.modal.errorPinInvalido"));
      return;
    }
    if (pin !== pinConfirmar) {
      setError(t("perfiles.modal.errorPinNoCoincide"));
      return;
    }
    setEnviando(true);
    try {
      await cambiarPinUsuario(usuario.id, pin);
      setOk(true);
      setTimeout(onCambiado, 700);
    } catch (err) {
      setError(textoErrorApi(err, t, "perfiles.modal.errorNoPudoCambiar"));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xs rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-900">
        <h3 className="mb-1 text-base font-bold text-ck-dark dark:text-neutral-100">{t("perfiles.modal.cambiarPin")}</h3>
        <p className="mb-4 text-xs text-neutral-600 dark:text-neutral-400">{usuario.nombre}</p>

        {error && (
          <div className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-ck-red dark:bg-red-950/40 dark:text-red-300">{error}</div>
        )}
        {ok && (
          <div className="mb-3 rounded-lg bg-green-50 p-2 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-300">
            {t("perfiles.modal.pinActualizado")}
          </div>
        )}

        <form onSubmit={manejarSubmit} className="space-y-3">
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
            {t("perfiles.modal.pinNuevo")}
            <input
              required
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              maxLength={4}
              className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm tracking-widest text-ck-dark dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
              placeholder="1234"
            />
          </label>
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
            {t("perfiles.modal.pinConfirmar")}
            <input
              required
              value={pinConfirmar}
              onChange={(e) => setPinConfirmar(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              maxLength={4}
              className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm tracking-widest text-ck-dark dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
              placeholder="1234"
            />
          </label>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancelar}
              className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-600 dark:border-neutral-600 dark:text-neutral-300"
            >
              {t("perfiles.modal.cancelar")}
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="rounded-xl bg-ck-red px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {enviando ? t("perfiles.modal.guardando") : t("perfiles.modal.guardarPin")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
