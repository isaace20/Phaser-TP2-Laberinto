# GDD — Laberinto Cuadrado

## 1. Ficha del juego

| Campo | Descripción |
|---|---|
| **Título** | Laberinto Cuadrado |
| **Género** | Laberinto / Exploración / Puzzle ligero |
| **Plataforma** | Web (navegador) |
| **Motor / Tecnología** | Phaser 3 (solo Phaser, sin assets externos) |
| **Arte** | Solo formas cuadradas: jugador, paredes, salida y decoración son cuadrados/rectángulos |
| **Jugadores** | 1 |
| **Duración por partida** | 5–15 minutos |
| **Objetivo** | Encontrar la salida de cada laberinto explorando |

### Logline

> Eres un cuadrado atrapado en laberintos cada vez más grandes. Muevete, explora callejones sin salida y encuentra la única salida antes de perderte.

## 2. Visión y pilares

### Pilares de diseño

1. **Solo cuadrados:** todo el mundo del juego se dibuja con formas cuadradas de Phaser (`Graphics` / `Rectangle`). Sin sprites, sin imágenes, sin Tilemap de Tiled.
2. **Explorar para avanzar:** el jugador no ve la salida desde el inicio (sobre todo en el nivel 3); tiene que recorrer, equivocarse y descartar caminos.
3. **Dificultad por tamaño y bifurcaciones:** la dificultad crece por cantidad de celdas, caminos falsos y callejones sin salida, no por obstáculos de acción.

### Lo que NO es este juego

- No es un plataformas (sin gravedad, sin saltos).
- No hay enemigos, disparos ni temporizador obligatorio para perder.
- No hay assets externos: todo se genera por código.

## 3. Core loop

```text
Inicio de nivel → Explorar el laberinto → Tomar bifurcaciones
→ Llegar a callejones sin salida / retroceder → Encontrar la salida
→ Pasar al siguiente nivel → … → Completar el Nivel 3 → Pantalla de victoria
```

## 4. Controles y reglas

### Controles

| Acción | Tecla |
|---|---|
| Moverse | Flechas del teclado y/o `W A S D` |
| Reiniciar nivel | `R` |
| Volver a empezar desde el Nivel 1 | `Esc` (opcional) |

Movimiento continuo en 4 direcciones con física Arcade **top-down** (`gravity.y = 0`). El jugador es un cuadrado que no atraviesa paredes cuadradas.

### Reglas principales

- El jugador aparece siempre en la celda inicial (esquina superior izquierda del laberinto).
- La salida es un cuadrado de color distinto, ubicado en una celda alejada (esquina inferior derecha o posición lejana equivalente).
- Solo se gana un nivel al tocar el cuadrado de salida.
- Las paredes bloquean el movimiento (colisión).
- El jugador puede retroceder por el camino andado las veces que necesite; no hay penalidad por equivocarse, solo tiempo/pasos.
- `R` reinicia el nivel actual y vuelve al punto inicial.

### Información para el jugador (feedback)

- **Pasos:** contador de celdas/distancia recorrida.
- **Tiempo:** cronómetro del nivel.
- **Nivel actual:** texto visible (`Nivel 1/3`).
- **Mensaje de victoria del nivel:** “¡Salida encontrada!” y avance automático o con tecla `Enter`.
- **Pantalla final:** tiempo total, pasos totales y mensaje de victoria.

## 5. Elementos del juego (todos cuadrados)

| Elemento | Forma | Color sugerido | Función |
|---|---|---|---|
| Jugador | Cuadrado sólido ~24×24 px | Blanco / amarillo `#FFD166` | Personaje controlable |
| Pared | Cuadrado de celda completa | Gris oscuro `#2B2D42` | Bloquea el paso |
| Suelo / camino | Cuadrado de celda | Gris claro `#EDF2F4` | Zona transitable |
| Salida | Cuadrado sólido parpadeante | Verde `#06D6A0` | Objetivo del nivel |
| Inicio | Cuadrado con borde | Azul `#118AB2` | Punto de aparición |
| Camino recorrido (opcional) | Cuadrado semitransparente | Color suave | Ayuda visual de exploración |
| Fondo | Rectángulo completo | Negro `#0B0B0F` | Separación con el laberinto |

La salida parpadea levemente (escala o alpha) para que sea reconocible **cuando el jugador la vea**, pero no debe verse desde el inicio en los niveles grandes.

## 6. Diseño de niveles

### Generación y estructura común

- Cada nivel es una **grilla de celdas** (ancho × alto, números impares).
- Las celdas se representan con cuadrados de **32×32 px**.
- El laberinto se genera por código, sin archivos externos. Algoritmo recomendado: **DFS / Recursive Backtracker** sobre la grilla, que garantiza un único camino de solución entre inicio y salida.
- Se garantiza:
  - Inicio y salida conectados por al menos un camino válido.
  - Al menos una bifurcación a partir del Nivel 1.
  - Callejones sin salida deliberados, especialmente en Niveles 2 y 3.

| Nivel | Nombre | Tamaño (celdas) | Tamaño en px | Cámara |
|---|---|---|---|---|
| 1 | Primeros pasos | 15 × 15 | 480 × 480 | Fija (todo visible) |
| 2 | Bifurcaciones | 21 × 21 | 672 × 672 | Fija (todo visible) |
| 3 | El gran laberinto | 31 × 31 | 992 × 992 | Seguidora (sigue al jugador) |

> La resolución del juego es 720×720 (`main.js`). Los Niveles 1 y 2 caben en pantalla; el Nivel 3 es más grande que la pantalla y requiere cámara que sigue al jugador para obligar a **explorar** en lugar de ver la salida de un vistazo.

### Nivel 1 — “Primeros pasos” (chico)

**Objetivo:** aprender a moverse y entender que hay que buscar la salida.

- Tamaño chico: **15×15 celdas**.
- Inicio arriba a la izquierda, salida abajo a la derecha.
- 2–4 bifurcaciones, 2–3 callejones sin salida cortos.
- Sin caminos falsos largos: equivocarse cuesta pocos segundos.
- Todo el laberinto visible desde el inicio (es el tutorial implícito).
- Tiempo estimado: **30–90 segundos**.

**Criterio de aceptación:** un jugador nuevo entiende el objetivo sin instrucciones externas y completa el nivel en menos de 2 minutos.

### Nivel 2 — “Bifurcaciones” (más grande)

**Objetivo:** empezar a explorar y recordar rutas.

- Tamaño mediano: **21×21 celdas**.
- Más bifurcaciones (6–10) y callejones sin salida más largos.
- Al menos un camino falso que parece dirigirse a la salida y termina en pared.
- Todo el laberinto sigue visible, pero ya no se resuelve de un vistazo.
- Se incorporan contador de pasos y cronómetro como reto de eficiencia (sin castigo por perder).
- Tiempo estimado: **2–5 minutos**.

**Criterio de aceptación:** el jugador necesita probar rutas, retroceder al menos una vez y usa el contador de pasos/tiempo como referencia.

### Nivel 3 — “El gran laberinto” (el más grande)

**Objetivo:** exploración real. Hay que recorrer, mapear mentalmente y descartar zonas.

- Tamaño grande: **31×31 celdas** (más grande que la pantalla de 720×720).
- Cámara que sigue al jugador: **la salida no se ve hasta llegar cerca**.
- Muchas bifurcaciones (12+) y callejones sin salida largos y ramificados.
- La ruta correcta no es la más corta visualmente; hay zonas enteras que son caminos falsos.
- Opcional (si entra en el alcance): el camino recorrido deja marca semitransparente para no perderse.
- Tiempo estimado: **5–10 minutos** (o más si el jugador se pierde).

**Criterio de aceptación:** el jugador no puede saber dónde está la salida sin explorar; debe recorrer una parte significativa del laberinto antes de completarlo.

### Progresión de dificultad

| Eje | Nivel 1 | Nivel 2 | Nivel 3 |
|---|---|---|---|
| Tamaño | Chico | Mediano | Grande |
| Cámara | Todo visible | Todo visible | Sigue al jugador |
| Bifurcaciones | Pocas | Medias | Muchas |
| Callejones sin salida | Cortos y pocos | Más largos | Largos y ramificados |
| Exigencia de memoria | Baja | Media | Alta |

## 7. Flujo de pantallas / escenas (Phaser)

| Escena | Contenido |
|---|---|
| `Game` (o `Level`) | Escena jugable: crea el laberinto del nivel actual, jugador, salida, colisiones y HUD. |
| `Menu` (opcional) | Título, “Jugar”, controles y objetivo. |
| `Win` (opcional) | Victoria final con tiempo y pasos totales. |

Como mínimo viable: **una sola escena jugable** que carga el nivel actual según un índice (`levelIndex`) y avanza al siguiente al tocar la salida. Las escenas de menú/victoria pueden ser textos dentro de la misma escena.

### HUD (todo con textos y cuadrados)

- Nivel actual: `Nivel 1/3`
- Tiempo del nivel
- Pasos
- Ayuda breve: `Flechas/WASD: moverse · R: reiniciar`

## 8. Implementación técnica (resumen)

1. **Configuración (`main.js`):**
   - Phaser `AUTO`, 720×720, escala `FIT` (ya definido).
   - Física Arcade con `gravity.y = 0` (top-down, sin saltos).
   - `debug: false` en producción.
2. **Generación del laberinto (por código):**
   - Grilla de celdas, DFS/Recursive Backtracker.
   - Representación: matriz `0 = camino`, `1 = pared`.
   - Dibujar cada celda como cuadrado con `Graphics` y crear cuerpos estáticos cuadrados para las paredes.
3. **Jugador:**
   - Cuadrado (`Rectangle` + cuerpo Arcade) con velocidad constante en las 4 direcciones.
   - Colisión contra paredes y bordes del mundo.
4. **Salida:**
   - Cuadrado con `overlap`/`collider` contra el jugador; al tocarla se pasa al siguiente nivel.
5. **Cámara (Nivel 3):**
   - `camera.startFollow(player)` y límites del mundo según el tamaño del laberinto.
6. **Sin assets:** no se cargan imágenes, spritesheets ni Tilemaps; `preload()` puede quedar vacío o solo para fuentes del sistema.

## 9. Audio (opcional)

- Sonido corto al completar un nivel.
- Sonido de victoria final.
- Sin música obligatoria. Todo opcional para no sumar alcance.

## 10. Alcance del TP (MVP)

**Incluye:**
- [ ] Movimiento en 4 direcciones con colisiones
- [ ] 3 laberintos generados por código (15×15, 21×21, 31×31)
- [ ] Salida, inicio, paredes y jugador como cuadrados
- [ ] Reinicio con `R`, contador de pasos y cronómetro
- [ ] Cámara seguidora en el Nivel 3
- [ ] Pantalla/texto de victoria tras completar el Nivel 3

**No incluye:**
- Sprites, imágenes ni tilesets externos
- Enemigos, trampas, coleccionables o vidas
- Guardado de progreso entre sesiones
- Multijugador

## 11. Riesgos y decisiones

| Riesgo | Mitigación |
|---|---|
| El Nivel 3 se vuelve frustrante por perderse | Marca opcional de camino recorrido; reinicio rápido con `R` |
| El laberinto generado no tiene solución | Generación con DFS que garantiza conectividad inicio–salida |
| Cámara fija en niveles grandes | Cámara seguidora solo en el Nivel 3 |
| Gravedad heredada de la plantilla | `gravity.y = 0` para movimiento top-down |

## 12. Roadmap sugerido

1. Movimiento del cuadrado + colisiones con paredes de prueba.
2. Generación del laberinto (Nivel 1) y salida.
3. Niveles 2 y 3 (tamaño, bifurcaciones y cámara).
4. HUD, reinicio, cronómetro y pantalla de victoria.
5. Pulido: paleta, parpadeo de salida, marcas de recorrido y audio opcional.
