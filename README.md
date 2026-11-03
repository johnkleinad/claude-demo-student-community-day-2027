# Study Cards · Student Community Day

Demo de una app que convierte imágenes de pizarrones, apuntes, diapositivas y
PDF en tarjetas de estudio. Un deck contiene materiales, tarjetas y varias
sesiones de práctica.

React + TypeScript + Vite, React Router, Tailwind CSS, shadcn/ui y AWS Amplify
Gen 2. Bedrock, Strands y AgentCore se integrarán en una etapa posterior.

## Estado

Etapa 01: infraestructura preparada para desplegar. Auth por correo, Storage
privado y modelos de decks, materiales, tarjetas, sesiones y trabajos de
generación. La pantalla actual es un scaffold. El diseño responsivo se construirá
junto al usuario, tomando como referencia el sitio del evento.

Todavía no hay pantallas de autenticación, carga real de archivos, generación
por IA ni sesión de práctica. No se han desplegado recursos AWS.

## Desarrollo

Node.js 22.12 o superior dentro de la versión 22 y npm.

```bash
npm ci
npm run dev
```

El frontend funciona sin AWS para construir el layout. Las operaciones de datos
requieren los outputs de un backend desplegado y un usuario autenticado.

## Comprobaciones

```bash
npm run check
npm run synth:backend
npm run build
```

- `check`: lint, tipos de frontend/backend/contratos y pruebas.
- `synth:backend`: genera plantillas locales sin desplegar recursos.
- `build`: genera `dist/` para revisar el frontend local.
- `build:hosting`: exige configuración de Auth, Data y Storage antes de compilar.
- `preview`: sirve la compilación local.
- `sandbox`: crea/actualiza un backend AWS de desarrollo y observa cambios.
- `sandbox:once`: despliega el sandbox una vez.
- `amplify:outputs`: descarga configuración de un backend de rama existente.

## Estructura

- `amplify/`: backend Gen 2.
- `src/lib/amplify.ts`: configuración desde `amplify_outputs.json`.
- `src/lib/data.ts`: cliente de datos tipado, creado al necesitarlo.
- `shared/`: contratos de generación y validaciones de materiales.
- `tests/`: pruebas de contratos, referencias y rutas de materiales.
- `hosting/`: configuración de rutas para Hosting.
- `docs/`: decisiones, etapas y despliegue.

## Documentación del proyecto

- [Despliegue](docs/deployment.md).
- [Etapas y ramas](docs/development-stages.md).
- [Integración futura del agente](docs/agent-integration.md).
- [Referencia visual del evento](docs/design-reference.md).

El `spec.md` de reproducción se escribirá al terminar la app para documentar
el resultado real y permitir intentar replicarlo con un solo prompt.
