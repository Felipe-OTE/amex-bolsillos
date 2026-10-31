# AMEX Bolsillos — prueba de registro por voz v1.3

**Rama:** `feature-registro-voz-v1.3`  
**Producción:** `main` (no modificada)

## Probar en iPhone

1. Abrir `https://raw.githack.com/Felipe-OTE/amex-bolsillos/feature-registro-voz-v1.3/index.html` desde Safari. La primera visita puede mostrar una confirmación de seguridad del proveedor externo.
2. En **Registrar → Registrar gasto por voz**, pulsar **Dictar**, después el icono de micrófono del teclado del iPhone (Ajustes → General → Teclado → Activar dictado).
3. Pronunciar, por ejemplo, «Cuatro euros cargados con Swile Relais en Tienda Ejemplo, bolsillo Alimentación».
4. Pulsar **Interpretar gasto** y verificar el importe cargado a AMEX, comercio, bolsillo y tipo de pago.
5. Pulsar **Aplicar al formulario**, verificar los campos y solo entonces **Guardar** si es una prueba ficticia.

**IMPORTANTE:** Este enlace de vista previa es servido por un tercero (raw.githack), no por GitHub Pages del usuario. No introducir ni importar datos financieros reales ni respaldos personales en esta vista de prueba. No instalar la versión de prueba encima de la app de producción.

## Cómo se interpreta Swile Relais

- «4 euros cargados con Swile Relais» => `amount: 400` céntimos cargados a **AMEX**, con `source: "Swile relais"`.
- No se supone que la compra total sea 29 euros ni que Swile haya pagado 25 euros: eso debe dictarse explícitamente o deducirse de un total y otra parte declarada.
- «La compra fue de 29 euros; Swile pagó 25 y 4 se cargaron a AMEX por relais» => AMEX 4 €, Swile 25 €, total 29 €.
- «Compré por 29 euros con Swile relais» => **ambiguo**; se solicita aclarar el cargo real de AMEX antes de aplicar.
- Los gastos se transfieren al formulario, pero **nunca se guardan sin pulsar Guardar**.

## Idiomas y pronunciación

El dictado lo realiza el **teclado de iOS**: la web no captura audio crudo, no tiene acceso al motor acústico ni controla el idioma de reconocimiento. El usuario debe seleccionar el teclado español o francés que corresponda. El parser local admite variantes escritas frecuentes de *Swile* («Swail», «Suail», «Souaille»), *Relais* («Relay», «Relé», «Relai»), *AMEX* («a mex», «am ecs», «American Express»). No garantiza interpretar cualquier transcripción.

En idiomas soportados Apple puede procesar el dictado en el dispositivo, pero la disponibilidad/offline depende de la configuración y el modelo. Probar en modo avión y verificar.

## Validación y privacidad

- Sin API externa ni scripts de analítica o IA. La interpretación es JavaScript local en `voice-parser.js`.
- Todos los casos de prueba usan la ficticia «Tienda Ejemplo».
- Pruebas reproducibles: abrir `voice-test.html` en el mismo directorio; se ejecutan 16 casos.
- `main` sigue en producción. La rama se puede fusionar **después** de validar interfaz y casos de uso.
- `localStorage` del navegador es por *origen*: la vista de raw.githack no puede leer los datos de la PWA de GitHub Pages, pero es un origen de un tercero y no se recomienda para información financiera real.
- Al preparar la versión definitiva, retirar banner de prueba y volver a manifest y nombre de producción. No reemplazar la clave de datos `amex-bolsillos-v1`.
