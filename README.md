# Study Cards · Student Community Day

Demo de una app que convierte imágenes de pizarrones, apuntes, diapositivas y
PDF en tarjetas de estudio. Un deck contiene materiales, tarjetas y varias
sesiones de práctica.

React + TypeScript + Vite, React Router, Tailwind CSS, shadcn/ui y AWS Amplify
Gen 2, Strands Agents SDK, AgentCore Runtime y Amazon Nova 2 Lite en Bedrock.

## Estado

Base de Amplify con Auth por correo, Storage privado y modelos de decks,
materiales, tarjetas, sesiones y trabajos de generación. Layout responsivo con
colores y fuentes del evento. Registro, confirmación por correo, login,
recuperación de contraseña y creación/consulta de decks en Amplify Data.
Carga privada de imágenes y PDF con miniaturas, progreso y reintentos.

La etapa 04 implementa la generación asíncrona, el agente Strands con Nova 2 Lite
y la infraestructura de AgentCore. Una prueba real de Strands con Nova y un PDF
produjo tarjetas válidas; el despliegue de AgentCore y la prueba integral desde
la app siguen pendientes de permisos AWS. Las sesiones de práctica aún no están
implementadas.

El sandbox base ya fue desplegado por el usuario; los outputs son locales y no
se versionan. Ver [Auth y decks](docs/auth-and-decks.md),
[carga de materiales](docs/material-uploads.md) e
[integración del agente](docs/agent-integration.md) para las validaciones y los
requisitos antes de actualizar el sandbox.

## Desarrollo

Node.js 22.12 o superior dentro de la versión 22 y npm.

```bash
npm ci
npm run dev
```

El frontend requiere los outputs de un backend desplegado para abrir Auth y Data.
Sin ese archivo muestra un estado de configuración pendiente. Para abrir los
decks hay que registrarse, confirmar el correo e iniciar sesión.

### Acceso desde Tailscale

Con `npm run dev`, Vite escucha en todas las interfaces en el puerto `5173`,
incluidas la red local y Tailscale. Desde otro dispositivo conectado a la misma
red de Tailscale, abre cualquiera de estas direcciones de este equipo:

- <http://100.87.182.16:5173>
- <http://margarita.tail6e30f1.ts.net:5173> (MagicDNS)

El acceso habitual por <http://localhost:5173> sigue disponible.
Para revisar la compilación, ejecuta `npm run build` y `npm run preview` y usa
las mismas direcciones con el puerto `4173`.

Vite permite explícitamente los nombres `margarita` y
`margarita.tail6e30f1.ts.net`; las IP se aceptan por defecto. Si cambia el nombre
del equipo o la red de Tailscale, actualiza `server.allowedHosts` en
`vite.config.ts`. La vista previa hereda esa lista. Los puertos son fijos: si
están ocupados, el servidor avisa y termina. El acceso depende de que las reglas
de Tailscale y el firewall del equipo permitan el puerto correspondiente.

## Comprobaciones

```bash
npm run check
npm run synth:backend
npm run build
```

- `check`: lint, tipos de frontend/backend/agente/contratos y pruebas.
- `synth:backend`: genera plantillas locales sin desplegar recursos.
- `build`: genera `dist/` para revisar el frontend local.
- `build:hosting`: exige configuración de Auth, Data y Storage antes de compilar.
- `preview`: sirve la compilación local.
- `sandbox`: crea/actualiza un backend AWS de desarrollo y observa cambios.
- `sandbox:once`: despliega el sandbox una vez.
- `amplify:outputs`: descarga configuración de un backend de rama existente.

## Estructura

- `amplify/`: backend Gen 2.
- `agent/`: agente Strands que se empaqueta para AgentCore Runtime.
- `src/lib/amplify.ts`: configuración desde `amplify_outputs.json`.
- `src/lib/data.ts`: cliente de datos tipado, creado al necesitarlo.
- `shared/`: contratos de generación y validaciones de materiales.
- `tests/`: pruebas de contratos, referencias y rutas de materiales.
- `hosting/`: configuración de rutas para Hosting.
- `docs/`: decisiones, etapas y despliegue.

## Documentación del proyecto

- [Despliegue](docs/deployment.md).
- [Etapas y ramas](docs/development-stages.md).
- [Integración del agente](docs/agent-integration.md).
- [Referencia visual del evento](docs/design-reference.md).

El `spec.md` de reproducción se escribirá al terminar la app para documentar
el resultado real y permitir intentar replicarlo con un solo prompt.
