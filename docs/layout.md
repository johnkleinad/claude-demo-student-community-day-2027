# Layout de decks, etapa 02

## Dirección solicitada

- Proporciones y navegación de app iOS, conservando la paleta oscura y las
  tipografías del evento: Pixelify Sans y Share Tech Mono.
- Título grande arriba. Colección inicialmente vacía, con acción central para
  agregar el primer deck.
- Grid de dos columnas con un desfase suave entre bloques. Se usan filas cortas
  y alturas alternas de 184/200 px, preservando el orden del DOM y del teclado.
- A partir de 1024 px, el grid pasa al panel izquierdo y el detalle ocupa el
  resto. En móvil, colección y detalle son vistas separadas con regreso visible.
- Sin barras de estado iOS ficticias ni menús que no tienen funcionalidad.

## Rutas e interacción

- `/`: colección de decks. En escritorio, muestra también el primer deck.
- `/decks/new`: creación de deck mediante formulario en el área de detalle.
- `/decks/:deckId`: selección en escritorio y vista de detalle en móvil.
- Nombre obligatorio, descripción opcional. Al crear se abre el deck.
- Sin contenido precargado: las tarjetas, materiales y sesiones siguen vacíos.
- Deck inexistente y ruta desconocida muestran una opción para regresar.

## Persistencia de esta etapa

El layout interactivo usa almacenamiento local bajo
`community-study.layout-decks.v1`, separado del cliente de Amplify. La interfaz
lo indica como vista previa guardada en el dispositivo. La existencia de
`amplify_outputs.json` no autentica usuarios ni conecta esta vista con AWS.
Auth, carga real de materiales y persistencia cloud siguen en la etapa 03.
No se simulan tarjetas generadas ni se invoca el agente.

## Accesibilidad y adaptación

Foco visible, enlace para saltar al contenido, navegación con enlaces reales,
etiquetas de formulario, estado actual anunciado, errores de guardado, respeto
a reducción de movimiento, safe areas y controles de al menos 44 px.
La creación funciona también sobre HTTP en la red local, sin depender de
`crypto.randomUUID`, que requiere un contexto seguro.

Estas notas alimentarán el `spec.md` final. El layout puede seguir cambiando
con las indicaciones del usuario.
