# Referencia visual del evento

Fuente: https://studentcommunitydaymexico.com/en
Inspección de HTML y CSS público del sitio, 2026-11-02.

El usuario pidió tomar su diseño, colores y fuentes como referencia. La interfaz
se construirá con sus descripciones; esta captura de tokens no fija el layout.
No se han sustituido todavía los estilos de la app.

## Tipografías verificadas

- Títulos: **Pixelify Sans** (`--font-pixelify`).
- Texto y monoespaciada: **Share Tech Mono** (`--font-share-tech`).

## Tokens del sitio

| Rol | Valor |
| --- | --- |
| Fondo base | `#0E0E1A` |
| Superficie | `#1E1838` |
| Segunda superficie | `#2A1F5E` |
| Primario | `#422B78` |
| Secundario | `#613BB8` |
| Terciario | `#7B3FA6` |
| Acento | `#C143BC` |
| Magenta | `#C026A1` |
| Acción destacada | `#D85A30` |
| Cian | `#3DD6D0` |
| Enlace | `#378ADD` |
| Error | `#E24B4A` |
| Texto principal | `#E6E4DA` |
| Texto secundario | `#B4B2A9` |
| Texto atenuado | `#73726C` |
| Borde | `#2C2550` |

El sitio usa radios de 4, 6, 8, 12 y 16 px y espaciado de 4, 8, 12, 16, 24,
32, 48 y 64 px. Estos valores son una referencia; la legibilidad de preguntas
y respuestas, el contraste y los controles táctiles se comprobarán al construir
cada pantalla. Los estados no dependerán exclusivamente del color.

## Requisitos de implementación

- Empezar por móvil y adaptar a tablet y escritorio.
- Verificar 360 px, 768 px y 1440 px, además de zoom al 200%.
- Evitar scroll horizontal en navegación, tarjetas y carga de materiales.
- Navegación por teclado, foco visible y reducción de movimiento.
- Mantener texto de estudio legible y controles táctiles cómodos.
- Implementar estados vacíos, carga, error, éxito y reintento según cada flujo.
