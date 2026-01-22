// =============================================
// STATS & CONFIGURATION
// =============================================

// ── CHARACTER DEFINITIONS ───────────────────────────────────────
const CHARACTERS = [
    {
        id: 0,
        name: 'Mona',
        spriteKey: 'dude',
        spriteScale: 3.0,
        portraitKey: 'monap',
        baseStats: {
            attack: 50,
            projectileTravelSpeed: 220,
            fireRate: 0.40,
            projectilesCount: 1,
            pierce: 1
        },
        projectileConfig: {
            key: 'fb001',
            animKey: 'fireball_anim',
            scale: 2.6,
            bodySize: 104
        }
    },
    {
        id: 1,
        name: 'Luna',
        spriteKey: 'dude',
        spriteScale: 3.0,
        portraitKey: 'monap',
        baseStats: {
            attack: 50,
            projectileTravelSpeed: 220,
            fireRate: 0.40,
            projectilesCount: 1,
            pierce: 0
        },
        projectileConfig: {
            key: 'shuriken',
            animKey: 'shuriken_anim',
            scale: 2.6,
            bodySize: 44
        }
    },
    {
        id: 2,
        name: 'Riven',
        spriteKey: 'dude',
        spriteScale: 3.0,
        portraitKey: 'monap',
        baseStats: {
            attack: 50,
            projectileTravelSpeed: 220,
            fireRate: 0.40,
            projectilesCount: 1,
            pierce: 0
        },
        projectileConfig: {
            key: 'fb001',
            animKey: 'fireball_anim',
            scale: 2.6,
            bodySize: 104
        }
    },
    {
        id: 3,
        name: 'Zephyr',
        spriteKey: 'dude',
        spriteScale: 3.0,
        portraitKey: 'monap',
        baseStats: {
            attack: 50,
            projectileTravelSpeed: 220,
            fireRate: 0.40,
            projectilesCount: 1,
            pierce: 0
        },
        projectileConfig: {
            key: 'fb001',
            animKey: 'fireball_anim',
            scale: 2.6,
            bodySize: 104
        }
    }
];

let currentCharacterIndex = 0;

// ── ENEMY BASE STATS ────────────────────────────────────────────
const ENEMY_BASE = { health: 100, speed: 52.5, tint: 0xffffff, scale: 2.4 };

// ── ENEMY SCALING ───────────────────────────────────────────────
const ENEMY_SCALE_FACTOR = { health: 1.10, speed: 1.05 };

// ── GENERAL GAME CONFIG ─────────────────────────────────────────
const MAX_LEVEL = 100;
const XP_GROWTH = 1.5;
const XP_BASE = 200;
let spawnDelay = 100;
const MAX_ENEMIES_ON_SCREEN = 100;
const MAX_CROWD_AT_BARRIER = 10;

// ── BARRIER ZONE CONFIG ─────────────────────────────────────────
const BARRIER_ZONE_X = 520;
const BARRIER_ZONE_WIDTH = 120;
const BARRIER_ZONE_HEIGHT = 720;
const BARRIER_REFERENCE_X = 500;  // Used for prioritizing closest-to-barrier enemies

// ── GAME VARIABLES ──────────────────────────────────────────────
let player, enemies, fireballs, stopLine, barrierZone;
let statsOverlay, statsCloseButton, statsGridContainer;
let topLeftStatsText, xpBarBackground, xpBarFill;
let spawnTimer, shootTimer;
let playerStats = {};
let statsButton;
let selectionOverlay;

// =============================================
// GLOBAL HELPER FUNCTIONS
// =============================================

function autoShootAtNearest() {
    if (!player || !player.active) return;

    const targets = [];
    enemies.children.iterate(e => {
        if (e.active) targets.push(e);
    });

    if (targets.length === 0) return;

    // Sort by distance to the barrier (smallest x = closest to barrier)
    const priority = targets.sort((a, b) => {
        return a.x - b.x;  // lower x = closer to left/barrier → higher priority
    });

    const count = Math.min(playerStats.projectilesCount, priority.length);
    for (let i = 0; i < count; i++) {
        shootAtTarget(priority[i]);
    }
}

function shootAtTarget(target) {
    if (!target || !target.active) return;
    const spawnX = player.x;
    const spawnY = player.y - (player.displayHeight / 2) * 0.5;

    const config = CHARACTERS[currentCharacterIndex].projectileConfig;
    const projectile = fireballs.create(spawnX, spawnY, config.key);
    projectile.play(config.animKey);
    projectile.setScale(config.scale);
    projectile.setOrigin(0.5, 0.5);
    projectile.pierceHits = 0;
    projectile.hitEnemies = new Set();

    const bodySize = config.bodySize;
    projectile.body.setSize(bodySize, bodySize);
    projectile.body.setOffset((projectile.width - bodySize) / 2, (projectile.height - bodySize) / 2);

    const dx = target.x - spawnX;
    const dy = target.y - spawnY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < 1) { projectile.setVelocity(0, 0); return; }

    const speed = playerStats.projectileTravelSpeed;
    const angle = Phaser.Math.Angle.Between(spawnX, spawnY, target.x, target.y);
    projectile.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    projectile.rotation = angle;
}

// =============================================
// XP & LEVEL & STATS HELPERS
// =============================================

function computeLevelFromTotalXP(totalXP) {
    if (totalXP < XP_BASE) return 1;
    let level = 1;
    let cumulative = 0;
    while (true) {
        const nextThreshold = cumulative + Math.round(XP_BASE * Math.pow(XP_GROWTH, level - 1));
        if (totalXP < nextThreshold) return level;
        cumulative = nextThreshold;
        level++;
        if (level >= MAX_LEVEL) return MAX_LEVEL;
    }
}

function getXPToNextLevel(level) {
    return Math.round(XP_BASE * Math.pow(XP_GROWTH, level - 1));
}

function getTotalXPForLevel(level) {
    if (level <= 1) return 0;
    let total = 0;
    for (let i = 1; i < level; i++) {
        total += Math.round(XP_BASE * Math.pow(XP_GROWTH, i - 1));
    }
    return total;
}

function computeLevelAndStats(scene) {
    const totalXP = playerStats.totalXP || 0;
    const level = computeLevelFromTotalXP(totalXP);
    const xpRequiredForThisLevel = getTotalXPForLevel(level);
    const currentXP = totalXP - xpRequiredForThisLevel;
    const nextLevelXP = getXPToNextLevel(level);
    playerStats.level = level;
    const basePierce = CHARACTERS[currentCharacterIndex].baseStats.pierce || 0;
    playerStats.pierce = basePierce + Math.floor(level / 5);
    playerStats.currentXP = Math.max(0, currentXP);
    playerStats.nextLevelXP = nextLevelXP;
    const bases = CHARACTERS[currentCharacterIndex].baseStats;
    playerStats.attack = bases.attack * Math.pow(1.1, level - 1);
    playerStats.projectileTravelSpeed = bases.projectileTravelSpeed;
    playerStats.fireRate = bases.fireRate * Math.pow(1.1, level - 1);
    playerStats.projectilesCount = bases.projectilesCount + Math.floor(level / 5);
    updateTopLeftStats();
    updateXpBar();
    updateStatsGrid();
}

function updateTopLeftStats() {
    if (!topLeftStatsText) return;
    const charName = CHARACTERS[currentCharacterIndex].name;
    topLeftStatsText.setText(`${charName}\nLevel: ${playerStats.level}`);
}

function updateXpBar() {
    if (!xpBarBackground || !xpBarFill) return;
    const progress = playerStats.nextLevelXP > 0
        ? Math.min(playerStats.currentXP / playerStats.nextLevelXP, 1)
        : 0;
    const barWidth = 220;
    xpBarFill.setScale(progress, 1);
    xpBarFill.x = xpBarBackground.x - (barWidth / 2) + (barWidth * progress / 2);
}

function updateStatsGrid() {
    if (!statsGridContainer) return;
    statsGridContainer.removeAll(true);
    const charName = CHARACTERS[currentCharacterIndex].name;
    const titleText = statsGridContainer.scene.add.text(0, -220, `${charName} Stats`, {
        fontSize: '40px', fontStyle: 'bold', fill: '#aaffdd', stroke: '#000000', strokeThickness: 10
    }).setOrigin(0.5);
    statsGridContainer.add(titleText);

    const statsPairs = [
        { label: 'Attack', value: Math.round(playerStats.attack) },
        { label: 'Atk Speed', value: playerStats.fireRate.toFixed(2) },
        { label: 'Projectiles', value: playerStats.projectilesCount },
        { label: 'Proj. Speed', value: Math.round(playerStats.projectileTravelSpeed) },
        { label: 'Pierce', value: playerStats.pierce },
        { label: 'Level', value: playerStats.level },
        { label: 'XP', value: `${Math.floor(playerStats.currentXP || 0)} / ${playerStats.nextLevelXP || XP_BASE}` }
    ];

    for (let i = 0; i < statsPairs.length; i += 2) {
        const y = -160 + (Math.floor(i / 2)) * 60;
        if (statsPairs[i]) {
            const stat = statsPairs[i];
            const labelLeft = statsGridContainer.scene.add.text(-310, y, stat.label + ':', {
                fontSize: '26px', fill: '#aaffcc', stroke: '#000000', strokeThickness: 5
            }).setOrigin(0, 0.5);
            const valueLeft = statsGridContainer.scene.add.text(-50, y, stat.value.toString(), {
                fontSize: '26px', fill: '#ffffff', stroke: '#000000', strokeThickness: 5
            }).setOrigin(1, 0.5);
            if (valueLeft.width > 140) valueLeft.setScale(140 / valueLeft.width, 1);
            statsGridContainer.add(labelLeft);
            statsGridContainer.add(valueLeft);
        }
        if (statsPairs[i + 1]) {
            const stat = statsPairs[i + 1];
            const labelRight = statsGridContainer.scene.add.text(40, y, stat.label + ':', {
                fontSize: '26px', fill: '#aaffcc', stroke: '#000000', strokeThickness: 5
            }).setOrigin(0, 0.5);
            const valueRight = statsGridContainer.scene.add.text(300, y, stat.value.toString(), {
                fontSize: '26px', fill: '#ffffff', stroke: '#000000', strokeThickness: 5
            }).setOrigin(1, 0.5);
            if (valueRight.width > 140) valueRight.setScale(140 / valueRight.width, 1);
            statsGridContainer.add(labelRight);
            statsGridContainer.add(valueRight);
        }
    }
}

// =============================================
// SCENE CLASSES
// =============================================

class Preloader extends Phaser.Scene {
    constructor() { super('Preloader'); }

    preload() {
        this.load.image('castle', 'assets/castle-bg.png');
        this.load.spritesheet('dude', 'assets/dude.png', { frameWidth: 63, frameHeight: 74 });
        this.load.spritesheet('slime', 'assets/slime.png', { frameWidth: 31, frameHeight: 24 });
        this.load.spritesheet('shuriken', 'assets/shuriken.png', { frameWidth: 22, frameHeight: 21 });
        this.load.image('fb001', 'assets/FB00_nyknck/FB001.png');
        this.load.image('fb002', 'assets/FB00_nyknck/FB002.png');
        this.load.image('fb003', 'assets/FB00_nyknck/FB003.png');
        this.load.image('fb004', 'assets/FB00_nyknck/FB004.png');
        this.load.image('fb005', 'assets/FB00_nyknck/FB005.png');
        this.load.image('monap', 'assets/monap.png');
    }

    create() {
        this.anims.create({ key: 'idle_cycle', frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 7 }), frameRate: 4, repeat: -1, yoyo: true });
        this.anims.create({ key: 'fireball_anim', frames: [{key:'fb001'},{key:'fb002'},{key:'fb003'},{key:'fb004'},{key:'fb005'}], frameRate: 15, repeat: -1 });
        this.anims.create({ key: 'slime_anim', frames: this.anims.generateFrameNumbers('slime', { start: 0, end: 4 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'shuriken_anim', frames: this.anims.generateFrameNumbers('shuriken', { start: 0, end: 1 }), frameRate: 15, repeat: -1 });
        this.scene.start('Castle');
    }
}

class Castle extends Phaser.Scene {
    constructor() { super('Castle'); }

    create() {
        playerStats.totalXP = 0;
        computeLevelAndStats(this);

        this.add.image(720, 360, 'castle').setOrigin(0.5);
        this.add.text(720, 80, 'Castle Defense', { fontSize: '48px', fill: '#ffffff', stroke: '#000000', strokeThickness: 10 }).setOrigin(0.5);

        topLeftStatsText = this.add.text(20, 20, '', { fontSize: '24px', fill: '#ffffff', stroke: '#000000', strokeThickness: 6, lineSpacing: 4 });

        const barX = 130, barY = 85, barWidth = 220, barHeight = 18;
        xpBarBackground = this.add.rectangle(barX, barY, barWidth, barHeight, 0x000000).setStrokeStyle(2, 0xffffff).setOrigin(0.5, -0.5);
        xpBarFill = this.add.rectangle(barX, barY, barWidth, barHeight - 4, 0xffffff).setOrigin(0.5, -0.5);

        updateTopLeftStats();
        updateXpBar();

        enemies = this.physics.add.group();
        fireballs = this.physics.add.group();

        stopLine = this.add.rectangle(500, 360, 80, 720, 0xff0000, 0);
        this.physics.add.existing(stopLine);
        stopLine.body.immovable = true;
        stopLine.body.allowGravity = false;

        this.physics.add.collider(enemies, stopLine, (enemy) => {
            if (enemy && enemy.body) {
                enemy.body.setVelocityX(0);
                enemy.body.setVelocityY(0);
            }
        }, null, this);

        this.physics.add.overlap(fireballs, enemies, this.hitEnemy, null, this);

        // Barrier counting zone
        barrierZone = this.add.rectangle(BARRIER_ZONE_X, 360, BARRIER_ZONE_WIDTH, BARRIER_ZONE_HEIGHT, 0x00ff00, 0);
        this.physics.add.existing(barrierZone);
        barrierZone.body.allowGravity = false;
        barrierZone.body.immovable = true;
        barrierZone.body.moves = false;

        // Stats button
        statsButton = this.add.text(400, 40, 'Stats', {
            fontSize: '32px',
            fill: '#00ffcc',
            backgroundColor: '#444444',
            padding: { left: 16, right: 16, top: 8, bottom: 8 }
        }).setOrigin(1, 0)
          .setInteractive()
          .setVisible(false)
          .on('pointerdown', () => this.showStatsOverlay());

        // Stats overlay
        statsOverlay = this.add.container(720, 360).setDepth(15).setVisible(false);

        const overlayBg = this.add.rectangle(0, 0, 760, 520, 0x112233)
            .setAlpha(0.88)
            .setStrokeStyle(4, 0x88ccff);
        statsOverlay.add(overlayBg);

        statsGridContainer = this.add.container(0, 0);
        statsOverlay.add(statsGridContainer);

        statsCloseButton = this.add.text(0, 200, 'Close', {
            fontSize: '36px',
            fill: '#ff5555',
            backgroundColor: '#444444',
            padding: { left: 40, right: 40, top: 15, bottom: 15 }
        }).setOrigin(0.5)
          .setInteractive()
          .on('pointerover', () => statsCloseButton.setStyle({ fill: '#ff8888' }))
          .on('pointerout', () => statsCloseButton.setStyle({ fill: '#ff5555' }))
          .on('pointerdown', () => {
              statsOverlay.setVisible(false);
          });
        statsOverlay.add(statsCloseButton);

        this.createSelectionOverlay();
        this.selectionOverlay.setVisible(true);
        this.pauseGameplay();
    }

    createSelectionOverlay() {
        const overlayW = 1100;
        const overlayH = 620;
        const overlayX = 720;
        const overlayY = 360;

        this.selectionOverlay = this.add.container(overlayX, overlayY).setDepth(10);

        const overlayBg = this.add.rectangle(0, 0, overlayW, overlayH, 0x1e2a44)
            .setAlpha(0.93)
            .setStrokeStyle(6, 0x6699ff);
        this.selectionOverlay.add(overlayBg);

        const previewContainer = this.add.container(0, -overlayH/2 + 140);
        this.selectionOverlay.add(previewContainer);

        this.bigPreviewSprite = null;

        this.previewName = this.add.text(0, 110, CHARACTERS[0].name, {
            fontSize: '32px',
            fontStyle: 'bold',
            fill: '#aaffdd',
            stroke: '#000000',
            strokeThickness: 9
        }).setOrigin(0.5, -0.4);
        previewContainer.add(this.previewName);

        const gridContainer = this.add.container(0, 100);
        this.selectionOverlay.add(gridContainer);

        const charsPerRow = 6;
        const portraitW = 120;
        const portraitH = 140;
        const spacingX = 148;
        const startX = -(charsPerRow - 1) * spacingX / 2;

        this.portraitFrames = [];

        CHARACTERS.forEach((char, i) => {
            const px = startX + i * spacingX;
            const py = 0;

            const slot = this.add.container(px, py);
            gridContainer.add(slot);

            const bg = this.add.rectangle(0, 0, portraitW, portraitH, 0x334455)
                .setStrokeStyle(3, 0x667799);
            slot.add(bg);

            const border = this.add.rectangle(0, 0, portraitW + 12, portraitH + 12, 0xffffff, 0)
                .setStrokeStyle(5, i === currentCharacterIndex ? 0xffff55 : 0x667799);
            this.portraitFrames.push(border);
            slot.add(border);

            const portrait = this.add.image(0, 0, char.portraitKey)
                .setDisplaySize(portraitW - 16, portraitH - 16)
                .setOrigin(0.5);
            slot.add(portrait);

            const hitArea = this.add.rectangle(0, 0, portraitW + 20, portraitH + 20, 0xffffff, 0)
                .setInteractive();

            hitArea.on('pointerdown', () => {
                currentCharacterIndex = i;
                this.portraitFrames.forEach((b, idx) => {
                    b.setStrokeStyle(5, idx === i ? 0xffff55 : 0x667799);
                });
                this.updateBigPreview();
            });

            slot.add(hitArea);
        });

        const startBtn = this.add.text(0, overlayH/2 - 70, 'DEFEND THE CASTLE', {
            fontSize: '42px',
            fontStyle: 'bold',
            fill: '#ffffff',
            backgroundColor: '#006633',
            padding: { left: 70, right: 70, top: 25, bottom: 25 },
            stroke: '#000000',
            strokeThickness: 9
        })
        .setOrigin(0.5)
        .setInteractive()
        .on('pointerover', () => startBtn.setStyle({ fill: '#ffffcc' }))
        .on('pointerout', () => startBtn.setStyle({ fill: '#ffffff' }))
        .on('pointerdown', () => {
            this.selectionOverlay.setVisible(false);
            this.resumeGameplay();
            statsButton.setVisible(true);
        });
        this.selectionOverlay.add(startBtn);

        this.updateBigPreview = () => {
            if (this.bigPreviewSprite) this.bigPreviewSprite.destroy();
            const char = CHARACTERS[currentCharacterIndex];
            this.bigPreviewSprite = this.add.sprite(0, 60, char.spriteKey)
                .setScale(2.8)
                .setOrigin(0.5, 0.8)
                .play('idle_cycle');
            previewContainer.add(this.bigPreviewSprite);
            this.previewName.setText(char.name);
        };

        this.updateBigPreview();
    }

    pauseGameplay() {
        this.physics.pause();
        if (spawnTimer) spawnTimer.paused = true;
        if (shootTimer) shootTimer.paused = true;
    }

    resumeGameplay() {
        if (player) player.destroy();

        player = this.physics.add.sprite(280, 400, CHARACTERS[currentCharacterIndex].spriteKey);
        player.setScale(CHARACTERS[currentCharacterIndex].spriteScale);
        player.setOrigin(0.5, 1.0);
        player.body.setSize(32, 64);
        player.body.setOffset(16, 0);
        player.body.immovable = true;
        player.anims.play('idle_cycle');

        this.physics.resume();

        spawnTimer = this.time.addEvent({
            delay: spawnDelay,
            callback: this.spawnEnemyCastle,
            callbackScope: this,
            loop: true
        });

        shootTimer = this.time.addEvent({
            delay: 1000 / playerStats.fireRate,
            callback: autoShootAtNearest,
            callbackScope: this,
            loop: true
        });

        this.time.addEvent({
            delay: 150,
            callback: this.manageBarrierCrowd,
            callbackScope: this,
            loop: true
        });

        computeLevelAndStats(this);
        statsButton.setVisible(true);
    }

    showStatsOverlay() {
        updateStatsGrid();
        statsOverlay.setVisible(true);
    }

    spawnEnemyCastle() {
        let currentEnemyCount = 0;
        enemies.children.iterate(e => { if (e.active) currentEnemyCount++; });
        if (currentEnemyCount >= MAX_ENEMIES_ON_SCREEN) return;

        const lanes = [120, 180, 240, 300, 360, 420, 480, 540, 600];
        const chosenLane = Phaser.Utils.Array.GetRandom(lanes);
        const randomOffset = Phaser.Math.Between(-20, 20);
        const spawnY = chosenLane + randomOffset;

        const enemy = enemies.create(1500, spawnY, 'slime');

        const visualScale = ENEMY_BASE.scale * 1.8 * 0.67;
        enemy.setScale(visualScale);
        enemy.setTint(ENEMY_BASE.tint);
        enemy.play('slime_anim');

        const level = playerStats.level || 1;
        enemy.health = ENEMY_BASE.health * Math.pow(ENEMY_SCALE_FACTOR.health, level - 1);
        enemy.maxHealth = enemy.health;

        const baseSpeed = ENEMY_BASE.speed * Math.pow(ENEMY_SCALE_FACTOR.speed, level - 1);
        const variedSpeed = baseSpeed * Phaser.Math.FloatBetween(0.8, 1.2);
        enemy.originalSpeed = -variedSpeed;

        enemy.setVelocityX(enemy.originalSpeed);
        enemy.setVelocityY(0);

        if (enemy.body) {
            enemy.body.setBounce(0);
            enemy.body.setSize(enemy.width * 0.8, enemy.height * 0.8);
            enemy.body.setOffset((enemy.width - enemy.body.width) / 2, (enemy.height - enemy.body.height) / 2);
        }
    }

    manageBarrierCrowd() {
        let atBarrierCount = 0;

        enemies.children.iterate(enemy => {
            if (!enemy.active) return;
            if (this.physics.overlap(enemy, barrierZone)) {
                atBarrierCount++;
            }
        });

        const shouldStopAll = atBarrierCount >= MAX_CROWD_AT_BARRIER;

        enemies.children.iterate(enemy => {
            if (!enemy.active) return;
            if (shouldStopAll) {
                enemy.setVelocityX(0);
                enemy.setVelocityY(0);
            } else {
                if (Math.abs(enemy.body.velocity.x) < 10) {
                    enemy.setVelocityX(enemy.originalSpeed);
                }
                enemy.setVelocityY(0);
            }
        });
    }

    hitEnemy(projectile, enemy) {
        if (projectile.hitEnemies.has(enemy)) return;
        projectile.hitEnemies.add(enemy);

        enemy.health -= playerStats.attack;
        if (enemy.health < enemy.maxHealth) enemy.setTint(0xffaa00);
        if (enemy.health <= 0) {
            enemy.destroy();
            playerStats.totalXP += 50;
            computeLevelAndStats(this);
            updateXpBar();
            if (shootTimer) shootTimer.delay = 1000 / playerStats.fireRate;
        }

        projectile.pierceHits = (projectile.pierceHits || 0) + 1;
        if (projectile.pierceHits > playerStats.pierce) projectile.destroy();
    }
}

// =============================================
// GAME CONFIG + START
// =============================================

const config = {
    pauseOnBlur: false,
    type: Phaser.AUTO,
    width: 1440,
    height: 720,
    physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [Preloader, Castle]
};

const game = new Phaser.Game(config);