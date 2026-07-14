/**
 * `Rol.nombre` en el store (lib/db/store.ts) es un identificador interno en
 * espanol ("cajero", "cocina", "gerenteTienda"), no un texto de UI — por eso
 * no reacciona al toggle de idioma por si solo. Este helper lo traduce para
 * mostrarlo en pantalla; si aparece un rol nuevo sin mapear, cae de vuelta al
 * nombre interno en vez de romper.
 */
type Traductor = (clave: string, vars?: Record<string, string | number>) => string;

const CLAVE_POR_ROL: Record<string, string> = {
  cajero: "roles.cajero",
  cocina: "roles.cocina",
  gerenteTienda: "roles.gerente",
  developer: "roles.developer",
};

export function nombreRolTraducido(nombreInterno: string, t: Traductor): string {
  const clave = CLAVE_POR_ROL[nombreInterno];
  return clave ? t(clave) : nombreInterno;
}
