# claude-demo-student-community-day-2027

Proyecto creado con Vite, React y TypeScript.

## Requisitos

- Node.js 22.12 o superior (se recomienda Node.js 22 LTS).
- npm.

## Desarrollo

```bash
npm install
npm run dev
```

Abre la dirección que indique Vite en la terminal.

## Comandos

- `npm run dev`: inicia el servidor de desarrollo.
- `npm run build`: comprueba TypeScript y genera la compilación en `dist/`.
- `npm run lint`: analiza el código con Oxlint.
- `npm run preview`: permite revisar la compilación localmente después de `npm run build`.

## Subir a GitHub

Este repositorio ya tiene configurado el remoto `origin`:
`git@github.com:johnkleinad/claude-demo-student-community-day-2027.git`.

Desde esta carpeta, con acceso SSH a tu cuenta de GitHub:

```bash
git add .
git commit -m "Inicializa Vite con React y TypeScript"
git push -u origin main
```

El archivo `.gitignore` excluye dependencias, compilaciones, variables de entorno y configuración local. El archivo `package-lock.json` se incluye para reproducir la instalación; en CI puedes usar `npm ci`.
