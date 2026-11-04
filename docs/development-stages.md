# Etapas de desarrollo

## Decisiones confirmadas

- Una app para estudiantes que convierte fotos de pizarrones, apuntes,
  diapositivas y PDF en tarjetas de estudio.
- Un deck contiene materiales y tarjetas. Un mismo deck tiene varias sesiones
  de práctica, cada una con su progreso e historial.
- El layout se construye junto al usuario, pantalla por pantalla según sus
  descripciones. La propuesta anterior de pantallas es exploratoria.
- La app debe adaptarse a móvil, tablet y escritorio.
- Colores y fuentes inspirados en https://studentcommunitydaymexico.com/en.
- React, TypeScript, React Router, Tailwind y shadcn/ui en el frontend.
- Amplify Gen 2 para Auth, Storage, Data, funciones y Hosting.
- En una etapa posterior: Lambda invoca AgentCore Runtime, con un agente
  Strands y un modelo multimodal de Amazon Bedrock.

## Ramas por etapa

| Etapa | Rama | Resultado |
| --- | --- | --- |
| 01 | `feat/01-amplify-foundation` | Stack base, Auth, Data, Storage privado, build de Hosting, contratos y pruebas locales. |
| 02 | `feat/02-responsive-layout` | Interfaz construida con el usuario, identidad visual del evento y estados responsivos. |
| 03 | `feat/03-materials-and-decks` | Registro/inicio de sesión, perfiles y creación/consulta de decks privados. |
| 03b | `feat/03b-material-uploads` | Selección, vista previa, carga privada de imágenes/PDF y registros Material con reintentos. |
| 04 | `feat/04-agentcore-generation` | Integración y UI implementadas; verificadas localmente. Amazon Nova 2 Lite responde en Bedrock. Despliegue y prueba completa pendientes de permisos AgentCore. |
| 05 | `feat/05-study-sessions` | Práctica de tarjetas, reanudación e historial de sesiones. |
| 06 | `docs/06-reproduction-spec` | `spec.md` final que describa el resultado real para reproducirlo con un solo prompt. |

La etapa 01 incluye también el scaffold del stack realizado antes de definir
la temática. Ya existen las ramas 01, 02, 03, 03b y 04. Cada etapa parte del último
trabajo validado; si la etapa anterior aún no está integrada en `main`, su rama
sirve de base para conservar la secuencia.
`main` mantiene la versión estable. No se fusiona ni publica una etapa sin
verificarla. Los nombres se pueden ajustar si cambia el alcance.

## Despliegues por rama

Git y Amplify Hosting son configuraciones separadas: crear una rama local no
crea un ambiente cloud. Conectar cada rama a Hosting aprovisiona su backend
independiente. Para esta demo, desplegar `main` como ambiente estable y conectar
ramas adicionales solo cuando se necesite una vista previa con su propio backend.

## Spec final

Todavía no se escribe `spec.md`: debe describir lo construido, no una propuesta.
Estas notas conservan las decisiones para prepararlo al cerrar el desarrollo.
El spec incluirá propósito, stack y versiones, rutas, layout y comportamiento
responsivo, tokens visuales, entidades y autorización, carga de materiales,
contrato del agente, estados de error/progreso, sesiones de práctica, despliegue,
pruebas y criterios de aceptación. Identificará qué necesita credenciales,
acceso a modelos y configuración externa para reproducirse.
