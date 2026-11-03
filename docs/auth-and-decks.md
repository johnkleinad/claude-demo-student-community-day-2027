# Auth y decks conectados, etapa 03

## Implementado

La app requiere iniciar sesión para abrir la colección o un deck. Usa las APIs
cliente de Amplify Auth y los recursos existentes en `amplify_outputs.json`.
El backend añade el modelo `UserProfile` y un trigger `postConfirmation`;
estos cambios requieren desplegar el backend y regenerar los outputs.

- Registro con nombre de usuario obligatorio, correo y contraseña, con los requisitos del pool desplegado.
- Confirmación de correo con código y reenvío con espera de 60 segundos.
- Inicio de sesión, restauración/renovación mediante Amplify y cierre de sesión.
- Recuperación y cambio de contraseña con código.
- Cambio obligatorio de contraseña temporal si Cognito lo solicita. Otros retos
  de MFA muestran una explicación: el pool actual no usa MFA y su UI no se ha añadido.
- Regreso a una ruta interna después de entrar, sin redirecciones externas.
- Limpieza de la vista al cerrar sesión, vencer la sesión o cambiarla en otra pestaña.
- Perfil de usuario creado por el backend al confirmar un registro nuevo.

## Perfil después de confirmar el correo

`amplify/auth/post-confirmation/` contiene el trigger de Cognito. Crea un registro
`UserProfile` con `id = sub` y `owner = sub`, correo, nombre obligatorio y el estado
`email_verified` recibido de Cognito. El esquema está en
`amplify/data/models/user-profile.ts`. El navegador solo puede consultar su
propio perfil; no puede crearlo, modificarlo, reasignarlo o borrarlo.

El formulario recoge «Nombre de usuario» (hasta 80 caracteres) y lo envía como
atributo estándar `name` de Cognito. El trigger toma ese atributo y lo guarda en
`UserProfile.name`. El login sigue usando el correo: no se cambia el identificador
interno `username` del pool existente. El trigger rechaza crear perfiles nuevos
sin un nombre válido. Las cuentas antiguas pendientes de confirmación que no
tengan `name` necesitan completar ese atributo antes de confirmar con este trigger.

El trigger usa el cliente de Amplify con IAM. Amplify concede acceso a funciones
a nivel de API, y aquí se limita a operaciones de consulta y mutación; no se
conceden suscripciones. La función se agrupa con Auth para evitar dependencias
circulares y su configuración se genera por ambiente, sin IDs o endpoints fijos.

Solo procesa `PostConfirmation_ConfirmSignUp`. Ignora los eventos de recuperación
de contraseña y `clientMetadata`. Comprueba si existe el perfil antes de crearlo;
si hay un error de escritura, solo acepta el resultado como exitoso cuando logra
leer el registro con el mismo ID y propietario. El ID único evita duplicados en
reintentos concurrentes. No sobrescribe perfiles existentes ni registra datos
personales en logs.

Si el aprovisionamiento falla, devuelve un error. Cognito puede haber confirmado
ya la cuenta, por lo que el fallo debe investigarse y el perfil repararse desde
el backend. No se debe asumir que volver a confirmar ejecutará siempre el trigger.
Las cuentas confirmadas antes de desplegar este cambio tampoco reciben el perfil
automáticamente: necesitan un aprovisionamiento retroactivo controlado.

Para aplicar el cambio al sandbox existente, ejecutar el sandbox con el mismo
perfil e identificador usados para crearlo. Cuando termine, reiniciar Vite para
usar los outputs actualizados. Verificar un registro nuevo, su confirmación, un
único `UserProfile` con el `sub` correcto y que otra cuenta no pueda consultarlo.

Las contraseñas y los códigos viven únicamente en el formulario. La app no los
escribe en almacenamiento ni los registra en logs. El SDK de Amplify administra
los tokens, su almacenamiento estándar y su renovación. El refresh de una pantalla
no requiere volver a entrar si la sesión sigue válida.

## Amplify Data

`deck-repository.ts` implementa creación y consulta de decks. La consulta recorre
las páginas y ordena los resultados. No muestra decks archivados. Los errores
GraphQL se tratan como errores aunque exista data parcial.

La creación espera la respuesta antes de navegar, bloquea envíos repetidos y
conserva el formulario ante un fallo. No envía `owner` desde la interfaz: el backend
lo asigna y autoriza usando el `sub` de Cognito según el esquema ya desplegado.
Los colores se derivan de cada ID, sin añadir campos al esquema.

Los decks locales de la etapa 02 no se importan ni se borran. El almacenamiento
`community-study.layout-decks.v1` ya no se lee. Los decks nuevos se guardan en la
cuenta autenticada y pueden consultarse desde otro dispositivo.

## Rutas

- `/auth/sign-in`, `/auth/sign-up`, `/auth/confirm`.
- `/auth/reset`, `/auth/new-password`, `/auth/set-password`.
- `/` y `/decks/:deckId` son privadas. `/decks/new` abre la creación.

La carga inicial, los errores de conexión y los reintentos tienen estados visibles.
Un error no se presenta como una colección vacía ni como un deck inexistente.

## Verificación

Las pruebas del repositorio comprueban paginación, archivado, errores parciales,
cursor repetido, validación, propiedad asignada por backend y colores estables.
Las pruebas de Auth comprueban destinos de regreso y errores sin filtrar mensajes
internos. Las pruebas de navegador usan respuestas simuladas de Cognito y AppSync,
sin enviar correos ni crear recursos AWS.

Las pruebas del trigger cubren creación, reintentos, confirmaciones concurrentes,
eventos de recuperación, atributos ausentes, correo no verificado, propietarios
inconsistentes y fallos reales de persistencia. La síntesis comprueba el modelo,
la Lambda y su conexión con Cognito; no equivale a desplegar el cambio.

Pendiente: prueba completa con el sandbox y dos usuarios reales de prueba para
verificar autorización en AWS después de actualizar el backend. La sesión CLI
del perfil `student-cd` ya fue renovada y comprobada con STS. El acceso frontend
a Cognito no usa las credenciales CLI del desarrollador.

## Próximo paso

Carga de imágenes y PDF a Storage y creación de registros Material privados por
usuario. La generación con AgentCore/Bedrock y las sesiones de práctica siguen
para las etapas posteriores.
