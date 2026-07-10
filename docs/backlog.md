# Backlog — POS Chicken Kitchen (Digenius)

Estado del proyecto por fases. Actualizado por `orquestador-pos`.

Leyenda de estado: `PENDIENTE` · `EN CURSO` · `LISTO` · `BLOQUEADO` · `POSTERGADO`

## Fase 0 — Descubrimiento
| Tarea | Dueño | Entregable | Estado |
|-------|-------|------------|--------|
| Alcance MVP, historias de usuario y supuestos | analista-requisitos-pos | docs/requisitos.md | LISTO |

## Fase 1 — Arquitectura
| Tarea | Dueño | Entregable | Estado |
|-------|-------|------------|--------|
| Arquitectura técnica + ADRs iniciales | arquitecto-pos | docs/arquitectura.md, docs/adr/0001-0005.md | LISTO |

## Fase 2 — Núcleo (paralelo) — LISTA PARA ARRANCAR (Fase 1 aprobada)
> Contrato compartido vinculante: modelo de datos (19 entidades) y restricciones C-NOMBRES / C-ID / C-DINERO / C-OFFLINE / C-PCI / C-AUDIT / C-TENANT / C-SNAPSHOT en docs/arquitectura.md secciones 5, 6 y 9.
> Regla clave: `backend-ventas-pos` es el ÚNICO owner del cálculo de impuesto/total/saldo; los demás consumen, no recalculan.
> Bloqueante para `pagos-pos`: confirmar soporte de tarjeta offline (store-and-forward) del PSP — supuesto S-05.

| Tarea | Dueño | Entregable | Estado |
|-------|-------|------------|--------|
| Motor de tickets/pedidos, impuestos, descuentos, reembolsos, cola offline | backend-ventas-pos | — | PENDIENTE |
| Carta, combos, modificadores, recetas, inventario | menu-inventario-pos | — | PENDIENTE |
| PSP/EMV, efectivo, pago mixto, propinas | pagos-pos | — | PENDIENTE (dep. S-05) |
| Enrutamiento a cocina y pantalla KDS | kds-cocina-pos | — | PENDIENTE |
| Terminal de cajero de mostrador | frontend-mostrador-kiosco-pos | — | PENDIENTE |

## Fase 3 — Refuerzo
| Tarea | Dueño | Entregable | Estado |
|-------|-------|------------|--------|
| Reportes básicos del día (ventas, mix, daypart) | reportes-analitica-pos | — | PENDIENTE |
| Roles, permisos, auditoría, PCI, fiscal | seguridad-accesos-pos | — | PENDIENTE |
| Impresoras, cajón, lector EMV, pantallas KDS | hardware-perifericos-pos | — | PENDIENTE |
| (Fuera de MVP) Integraciones de canales/lealtad | integraciones-canales-pos | — | POSTERGADO |

## Fase 4 — Cierre
| Tarea | Dueño | Entregable | Estado |
|-------|-------|------------|--------|
| Plan y casos de prueba (hora pico, offline, reembolsos, pago mixto) | qa-pruebas-pos | — | PENDIENTE |
| CI/CD, despliegue, respaldos, monitoreo | devops-despliegue-pos | — | PENDIENTE |

## Preguntas abiertas / bloqueantes para el cliente (antes de Fase 2)
- S-05: ¿El PSP soporta cobro con tarjeta offline (store-and-forward)? (riesgo ALTO)
- S-06: Método de redondeo y base de cálculo del impuesto; tasas exactas FL/TX (estatal + local) y lista de exentos.
- Reglas de recibo fiscal por estado, umbrales de autorización de descuento/reembolso, horarios de dayparts, modelos/drivers de periféricos.
