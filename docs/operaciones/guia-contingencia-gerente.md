# Guía de contingencia para el gerente de tienda — Sistema POS Chicken Kitchen

- **Para:** Gerente de tienda (turno abierto, responsable de la operación diaria).
- **Tienda piloto:** Miami, FL.
- **Fase del proyecto:** F3-T2, `PLAN_DE_PRODUCCION.md` Fase 3 (Contingencia operativa).
- **Fecha:** 2026-07-19.
- **Idioma:** Español (versión para la tienda piloto de Miami). **Antes del
  despliegue en Texas (Fase 5) debe existir una versión en inglés de este
  mismo documento** — no se incluye aquí porque el piloto es en Miami y este
  documento debe validarse con el gerente real primero.

> **Imprima este documento y téngalo cerca de la caja registradora.** Está
> pensado para consultarse rápido, bajo presión, sin necesitar conocimientos
> técnicos. No requiere memorizar nada: cada situación tiene una acción
> concreta.

---

## Antes de nada: dos ideas que hay que tener claras

1. **Que se caiga el internet de la tienda NO es una emergencia.** El sistema
   está diseñado para seguir vendiendo, cocinando y cobrando en efectivo
   aunque no haya internet. Lo único que se atrasa es el envío de información
   a la oficina central, y eso se pone al día solo cuando vuelve la conexión.
2. **Que se caiga la PANTALLA/COMPUTADORA del Store Server (el equipo
   principal de la tienda, no un router) SÍ es una situación seria** que
   requiere un procedimiento manual temporal. Más abajo se explica cómo
   distinguir un caso del otro.

---

## Situación 1 — "Se cayó el internet" (la más común, la menos grave)

### Cómo se nota

- El indicador de conectividad de la pantalla (ver sección "El indicador de
  conectividad", más abajo) cambia de verde a amarillo o rojo.
- Puede que las pantallas de reportes o algún dato que viene de la nube
  central tarden en actualizarse.
- **Todo lo demás sigue funcionando con normalidad**: tomar pedidos, mandar a
  cocina, cobrar en efectivo, imprimir recibos, abrir el cajón, descontar
  inventario.

### Qué hacer

1. **Nada urgente.** Siga trabajando con normalidad. El sistema sigue
   guardando todo localmente en la tienda.
2. **Pagos con tarjeta:** pueden verse afectados dependiendo del proveedor de
   pagos (PSP) contratado — esto todavía está pendiente de confirmar
   comercialmente (ver nota de riesgo abajo). Si el sistema le indica que un
   cobro con tarjeta no se puede procesar en este momento, **ofrezca cobrar en
   efectivo**: el efectivo nunca deja de funcionar, pase lo que pase con
   internet.
3. Si el corte dura más de 30-60 minutos, o si tiene dudas de si es un
   problema de internet o algo más grave, llame a soporte técnico (ver
   "Contactos de escalamiento" al final).
4. Cuando vuelva la conexión, no tiene que hacer nada especial: el sistema
   sincroniza automáticamente todo lo que pasó mientras estuvo caído. No hay
   riesgo de que una venta se pierda o se duplique.

### Qué NO hacer

- No reinicie el Store Server (el equipo principal) solo porque no hay
  internet — eso no soluciona la falta de internet y puede interrumpir
  ventas en curso.
- No le diga al cliente que "el sistema está caído": el sistema de venta
  sigue funcionando, solo internet está caído.

---

## Situación 2 — "El sistema completo no responde" (la más seria)

### Cómo reconocerla (a diferencia de la Situación 1)

- Las pantallas de cajero **no cargan nada en absoluto** (no solo el
  indicador de conexión: literalmente no puedes tomar un pedido nuevo).
- La pantalla de cocina (KDS) no muestra ninguna comanda nueva, ni las
  viejas.
- Reiniciar la pantalla del cajero (no el equipo principal) no soluciona
  nada.
- El indicador de conectividad tampoco carga (a diferencia de la Situación 1,
  donde el indicador SÍ carga pero muestra "sin conexión").

Esto normalmente significa que el **Store Server** (el equipo principal que
tiene todos los datos de la tienda) se apagó, se colgó, o tiene un problema
de hardware — no es un problema de internet.

### Qué hacer, en orden

1. **Verifique lo obvio primero:** ¿el equipo principal (Store Server) está
   encendido? ¿tiene luces? ¿está conectado a la corriente? Si se apagó por
   un corte de luz, enciéndalo de nuevo y espere 2-3 minutos a que arranque.
2. Si arranca y las pantallas vuelven a responder: continúe la operación
   normal. Anote la hora aproximada de la caída y avise a soporte técnico
   igual, aunque ya se haya resuelto solo (para que quede registro).
3. **Si NO arranca, o arranca pero las pantallas siguen sin responder:**
   llame a soporte técnico de inmediato (ver "Contactos de escalamiento").
   No intente reinstalar nada ni abrir el equipo usted mismo.
4. **Mientras espera soporte, si hay clientes esperando y el corte se
   extiende:** use el procedimiento manual en papel (siguiente sección) para
   no perder ventas durante la espera.

### Procedimiento manual de respaldo (solo si el Store Server no responde y hay clientes esperando)

Este es un procedimiento **temporal**, solo para cubrir el tiempo hasta que
el sistema vuelva o llegue soporte técnico. No reemplaza al sistema.

1. Tome el pedido a mano en un formulario de papel (nombre del cliente,
   productos, cantidad, modificadores/notas especiales).
2. Cobre en **efectivo únicamente** (sin el sistema no hay forma segura de
   procesar tarjeta ni de calcular el cambio con el impuesto correcto — haga
   el cálculo de impuesto manual usando la tasa vigente de la tienda, que
   debe tener anotada en un lugar visible cerca de la caja).
3. Entregue al cliente un recibo escrito a mano con: fecha, hora, productos,
   monto total, y el nombre de quien atendió.
4. Guarde una copia de cada pedido en papel. **Cuando el sistema vuelva, un
   gerente debe cargar cada uno de estos pedidos manualmente** (como una
   venta normal) para que el inventario y el reporte del día queden
   correctos. No los deseche hasta haber hecho esto.
5. Lleve un conteo aparte del efectivo cobrado durante el corte, para poder
   cuadrar la caja correctamente cuando el sistema vuelva.

---

## El indicador de conectividad (qué significa en pantalla)

El sistema muestra en todo momento un indicador de tres estados sobre el
estado de la conexión a internet de la tienda (no de la LAN interna, que es
otra cosa — ver más abajo):

| Color / estado | Qué significa | Qué hacer |
|---|---|---|
| **Verde — "En línea"** | Todo normal, hay internet. | Nada. |
| **Amarillo — "Degradado"** | Parte de la conexión a internet tiene problemas, pero no está totalmente caída. | Nada urgente; si persiste varios minutos, avise a soporte para que quede registrado. |
| **Rojo — "Sin conexión"** | No hay internet en este momento. | Ver Situación 1 arriba. La venta sigue funcionando normal. |

**Importante:** este indicador es sobre **internet** (la conexión de la
tienda hacia afuera), no sobre si el sistema de venta en sí está funcionando.
Si las pantallas de cajero/cocina no cargan NADA (no solo el indicador), esa
es la Situación 2, no la 1.

El sistema también recuerda cuánto tiempo lleva en el estado actual (por
ejemplo, "sin conexión desde hace 12 min"), para que se pueda estimar cuánto
está durando un corte sin tener que adivinar.

---

## Preguntas frecuentes

**¿Puedo seguir cobrando con tarjeta si no hay internet?**
Depende del proveedor de pagos (PSP) que la empresa contrate y de si soporta
procesar pagos "offline" y confirmarlos después (esto se llama
*store-and-forward*). **Esta decisión comercial todavía no está cerrada** al
momento de escribir esta guía — mientras no se confirme, asuma que sin
internet la tarjeta puede no estar disponible y ofrezca efectivo. Esta guía
se actualizará en cuanto se confirme con el proveedor de pagos definitivo.

**¿Se pierde alguna venta si se cae internet?**
No. Todo lo que se vende en la tienda se guarda de inmediato en el equipo
local (Store Server), tenga o no internet. Internet solo se usa para enviar
una copia a la oficina central; eso se puede atrasar sin ningún problema.

**¿Qué hago si no estoy seguro de si es la Situación 1 o la Situación 2?**
Si tiene dudas, trátelo como Situación 2 (llame a soporte). Es más seguro
llamar de más que asumir que "ya se va a arreglar solo" cuando en realidad el
equipo principal tiene un problema.

**¿Tengo que reiniciar algo yo mismo?**
Solo lo indicado en el paso 1 de la Situación 2 (verificar que el equipo
principal esté encendido). No intente reiniciar el Store Server de otra
forma, ni reinstalar nada, sin que soporte técnico se lo indique.

---

## Contactos de escalamiento

> Los siguientes contactos son **placeholders**: todavía no existen
> (no hay un proveedor de soporte técnico contratado ni un directorio interno
> definido al momento de escribir esta guía). **No llame a estos números
> porque no son reales** — actualice esta sección con la información real
> antes de imprimir/entregar la versión final a la tienda piloto.

| Situación | Contacto | Notas |
|---|---|---|
| Soporte técnico del Store Server / red | `[TELÉFONO DE SOPORTE TÉCNICO]` | Disponible `[HORARIO DE SOPORTE]`. |
| Proveedor de pagos (PSP) / terminal de tarjeta | `[TELÉFONO/CONTACTO DEL PSP]` | Para problemas específicos de la terminal EMV o cobros con tarjeta. |
| Gerente regional / supervisor | `[TELÉFONO DEL SUPERVISOR]` | Para decisiones que excedan al gerente de tienda. |
| Emergencia eléctrica / del local (no del sistema) | `[CONTACTO DE MANTENIMIENTO DEL LOCAL]` | Cortes de luz, problemas del edificio. |

---

## Nota para quien actualice este documento

Este documento se generó como parte de la tarea F3-T2 del plan de producción
(`PLAN_DE_PRODUCCION.md`). Antes de entregarlo a la tienda piloto:

1. Reemplazar los contactos de escalamiento con información real.
2. Validarlo con el gerente real de la tienda piloto (lenguaje, claridad,
   pasos que realmente tengan sentido en el local físico).
3. Confirmar con `pagos-pos`/finanzas el estado de S-05 (store-and-forward
   del PSP) y actualizar la sección de tarjeta en consecuencia.
4. Producir la versión en inglés antes del rollout a Texas.
5. Imprimir y colocar una copia física cerca de la caja registradora de la
   tienda piloto (este documento está pensado para leerse en papel, no en
   pantalla, durante una contingencia real).
