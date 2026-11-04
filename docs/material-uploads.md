# Carga de materiales, etapa 03b

Rama: `feat/03b-material-uploads`, basada en `feat/03-materials-and-decks`.
Usa los modelos Material/Deck y Storage ya definidos; esta etapa no modifica
el backend ni requiere volver a desplegarlo. Requiere outputs del sandbox
con Auth, Data y Storage disponibles.

## Interfaz

Cada deck permite seleccionar o arrastrar hasta 10 archivos por carga: JPG,
PNG, WebP y PDF de hasta 20 MiB por archivo. Se comprueban tamaño, formato y
firma inicial del contenido. La firma no sustituye una validación completa
del documento en el futuro backend de procesamiento.

Las imágenes tienen miniatura antes y después de subirlas. Los PDF muestran
icono, nombre y tamaño; al guardarlos se pueden abrir en otra pestaña mediante
una URL temporal. No se renderizan páginas PDF en la lista.

La lista muestra progreso por archivo, errores, cancelación y reintentos.
Las cargas son secuenciales. Al salir del deck o cerrar sesión, se cancelan las
cargas activas y se liberan las vistas previas locales. La cola no continúa
en segundo plano ni se conserva tras recargar. Los registros incompletos sí
persisten: se puede seleccionar su archivo original para reintentar.

## Persistencia y recuperación

1. Comprobar sesión, identidad de Storage y deck propio sin archivar.
2. Crear Material como PENDING, sin ruta, antes de enviar bytes a S3. El ID lo
   asigna AppSync: la autorización por campo de `owner` hace que el resolver
   rechace un `id` enviado por el cliente (`Unauthorized on [id]`).
3. Guardar `storagePath` con el ID asignado y subir con `preventOverwrite` a
   `materials/{identityPoolId}/{deckId}/{materialId}.{extension}`.
4. Cambiar Material a UPLOADED solo cuando S3 terminó correctamente.

La identidad del directorio privado es el ID del Identity Pool; el propietario
de Data es el `sub` del User Pool. No son intercambiables. La autorización de
los recursos existentes limita cada usuario a sus propios registros y objetos.

El reintento conserva el ID asignado y la ruta. Un registro creado sin ruta
se completa al reintentar con el archivo original. Si una creación tuvo una
respuesta ambigua, puede quedar un registro PENDING sin ruta que se reintenta
desde la lista. Si S3 ya contiene el objeto con el tamaño y
tipo esperados, confirma Data sin repetir la carga. No compara el contenido
completo de dos archivos. Si falla una subida, intenta marcar FAILED; si falla
el guardado final, conserva el registro recuperable. No borra registros ni
objetos guardados como efecto de quitar una selección local.

Las consultas recorren todas las páginas y rechazan errores GraphQL parciales.
Las URL de lectura duran 15 minutos y se renuevan mientras el material está
visible. No se guardan URL firmadas en Data.

## Validación y límites

`npm run check` comprueba lint, tipos de frontend/backend/contratos y pruebas.
`npm run build` verifica el bundle de producción. Las pruebas unitarias cubren
firmas y rutas, identidad, orden de registro/carga, respuestas ambiguas, fallos
de S3 y Data, cancelación y reintentos sin duplicar objetos.

La revisión con Playwright y servicios simulados cubrió selección múltiple,
rechazo de archivos incompatibles, miniaturas, PDF, rutas privadas, persistencia
al recargar, errores/reintentos y anchos de 320, 360, 390, 768 y 1440 px.
Esto no verifica permisos IAM ni CORS del sandbox desplegado.

Verificación pendiente en AWS: entrar con una cuenta confirmada, crear un deck,
subir una imagen y un PDF, recargar y abrir ambos. Con otra cuenta, comprobar
que esos materiales no aparecen y que no se pueden consultar ni descargar.

El botón de generación y la integración AgentCore/Bedrock se implementan en la
etapa 04; ver [Integración del agente](agent-integration.md). Ese backend vuelve
a validar propiedad del deck, materiales, rutas y contenido de S3. Las
comprobaciones del navegador no imponen relaciones de propiedad entre modelos
a clientes que llamen directamente a la API.
