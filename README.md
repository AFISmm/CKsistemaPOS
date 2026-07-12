# Equipo de agentes — POS de Chicken Kitchen (Digenius)

Subagentes de **Claude Code** para desarrollar el sistema POS de Chicken Kitchen
(cadena de comida rápida de mostrador, multi-sucursal FL/TX, con kiosco, pedidos
online/app/delivery, catering y programa de lealtad Gold Wing Club).

## Instalación

1. Copia la carpeta `.claude/` a la raíz de tu proyecto (los archivos van en
   `.claude/agents/*.md`). Para tenerlos en todos tus proyectos, cópialos en
   `~/.claude/agents/` en tu carpeta de usuario.
2. Reinicia la sesión de Claude Code si creaste el directorio `agents/` por
   primera vez (o edítalos con `/agents` para que apliquen al instante).
3. Verifica que aparezcan con el comando `/agents`.

Los archivos son texto plano versionable: guárdalos en tu repositorio para que
todo el equipo los comparta y los mejore con el tiempo.

## Cómo se usan

- **Automático:** describe la tarea y Claude Code delega en el subagente cuyo
  campo `description` coincida.
- **Explícito:** pídelo por nombre, por ejemplo:
  `Usa el subagente analista-requisitos-pos para levantar el alcance del MVP.`

El punto de entrada recomendado es el coordinador:
`Usa el subagente orquestador-pos para planificar el proyecto POS.`

## Los 16 agentes

| # | Agente | Rol |
|---|--------|-----|
| 0 | `orquestador-pos` | Coordina, delega e integra (usa la herramienta Task) |
| 1 | `analista-requisitos-pos` | Requisitos, alcance e historias de usuario |
| 2 | `arquitecto-pos` | Arquitectura, stack, modelo de datos, seguridad |
| 3 | `backend-ventas-pos` | Motor de tickets, impuestos, descuentos, reembolsos, offline |
| 4 | `pagos-pos` | PSP, tarjeta EMV, efectivo, pago mixto, propinas (PCI) |
| 5 | `integraciones-canales-pos` | Online/app/delivery, lealtad, contabilidad |
| 6 | `menu-inventario-pos` | Carta, combos, modificadores, recetas e inventario |
| 7 | `kds-cocina-pos` | Pantalla de cocina y enrutamiento de pedidos |
| 8 | `frontend-mostrador-kiosco-pos` | Cajero, kiosco y pantalla al cliente |
| 9 | `reportes-analitica-pos` | Informes y tableros por tienda/región |
| 10 | `seguridad-accesos-pos` | Roles, permisos, auditoría, PCI, fiscal |
| 11 | `hardware-perifericos-pos` | Impresoras, cajón, lector, escáner, pantallas |
| 12 | `qa-pruebas-pos` | Pruebas y casos límite |
| 13 | `devops-despliegue-pos` | CI/CD, despliegue multi-tienda, respaldos, monitoreo |
| 14 | `rrhh-personal-pos` | Onboarding, ciclo de vida del empleado, turnos y asistencia (time clock) |
| 15 | `nomina-pos` | Cálculo de nómina, propinas, retenciones fiscales, recibos de pago |

## Flujo por fases

- **Fase 0 — Descubrimiento:** `analista-requisitos-pos` → `docs/requisitos.md`
- **Fase 1 — Arquitectura:** `arquitecto-pos` → `docs/arquitectura.md`, ADRs
- **Fase 2 — Núcleo (paralelo):** `backend-ventas-pos`, `menu-inventario-pos`,
  `pagos-pos`, `kds-cocina-pos`, `frontend-mostrador-kiosco-pos`
- **Fase 3 — Refuerzo:** `integraciones-canales-pos`, `reportes-analitica-pos`,
  `seguridad-accesos-pos`, `hardware-perifericos-pos`, `rrhh-personal-pos`,
  `nomina-pos`
- **Fase 4 — Cierre:** `qa-pruebas-pos` → `devops-despliegue-pos`

## Notas

- Los agentes de razonamiento (orquestador, requisitos, arquitecto) usan `opus`;
  los de implementación usan `sonnet`. Ajusta el campo `model` a tu gusto.
- El campo `tools` está limitado a lo necesario por agente (mínimo privilegio).
  Si usas servidores MCP (base de datos, PSP, etc.), añádelos al agente que los
  necesite.
- Empieza por el MVP: mostrador + cocina + cobro + inventario, y luego añade
  kiosco, canales online, catering, lealtad y multi-sucursal.
