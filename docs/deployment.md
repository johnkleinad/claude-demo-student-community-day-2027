# Despliegue con Amplify Hosting

## Preparación incluida

- Backend Gen 2 con Auth, Data y Storage privado.
- `amplify.yml`: instalación reproducible, comprobaciones, despliegue del backend
  de la rama y compilación de Vite en `dist/`.
- `hosting/rewrites.json`: regla para abrir/recargar rutas de React Router.
- `build:hosting` exige outputs de Auth, Data y Storage. Un despliegue no debe
  publicar silenciosamente una app sin conexión a su backend.
- `scripts/synth-backend.ts`: síntesis local para validar los recursos, usando
  una cuenta ficticia solo en la plantilla local. No es un comando de despliegue.

## Desarrollo con sandbox

Usar Node.js 22.12 o superior dentro de la versión 22 y credenciales AWS con
permisos para el sandbox. El perfil y la región del proyecto aún no están
confirmados. No reutilizar perfiles de otros proyectos por defecto.

```bash
npm ci
npm run check
npm run synth:backend
npm run sandbox -- --profile TU_PERFIL
```

El perfil debe tener configurada la región elegida. El sandbox crea recursos
reales, observa cambios y genera `amplify_outputs.json` en la raíz. En otra terminal:

```bash
npm run dev
```

Reiniciar Vite cuando se genere/cambie el archivo de outputs. Para desplegar una
sola vez sin observación, usar `npm run sandbox:once -- --profile TU_PERFIL`.

## Hosting con GitHub

1. Integrar la etapa aprobada en `main` y subirla a
   `johnkleinad/claude-demo-student-community-day-2027`.
2. En Amplify Hosting de la cuenta y región elegidas, conectar GitHub y autorizar
   el repositorio. Conectar `main` como rama estable. Requiere la instalación de
   GitHub de Amplify; la configuración local no crea esa conexión.
3. Usar plataforma web estática/SPA y el `amplify.yml` del repositorio, con imagen
   de compilación que disponga de Node 22. Configurar el rol de servicio de
   Amplify con permisos para desplegar el backend Gen 2. Consultar las instrucciones
   oficiales para el rol de la cuenta; no se ha creado un rol desde este repo.
4. En **Hosting → Rewrites and redirects**, añadir la regla de
   `hosting/rewrites.json`. El archivo es una plantilla para la configuración
   del servicio: Amplify NO lo aplica por estar versionado. Evitar reglas previas
   que redirijan todas las rutas antes de esta regla.
5. Ejecutar el build. La fase backend corre `ampx pipeline-deploy`, que genera
   los outputs de ese ambiente. Luego `build:hosting` comprueba los recursos y
   compila el frontend con ellos.
6. Verificar la URL de la app y abrir directamente `/decks/new`, además de recargarla.
   Comprobar que CSS, fuentes e imágenes se sirven como archivos, no como HTML.
7. En la etapa 03, completar las pruebas reales de registro, confirmación por
   correo, login, aislamiento entre dos usuarios, carga y lectura privada de
   materiales y persistencia de un deck. Esas pantallas aún no están implementadas.

No pegar claves AWS en variables `VITE_*`; sus valores se incluyen en el bundle.
Los outputs públicos de Amplify no son credenciales. Las claves/configuración
privadas del agente pertenecerán al backend.

## Usar un backend de rama desde el entorno local

Si ya existe un despliegue de rama, descargar su configuración en lugar de crear
un sandbox:

```bash
npm run amplify:outputs -- --app-id TU_APP_ID --branch main --profile TU_PERFIL
npm run dev
```

No versionar `amplify_outputs.json`. Para cambiar de ambiente hay que volver a
obtener los outputs y reiniciar Vite. El build de Hosting los obtiene desde su
propia fase de backend, no desde el archivo de otro desarrollador.

## Alcance y pendientes

Esta etapa prepara el despliegue; no crea la app de Hosting, conecta GitHub,
publica una rama ni despliega recursos reales. El frontend actual es el scaffold
inicial; las pantallas y el flujo de usuario se construirán junto al usuario.
Al retirar una rama/ambiente, revisar primero sus datos: los recursos se administran
por ambiente y la eliminación del storage puede borrar sus objetos.

## Referencias

- https://docs.amplify.aws/react/deploy-and-host/amplify-hosting/
- https://docs.amplify.aws/react/reference/cli-commands/
- https://docs.amplify.aws/react/build-a-backend/storage/set-up-storage/
- https://docs.amplify.aws/react/build-a-backend/data/customize-authz/per-user-per-owner-data-access/
- https://docs.aws.amazon.com/amplify/latest/userguide/redirect-rewrite-examples.html
