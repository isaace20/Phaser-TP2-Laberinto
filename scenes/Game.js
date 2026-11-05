// Laberinto Cuadrado - solo formas cuadradas, sin assets externos.
// 3 niveles generados por codigo (DFS / Recursive Backtracker):
//   Nivel 1: 15x15  (chico, todo visible)
//   Nivel 2: 21x21  (mediano, todo visible, mas bifurcaciones)
//   Nivel 3: 31x31  (grande, camara que sigue al jugador -> hay que explorar)

const CELL = 32;
const PLAYER_SIZE = 24;
const SPEED = 170;

const LEVELS = [
  { name: "Primeros pasos", size: 15, camera: false },
  { name: "Bifurcaciones", size: 21, camera: false },
  { name: "El gran laberinto", size: 31, camera: true },
];

export default class Game extends Phaser.Scene {
  constructor() {
    super("game");
  }

  init() {
    this.levelIndex = 0;
    this.totalSteps = 0;
    this.totalTime = 0;
  }

  preload() {
    // Sin assets externos: todo se dibuja con cuadrados por codigo.
  }

  create() {
    // Textura de 1 cuadrado blanco generada por codigo.
    // A partir de ella se tinjen jugador, paredes y salida.
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, CELL, CELL);
    g.generateTexture("cell", CELL, CELL);
    g.destroy();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyR = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);

    this.buildLevel(this.levelIndex);
  }

  buildLevel(levelIndex) {
    if (this.player) this.player.destroy();
    this.children.removeAll(true);

    const level = LEVELS[levelIndex];
    const size = level.size;
    const pixelSize = size * CELL;

    this.physics.world.setBounds(0, 0, pixelSize, pixelSize);
    this.cameras.main.setBackgroundColor("#0b0b0f");

    const grid = this.generateMaze(size);
    // grid[y][x]: 1 = pared, 0 = camino
    this.size = size;

    // Suelo: cuadrados claros en los caminos.
    const floorGfx = this.add.graphics();
    floorGfx.fillStyle(0xedf2f4, 1);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (grid[y][x] === 0) {
          floorGfx.fillRect(x * CELL, y * CELL, CELL, CELL);
        }
      }
    }

    // Marca de celdas recorridas (ayuda visual).
    this.trailGfx = this.add.graphics();
    this.visitedCells = new Set();

    // Paredes: cuadrados con cuerpo estatico.
    this.walls = this.physics.add.staticGroup();
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (grid[y][x] === 1) {
          const wall = this.walls.create(
            x * CELL + CELL / 2,
            y * CELL + CELL / 2,
            "cell"
          );
          wall.setTint(0x2b2d42);
          wall.setDisplaySize(CELL, CELL);
          wall.refreshBody();
        }
      }
    }

    // Inicio (azul) y salida (verde parpadeante).
    const startX = 1 * CELL + CELL / 2;
    const startY = 1 * CELL + CELL / 2;
    const exitX = (size - 2) * CELL + CELL / 2;
    const exitY = (size - 2) * CELL + CELL / 2;

    this.add.rectangle(startX, startY, CELL - 6, CELL - 6, 0x118ab2).setStrokeStyle(2, 0xffffff);

    this.exitMark = this.add.rectangle(exitX, exitY, CELL - 4, CELL - 4, 0x06d6a0);
    this.exitMark.setStrokeStyle(2, 0xffffff);
    this.exitX = exitX;
    this.exitY = exitY;

    // Jugador: cuadrado amarillo.
    this.player = this.physics.add.sprite(startX, startY, "cell");
    this.player.setTint(0xffd166);
    this.player.setDisplaySize(PLAYER_SIZE, PLAYER_SIZE);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(PLAYER_SIZE - 4, PLAYER_SIZE - 4);
    this.physics.add.collider(this.player, this.walls);

    this.steps = 0;
    this.startTime = this.time.now;
    this.lastCellX = 1;
    this.lastCellY = 1;
    this.levelFinished = false;
    this.markVisited(1, 1);

    // Camara: en el Nivel 3 sigue al jugador (hay que explorar).
    const cam = this.cameras.main;
    if (level.camera) {
      cam.setBounds(0, 0, pixelSize, pixelSize);
      cam.startFollow(this.player, true, 0.1, 0.1);
    } else {
      cam.stopFollow();
      cam.setBounds(0, 0, Math.max(pixelSize, 720), Math.max(pixelSize, 720));
      cam.centerOn(pixelSize / 2, pixelSize / 2);
    }

    // HUD fijo en pantalla.
    const hudStyle = { fontSize: "18px", fill: "#ffffff", fontFamily: "monospace" };
    this.hudLevel = this.add.text(12, 12, `Nivel ${levelIndex + 1}/3: ${level.name}`, hudStyle).setScrollFactor(0).setDepth(10);
    this.hudStats = this.add.text(12, 36, "Pasos: 0  Tiempo: 0.0s", hudStyle).setScrollFactor(0).setDepth(10);
    this.hudHelp = this.add
      .text(12, 60, "Flechas / WASD: moverse  ·  R: reiniciar", { fontSize: "14px", fill: "#cccccc", fontFamily: "monospace" })
      .setScrollFactor(0)
      .setDepth(10);
    this.messageText = this.add
      .text(360, 360, "", { fontSize: "36px", fill: "#06d6a0", fontFamily: "monospace", align: "center" })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(20);
  }

  generateMaze(size) {
    // DFS / Recursive Backtracker sobre grilla impar (15/21/31).
    // 1 = pared, 0 = camino. Garantiza un unico camino inicio -> salida.
    const grid = Array.from({ length: size }, () => Array(size).fill(1));
    const stack = [[1, 1]];
    grid[1][1] = 0;

    const dirs = [
      [0, -2],
      [2, 0],
      [0, 2],
      [-2, 0],
    ];

    while (stack.length > 0) {
      const [cx, cy] = stack[stack.length - 1];
      const neighbors = [];
      for (const [dx, dy] of dirs) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx > 0 && nx < size - 1 && ny > 0 && ny < size - 1 && grid[ny][nx] === 1) {
          neighbors.push([nx, ny]);
        }
      }
      if (neighbors.length === 0) {
        stack.pop();
      } else {
        const [nx, ny] = neighbors[Phaser.Math.Between(0, neighbors.length - 1)];
        grid[cy + (ny - cy) / 2][cx + (nx - cx) / 2] = 0;
        grid[ny][nx] = 0;
        stack.push([nx, ny]);
      }
    }

    grid[size - 2][size - 2] = 0;
    return grid;
  }

  markVisited(cellX, cellY) {
    const key = `${cellX},${cellY}`;
    if (this.visitedCells.has(key)) return;
    this.visitedCells.add(key);
    this.trailGfx.fillStyle(0x118ab2, 0.18);
    this.trailGfx.fillRect(cellX * CELL + 4, cellY * CELL + 4, CELL - 8, CELL - 8);
  }

  update() {
    if (this.levelFinished) return;

    let vx = 0;
    let vy = 0;
    const left = this.cursors.left.isDown || this.keyA.isDown;
    const right = this.cursors.right.isDown || this.keyD.isDown;
    const up = this.cursors.up.isDown || this.keyW.isDown;
    const down = this.cursors.down.isDown || this.keyS.isDown;

    if (left) vx = -SPEED;
    if (right) vx = SPEED;
    if (up) vy = -SPEED;
    if (down) vy = SPEED;
    this.player.setVelocity(vx, vy);

    const cellX = Math.floor(this.player.x / CELL);
    const cellY = Math.floor(this.player.y / CELL);
    if (cellX !== this.lastCellX || cellY !== this.lastCellY) {
      this.lastCellX = cellX;
      this.lastCellY = cellY;
      this.steps += 1;
      this.markVisited(cellX, cellY);
    }

    // Salida parpadeante (visible cuando llegas cerca, no desde el inicio en el Nivel 3).
    const pulse = 0.75 + 0.25 * Math.sin(this.time.now / 200);
    this.exitMark.setScale(pulse, pulse);

    const elapsed = (this.time.now - this.startTime) / 1000;
    this.hudStats.setText(`Pasos: ${this.steps}  Tiempo: ${elapsed.toFixed(1)}s`);

    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.exitX, this.exitY) < 26) {
      this.finishLevel(elapsed);
    }

    if (Phaser.Input.Keyboard.JustDown(this.keyR)) {
      this.buildLevel(this.levelIndex);
    }
  }

  finishLevel(elapsed) {
    this.levelFinished = true;
    this.player.setVelocity(0, 0);
    this.totalSteps += this.steps;
    this.totalTime += elapsed;

    const last = this.levelIndex === LEVELS.length - 1;
    this.messageText.setText(
      last
        ? `¡GANASTE!\nTiempo total: ${this.totalTime.toFixed(1)}s\nPasos totales: ${this.totalSteps}\nEnter para jugar de nuevo`
        : `¡Salida encontrada!\nTiempo: ${elapsed.toFixed(1)}s  Pasos: ${this.steps}\nEnter: siguiente nivel`
    );

    let advanced = false;
    const advance = () => {
      if (advanced) return;
      advanced = true;
      if (last) {
        this.levelIndex = 0;
        this.totalSteps = 0;
        this.totalTime = 0;
      } else {
        this.levelIndex += 1;
      }
      this.buildLevel(this.levelIndex);
    };

    this.input.keyboard.once("keydown-ENTER", advance);
    this.time.delayedCall(3000, advance);
  }
}
