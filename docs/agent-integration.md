# Frontera de integración del agente

## Estado actual

Hay contratos y modelos preparados. No existen todavía función de generación,
cola, runtime AgentCore, agente Strands ni invocaciones a Bedrock. Ninguna ruta
simula una generación exitosa. No hay credenciales ni ARN de modelos en el
frontend.

## Datos y autorización

`amplify/data/resource.ts` define:

- `Deck`: título, descripción y archivo lógico (`archived`).
- `Material`: deck, nombre original, ruta S3, MIME, tamaño, páginas opcionales
  y estado de carga. Crear registro `PENDING`, subir, y marcar `UPLOADED`.
- `Flashcard`: pregunta, respuesta, explicación, fuentes e ID del trabajo.
- `StudySession`: deck, orden de tarjetas, fechas, estado y valoraciones.
- `GenerationJob`: solicitud, deck, materiales, preferencias, estado y error.
  El usuario solo puede consultar sus trabajos; la creación y actualización
  quedan para el futuro backend de generación.

Los registros usan el `sub` del User Pool en `owner`. En los modelos editables,
el campo owner no puede reasignarse con una actualización. El frontend usa
Cognito User Pools. No hay API key pública ni autorización de lectura compartida.

S3 utiliza el **Identity Pool ID**, distinto del `sub`:

`materials/{identityId}/{deckId}/{materialId}.{extension}`

Solo esa identidad puede leer/escribir/borrar sus archivos. `shared/materials.ts`
construye la ruta y valida formatos/tamaños para el futuro uploader. Esas
validaciones no son una política S3: la función deberá comprobar los objetos
reales y su contenido antes de usarlos. Los límites iniciales de la demo son
20 MB por archivo, diez materiales por solicitud y hasta cincuenta tarjetas.
Se revisarán con el modelo elegido y el procesamiento de PDF.

La autorización por registro NO valida automáticamente que una FK pertenezca
al mismo usuario, y las relaciones NO hacen borrado en cascada. Cada operación
compuesta deberá verificar padre/hijos; usar `archived` para retirar un deck
hasta implementar la limpieza de registros y objetos. Una sesión conserva IDs
y valoraciones, no una copia histórica del texto de cada tarjeta.

## Solicitud desde la app

`shared/generation.ts` contiene el contrato Zod y sus tipos:

```json
{
  "deckId": "deck-1",
  "materialIds": ["material-1"],
  "requestId": "a21b5268-1403-43e8-9546-f989e4e50d53",
  "preferences": { "language": "es", "cardCount": 10, "focus": "conceptos clave" }
}
```

La solicitud no acepta `owner`, bucket, ruta S3 ni ARN. La identidad procede
del contexto autenticado del backend. `requestId` servirá para idempotencia;
la implementación futura debe garantizarla con escritura condicional, por
usuario, antes de lanzar una generación. El contrato por sí solo no lo garantiza.

## Implementación de la etapa 04

1. Añadir una mutación autenticada de Amplify Data y su Lambda, con permisos
   mínimos. Verificar el `sub` autenticado, leer el deck y todos los materiales,
   y comprobar propiedad, pertenencia al deck y estado `UPLOADED`.
2. Resolver rutas desde registros confiables y verificar prefijo privado,
   existencia, tamaño y tipo real de los objetos. No confiar en MIME o metadatos
   escritos por el navegador. Resolver de forma confiable la relación entre
   `sub` e Identity Pool ID.
3. Crear un trabajo idempotente con `owner` establecido por el backend.
   Devolver su ID y ejecutar la generación de forma asíncrona para no depender
   del tiempo límite de una petición de la interfaz. Elegir el disparador/cola
   cuando se implemente esta etapa.
4. El worker invoca AgentCore Runtime con los materiales autorizados. El agente
   Strands recibe acceso limitado a esos objetos. Definir herramientas S3 o
   enlaces de duración limitada y el procesamiento de PDF según el modelo.
5. El modelo multimodal de Bedrock interpreta fotos, diapositivas y páginas;
   el agente construye preguntas y verifica su fundamento en el material.
6. Validar la respuesta con `validateGenerationResult`, que exige estructura,
   referencias dentro de la solicitud autorizada, páginas para PDF, ausencia
   de preguntas idénticas normalizadas y un máximo de tarjetas. Esto no verifica
   semánticamente la respuesta ni detecta duplicados por significado.
7. Persistir tarjetas con el `owner` validado del trabajo. Hacer la persistencia
   reintentable sin tarjetas duplicadas ni resultados parciales visibles. Marcar
   el trabajo completado o fallido con un mensaje apto para el usuario.
8. La interfaz observa o consulta el trabajo y recarga las tarjetas. No debe
   generar tarjetas ficticias ante un error del agente.

## Configuración de esa etapa

El backend necesitará región, ARN del runtime, acceso al modelo multimodal y
permisos explícitos para invocar AgentCore, leer los objetos autorizados y
persistir resultados. Se configurarán en el backend de cada ambiente. No se
han concedido permisos amplios a S3, Bedrock o AgentCore por adelantado.

Pruebas pendientes al conectar servicios: aislamiento entre dos usuarios,
materiales de otro deck, rutas manipuladas, PDF inválidos, contenido no legible,
reintentos, solicitudes simultáneas, errores del modelo y persistencia parcial.
