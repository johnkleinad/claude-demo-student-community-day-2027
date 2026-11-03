# Generación con AgentCore y Bedrock, etapa 04

## Estado

Rama `feat/04-agentcore-generation`. Implementados frontend, mutación autenticada,
funciones, agente Strands y definición de infraestructura. La síntesis es local;
esta etapa todavía no se ha desplegado ni verificado de extremo a extremo en AWS.

Comprobaciones de cuenta realizadas el 3 de noviembre de 2026, con `student-cd`
en `us-east-1`:

- STS confirmó una sesión válida.
- Bedrock confirmó el perfil de Amazon Nova 2 Lite `us.amazon.nova-2-lite-v1:0`,
  con destinos `us-east-1`, `us-east-2` y `us-west-2`.
- Una invocación mínima real de Converse con Nova 2 Lite devolvió `OK`.
- Una prueba real de Strands con Nova 2 Lite y un PDF sintético generó dos
  tarjetas. La salida estructurada y sus referencias a la página 1 pasaron
  `validateGenerationResult`. Esta prueba llamó a Bedrock directamente desde
  el entorno de desarrollo; todavía no prueba el despliegue AgentCore.
- `ListAgentRuntimes` fue rechazado porque el rol de SSO no tiene ese permiso.
  No se intentó cambiar el permission set ni conceder permisos al propio rol.

## Flujo implementado

1. El usuario selecciona materiales guardados, cantidad (1–50), idioma (es/en)
   y enfoque opcional. La app llama a `generateCards(request)` con Cognito.
2. La Lambda obtiene el `sub` del contexto AppSync. No acepta propietario,
   bucket, ruta ni ARN en la solicitud. Resuelve el Identity Pool ID mediante
   `GetId` usando el JWT autenticado y los pools del ambiente.
3. Lee deck y materiales con consistencia fuerte y comprueba propietario,
   pertenencia, estado UPLOADED y ruta privada exacta. Genera un ID SHA-256
   por usuario/requestId y una huella de los parámetros normalizados.
4. Una transacción crea GenerationJob QUEUED y un bloqueo temporal por
   usuario/deck. Un requestId repetido con los mismos parámetros devuelve el
   mismo trabajo. Una respuesta ambigua se recupera consultando ese ID.
5. DynamoDB Streams entrega el INSERT al worker. Este toma un lease condicional
   y renueva el bloqueo del deck en una transacción; repeticiones de eventos
   no vuelven a ejecutar un trabajo terminado o con un lease vigente.
6. El worker vuelve a validar deck, materiales y rutas, descarga los objetos
   reales, comprueba tamaño, MIME, firma, dimensiones de imágenes y páginas PDF.
   Invoca AgentCore con un manifiesto pequeño que incluye ETags.
7. AgentCore ejecuta el agente Strands en Node 22 mediante despliegue de ZIP,
   protocolo HTTP, `/ping` y `/invocations` en 8080. Descarga exclusivamente las
   rutas del manifiesto, con `IfMatch` para rechazar objetos que hayan cambiado,
   y vuelve a validar su contenido. No acepta URL externas ni usa herramientas
   de navegación o ejecución de código.
8. Bedrock recibe imágenes y documentos PDF con Amazon Nova 2 Lite. Las fuentes
   y páginas se devuelven en el esquema de tarjetas; no se activa el parámetro
   de citas nativas de documentos de otros proveedores.
   Un agente nuevo por invocación evita compartir conversación entre trabajos.
   Se limita el tiempo, número de turnos y tokens. El prompt pide verificar
   las respuestas y tratar las instrucciones incrustadas como datos.
9. Strands devuelve el esquema Zod. El worker vuelve a validar formato,
   cantidad, fuentes autorizadas, páginas y preguntas normalizadas repetidas.
10. Una transacción guarda todas las Flashcard, completa GenerationJob y libera
    el deck. Si falla la transacción no se publica un conjunto parcial. Los IDs
    de tarjetas se derivan del trabajo y su posición. Las tarjetas son de solo
    lectura para clientes; los trabajos también.
11. La interfaz consulta el estado cada cuatro segundos durante el trabajo y
    mientras espera la propagación de los índices. Solo muestra tarjetas de
    trabajos COMPLETED. Las consultas recorren páginas y rechazan errores
    parciales. No depende de suscripciones, porque las escrituras transaccionales
    directas a DynamoDB no generan eventos de suscripción AppSync.

## Infraestructura y permisos

`amplify/generation/infrastructure.ts` añade recursos al stack de Data, conserva
los recursos existentes y conecta las funciones definidas con Amplify. El ZIP
se empaqueta con esbuild, incluyendo dependencias JavaScript sin binarios nativos;
el hash del artefacto incluye el resultado compilado y sus imports compartidos.

- Mutación pública solo para usuarios autenticados; Runtime requiere SigV4 IAM.
  El navegador no recibe permiso para invocar AgentCore directamente.
- Roles separados para solicitud, worker y Runtime. Lectura de las tablas
  necesarias, escrituras específicas y acceso S3 limitado a `materials/*`.
- El Runtime puede invocar solo el perfil configurado y el modelo en sus tres
  regiones de destino. La inferencia puede salir de `us-east-1` dentro de EE. UU.
- Endpoint `demo`, red PUBLIC para esta demo, sin acceso anónimo. La comunicación
  cliente pasa por el servicio AgentCore autenticado.
- Logs del Runtime con KMS y retención de dos semanas; las funciones también
  retienen logs dos semanas. Los logs propios no contienen prompts, archivos,
  tokens ni respuestas del modelo; registran IDs de trabajo y tipos de error.
- GenerationControl usa TTL, y los bloqueos se comprueban por su vencimiento,
  sin depender de la eliminación eventual del TTL.
- Worker de hasta 10 minutos, agente de hasta 8 minutos, lease de 11 minutos y
  bloqueo renovado de 20 minutos. Stream con lote de 1, hasta 20 reintentos,
  antigüedad máxima de cuatro horas y cola de fallos cifrada por SQS.
- Un evento que perdió su bloqueo no vuelve a invocar el agente ni libera el
  bloqueo de una solicitud nueva. La interfaz permite consultar o generar
  nuevamente si el trabajo supera 20 minutos sin actualizarse.

La base de permisos se revisó con IAM Policy Autopilot, sin subir políticas:

```bash
uvx iam-policy-autopilot@latest generate-policies \
  amplify/generation/request/handler.ts \
  amplify/generation/worker/handler.ts \
  amplify/generation/store.ts agent/runtime.ts \
  --region us-east-1 --account 267524937908 --pretty
```

El análisis estático genera una base amplia cuando las tablas/buckets proceden
de variables de ambiente. CDK la restringe a recursos del ambiente; las llamadas
indirectas de Strands y permisos de operación del Runtime requieren revisión
adicional. No se adjuntó una política administrativa a las funciones.

## Límites de esta demo

Storage sigue admitiendo archivos de 20 MiB. Para generación se aplican límites
menores: 10 materiales, hasta 5 imágenes de 3.75 MiB y 8000 × 8000 píxeles, hasta
5 PDF de 4.5 MiB cada uno, entre 1 y 100 páginas por PDF y 20 MiB totales.
Los límites se validan antes de invocar al agente; un modelo puede imponer
restricciones adicionales. No se comprimen imágenes ni se dividen PDF automáticamente.

La inspección de imágenes comprueba firma y dimensiones, no una decodificación
completa de todos los píxeles. La generación no garantiza que el modelo lea
correctamente todo el contenido. La revisión semántica es una instrucción al
agente; el validador determinista solo comprueba estructura y referencias.
No se hace deduplicación semántica ni entre distintas generaciones del deck.
Una generación nueva añade tarjetas y no reemplaza las existentes.

La cola de selección sigue siendo local al deck. Una vez creado el trabajo,
su procesamiento continúa en AWS aunque el usuario salga o cierre sesión.
La cancelación del trabajo remoto y las sesiones de práctica quedan fuera de
esta etapa. La cola de fallos requiere revisión operativa; no se reenvían trabajos
indefinidamente ni se oculta un fallo como generación exitosa.

## Despliegue pendiente

Antes de ejecutar el sandbox, habilitar los permisos de despliegue AgentCore en el permission set
SSO y en el rol de CloudFormation usado por Amplify. Esta etapa incorpora
`AWS::BedrockAgentCore::Runtime` y `RuntimeEndpoint`, sus roles, políticas,
artefactos S3, logs/KMS, una tabla de control y una cola de fallos. El rol de
Hosting también necesitará poder desplegar esos recursos cuando se publique.
No basta con permitir solo `ListAgentRuntimes`.

Para el desarrollador: consultar runtimes/endpoints y permitir una invocación
contra el runtime de esta demo. Para el runtime: Bedrock y lecturas S3 ya se
conceden desde CDK. Revisar los alcances con el administrador de la cuenta;
no es necesario dar `bedrock:*` o `bedrock-agentcore:*` al navegador.

Con la misma identidad de sandbox usada anteriormente:

```bash
npm run check
npm run synth:backend
npm run sandbox -- --profile student-cd
```

Conservar el identificador del sandbox existente si se usó uno personalizado.
Al terminar, los outputs incluirán `custom.generation` con los ARN del Runtime
y del endpoint y el modelo Nova configurado. Reiniciar Vite para cargar los outputs nuevos. La interfaz informa
que hay que actualizar el sandbox si los outputs aún no contienen la mutación.

Verificar que Runtime y endpoint `demo` estén READY, hacer una generación real
con una imagen clara y otra con un PDF pequeño, recargar las tarjetas y comprobar
las fuentes. Probar otra cuenta sin acceso a los registros/objetos anteriores,
materiales de otro deck, archivos manipulados, solicitudes simultáneas y fallos.
Una síntesis o una prueba simulada no sustituye estas verificaciones.

## Validación local

`npm run check` cubre lint y tipos del frontend, backend, agente y contratos,
además de pruebas unitarias de Auth, subida y generación. Las nuevas pruebas
cubren propiedad, rutas, reserva idempotente, reservas ambiguas, leases,
exclusión por deck, transacciones de guardado, PDF real, límites y rechazo de
resultados inválidos. `npm run build` compila la aplicación de producción.
También se arrancó el artefacto CommonJS sintetizado en un puerto local de prueba:
respondió correctamente a `/ping`, rechazó una invocación inválida y devolvió
404 para rutas desconocidas, sin hacer llamadas AWS.

La revisión de navegador con AWS simulado cubrió selección, preferencias,
QUEUED/PROCESSING/COMPLETED, tarjetas y fuentes, recarga, fallos sin tarjetas
ficticias, respuesta de solicitud perdida, errores de consulta y anchos de
320, 360, 390, 768 y 1440 px. El esquema de cliente de esa prueba se tomó de la
síntesis; los outputs reales del sandbox no se modificaron.

Referencias: [Node.js directo en AgentCore](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-get-started-code-deploy-node.html),
[permisos AgentCore](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-permissions.html),
[InvokeAgentRuntime](https://docs.aws.amazon.com/bedrock-agentcore/latest/APIReference/API_InvokeAgentRuntime.html),
[Streams con Amplify](https://docs.amplify.aws/react/build-a-backend/functions/examples/dynamo-db-stream/),
[salida estructurada de Strands](https://strandsagents.com/docs/user-guide/sdk/agents/structured-output/).
