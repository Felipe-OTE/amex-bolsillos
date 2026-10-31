# AMEX Bolsillos

Aplicación web instalable (PWA), de uso local, para registrar manualmente los importes cargados a AMEX y asociarlos a bolsillos. La aplicación no tiene backend ni envía los registros financieros a GitHub.

## Abrir e instalar

- URL de producción: https://felipe-ote.github.io/amex-bolsillos/
- iPhone: abrir el enlace en **Safari** y usar **Compartir → Añadir a pantalla de inicio**.
- Una vez cargada por primera vez con internet, los archivos básicos se almacenan para uso offline mediante el service worker. El dictado offline depende de la configuración del teclado de iOS.

## Registro manual y por voz (v1.3)

- En **Registrar**, escribir comercio, importe cargado a AMEX, bolsillo y tipo de pago; la fecha y hora son automáticas y editables.
- En **Registrar gasto por voz**, pulsar **Dictar**, usar el micrófono del teclado de iPhone, pulsar **Interpretar gasto**, revisar el resumen y pulsar **Aplicar al formulario**. El gasto **solo se guarda al pulsar Guardar**.
- Se admiten «bolsillo», «poche» y «catégorie» en español/francés. Las transcripciones de «Loisirs» como «lo hacía», «los sirr» o «lo sí U» se admiten exclusivamente tras una etiqueta de bolsillo.
- «4 euros cargados con Swile Relais» se contabilizan como **4 € cargados a AMEX**, sin asumir un total ni una aportación fija de Swile; únicamente se calcula el desglose si se indica expresamente.
- AMEX directa es el tipo de pago predeterminado cuando no se menciona Swile.

## Privacidad y respaldo

Los datos se guardan en `localStorage`, bajo el origen web de producción. El repositorio público contiene **solo código y ejemplos ficticios**; no cargar extractos, exportaciones JSON ni movimientos reales. `raw.githack.com` se utilizó únicamente para la demostración anterior: no debe emplearse con datos personales.

En **Datos**, exportar periódicamente el respaldo JSON y guardarlo en un lugar protegido. No borrar o reinstalar la web app antes de hacer respaldo, porque iOS puede eliminar los datos de almacenamiento local.

## Código y pruebas

- `index.html`: interfaz, almacenamiento local, formulario y validación previa.
- `voice-parser.js`: intérprete de texto local, sin servicios externos de transcripción, IA o analítica.
- `sw.js`: caché offline de archivos estáticos.
- `voice-test.html`: casos ficticios para pruebas de interpretación. No contiene registros personales.

Versión de producción v1.3. Compatible con el almacenamiento `amex-bolsillos-v1` de versiones anteriores.
