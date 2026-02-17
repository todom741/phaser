// =============================================
// STATS & CONFIGURATION
// =============================================

// ── CHARACTER DEFINITIONS + INDIVIDUAL BOOST PROGRESSION ────────
const CHARACTERS = [
    {
        id: 0,
        name: 'Mona',
        spriteKey: 'dude',
        spriteScale: 3.0,
        portraitKey: 'monap',
        baseStats: {
            attack: 10,
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
        },
        boostProgression: [
            { threshold: 25,  attack: +8,  projectileTravelSpeed: +20, fireRate: -0.05, projectilesCount: 0, pierce: 0 },
            { threshold: 50,  attack: +18, projectileTravelSpeed: +40, fireRate: -0.10, projectilesCount: +1, pierce: +1 },
            { threshold: 75,  attack: +12, projectileTravelSpeed: +30, fireRate: -0.04, projectilesCount: 0, pierce: +1 },
            { threshold: 100, attack: +25, projectileTravelSpeed: +60, fireRate: -0.08, projectilesCount: +1, pierce: +1 }
        ]
    },
    {
        id: 1,
        name: 'Luna',
        spriteKey: 'dude',
        spriteScale: 3.0,
        portraitKey: 'monap',
        baseStats: {
            attack: 10,
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
        },
        boostProgression: [
            { threshold: 25,  attack: +6,  projectileTravelSpeed: +15, fireRate: -0.04, projectilesCount: 0, pierce: 0 },
            { threshold: 50,  attack: +14, projectileTravelSpeed: +35, fireRate: -0.08, projectilesCount: +1, pierce: +1 },
            { threshold: 75,  attack: +10, projectileTravelSpeed: +25, fireRate: -0.05, projectilesCount: 0, pierce: +1 },
            { threshold: 100, attack: +20, projectileTravelSpeed: +55, fireRate: -0.07, projectilesCount: +1, pierce: +1 }
        ]
    },
    {
        id: 2,
        name: 'Riven',
        spriteKey: 'dude',
        spriteScale: 3.0,
        portraitKey: 'monap',
        baseStats: {
            attack: 10,
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
        },
        boostProgression: [
            { threshold: 25,  attack: +9,  projectileTravelSpeed: +25, fireRate: -0.06, projectilesCount: 0, pierce: 0 },
            { threshold: 50,  attack: +20, projectileTravelSpeed: +45, fireRate: -0.11, projectilesCount: +1, pierce: +1 },
            { threshold: 75,  attack: +15, projectileTravelSpeed: +35, fireRate: -0.05, projectilesCount: 0, pierce: +2 },
            { threshold: 100, attack: +30, projectileTravelSpeed: +70, fireRate: -0.10, projectilesCount: +1, pierce: +1 }
        ]
    },
    {
        id: 3,
        name: 'Zephyr',
        spriteKey: 'dude',
        spriteScale: 3.0,
        portraitKey: 'monap',
        baseStats: {
            attack: 10,
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
        },
        boostProgression: [
            { threshold: 25,  attack: +7,  projectileTravelSpeed: +18, fireRate: -0.05, projectilesCount: 0, pierce: 0 },
            { threshold: 50,  attack: +16, projectileTravelSpeed: +38, fireRate: -0.09, projectilesCount: +1, pierce: +1 },
            { threshold: 75,  attack: +11, projectileTravelSpeed: +28, fireRate: -0.04, projectilesCount: 0, pierce: +1 },
            { threshold: 100, attack: +22, projectileTravelSpeed: +58, fireRate: -0.08, projectilesCount: +1, pierce: +1 }
        ]
    }
];

let currentCharacterIndex = 0;

// ── ENEMY BASE STATS (fixed) ────────────────────────────────────
const ENEMY_BASE = { health: 100, speed: 30.5, tint: 0xffffff };

// ── GENERAL GAME CONFIG ─────────────────────────────────────────
let spawnDelay = 1000;
const MAX_ENEMIES_ON_SCREEN = 20;
const BOOST_PER_KILL = 1;  // Changed to 1 as requested
const MAX_BOOST = 100;

// ── LANE CONFIG ─────────────────────────────────────────────────
const LANES = [360, 420, 480];

// ── ENEMY VISUAL SIZE & SPACING ─────────────────────────────────
const ENEMY_VISUAL_SCALE = 4.4;
const MIN_ENEMY_SEPARATION = 220;
const LANE_PROXIMITY = 60;

// ── BARRIER ZONE CONFIG ─────────────────────────────────────────
const BARRIER_ZONE_X = 520;
const BARRIER_ZONE_WIDTH = 120;
const BARRIER_ZONE_HEIGHT = 720;

// ── GAME VARIABLES ──────────────────────────────────────────────
let player, enemies, fireballs, stopLine, barrierZone;
let statsOverlay, statsCloseButton, statsGridContainer;
let topLeftStatsText, boostLabelText, boostBarBackground, boostBarFill;
let spawnTimer, shootTimer;
let playerStats = { boost: 0 };
let statsButton;
let selectionOverlay;
let lastSpawnLaneIndex = -1;

// =============================================
// BOOST & STATS HELPERS
// =============================================

function applyBoostBonuses() {
    const char = CHARACTERS[currentCharacterIndex];
    const base = char.baseStats;

    playerStats.attack = base.attack;
    playerStats.projectileTravelSpeed = base.projectileTravelSpeed;
    playerStats.fireRate = base.fireRate;
    playerStats.projectilesCount = base.projectilesCount;
    playerStats.pierce = base.pierce;

    char.boostProgression.forEach(bonus => {
        if (playerStats.boost >= bonus.threshold) {
            playerStats.attack += bonus.attack || 0;
            playerStats.projectileTravelSpeed += bonus.projectileTravelSpeed || 0;
            playerStats.fireRate += bonus.fireRate || 0;
            playerStats.projectilesCount += bonus.projectilesCount || 0;
            playerStats.pierce += bonus.pierce || 0;
        }
    });

    updateTopLeftStats();
    updateBoostBar();
    updateStatsGrid();
}

function updateTopLeftStats() {
    if (!topLeftStatsText) return;
    const charName = CHARACTERS[currentCharacterIndex].name;
    topLeftStatsText.setText(`${charName}`);
}

function updateBoostBar() {
    if (!boostBarBackground || !boostBarFill) return;
    const progress = Math.min(playerStats.boost / MAX_BOOST, 1);
    const barWidth = 220;
    boostBarFill.setScale(progress, 1);
    boostBarFill.x = boostBarBackground.x - (barWidth / 2) + (barWidth * progress / 2);
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
        { label: 'Boost', value: `${Math.floor(playerStats.boost)}%` }
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
        this.load.image('castle', 'assets/backgrounds/screenshot.png');
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
        const bg = this.add.image(0, 0, 'castle')
            .setOrigin(0, 0)
            .setDepth(-1);

        const scaleX = this.scale.width / bg.width;
        const scaleY = this.scale.height / bg.height;
        const scale = Math.max(scaleX, scaleY);

        bg.setScale(scale);
        bg.setPosition(
            (this.scale.width - bg.displayWidth) / 2,
            (this.scale.height - bg.displayHeight) / 2
        );

        playerStats.boost = 0;
        applyBoostBonuses();

        this.add.text(720, 80, 'Castle Defense', { fontSize: '48px', fill: '#ffffff', stroke: '#000000', strokeThickness: 10 }).setOrigin(0.5);

        //topLeftStatsText = this.add.text(20, 20, '', { fontSize: '32px', fill: '#ffffff', stroke: '#000000', strokeThickness: 6, lineSpacing: 4 });

        boostLabelText = this.add.text(20, 60, '', { fontSize: '32px', fill: '#ffffff', stroke: '#000000', strokeThickness: 6 });

        //boostLabelText = this.add.text(20, 58, 'Boost:', { fontSize: '32px', fill: '#ffffff', stroke: '#000000', strokeThickness: 6 });

        const barX = 130, barY = 85, barWidth = 220, barHeight = 18;
        boostBarBackground = this.add.rectangle(barX, barY, barWidth, barHeight, 0x000000).setStrokeStyle(2, 0xffffff).setOrigin(0.5, -0.5);
        boostBarFill = this.add.rectangle(barX, barY, barWidth, barHeight - 4, 0x00ff88).setOrigin(0.5, -0.5);
        updateBoostBar();

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

        barrierZone = this.add.rectangle(BARRIER_ZONE_X, 360, BARRIER_ZONE_WIDTH, BARRIER_ZONE_HEIGHT, 0x00ff00, 0);
        this.physics.add.existing(barrierZone);
        barrierZone.body.allowGravity = false;
        barrierZone.body.immovable = true;
        barrierZone.body.moves = false;

        // Stats button is created but NEVER shown during gameplay
        statsButton = this.add.text(400, 40, 'Stats', {
            fontSize: '32px',
            fill: '#00ffcc',
            backgroundColor: '#444444',
            padding: { left: 16, right: 16, top: 8, bottom: 8 }
        }).setOrigin(1, 0)
          .setInteractive()
          .setVisible(false);  // hidden

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
            fontSize: '48px',
            fontStyle: 'bold',
            fill: '#aaffdd',
            stroke: '#000000',
            strokeThickness: 12
        }).setOrigin(0.5, -0.4);
        previewContainer.add(this.previewName);

        // Left arrow
        const leftArrow = this.add.text(-300, 0, '←', {
            fontSize: '80px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 12
        }).setOrigin(0.5).setInteractive()
          .on('pointerdown', () => {
              currentCharacterIndex = (currentCharacterIndex - 1 + CHARACTERS.length) % CHARACTERS.length;
              this.updateCharacterPreview();
          })
          .on('pointerover', () => leftArrow.setStyle({ fill: '#ffffcc' }))
          .on('pointerout', () => leftArrow.setStyle({ fill: '#ffffff' }));
        this.selectionOverlay.add(leftArrow);

        // Right arrow
        const rightArrow = this.add.text(300, 0, '→', {
            fontSize: '80px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 12
        }).setOrigin(0.5).setInteractive()
          .on('pointerdown', () => {
              currentCharacterIndex = (currentCharacterIndex + 1) % CHARACTERS.length;
              this.updateCharacterPreview();
          })
          .on('pointerover', () => rightArrow.setStyle({ fill: '#ffffcc' }))
          .on('pointerout', () => rightArrow.setStyle({ fill: '#ffffff' }));
        this.selectionOverlay.add(rightArrow);

        // Start button
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
        });
        this.selectionOverlay.add(startBtn);

        this.updateCharacterPreview = () => {
            if (this.bigPreviewSprite) this.bigPreviewSprite.destroy();
            const char = CHARACTERS[currentCharacterIndex];
            this.bigPreviewSprite = this.add.sprite(0, 60, char.spriteKey)
                .setScale(2.8)
                .setOrigin(0.5, 0.8)
                .play('idle_cycle');
            previewContainer.add(this.bigPreviewSprite);
            this.previewName.setText(char.name);
        };

        this.updateCharacterPreview();
    }

    pauseGameplay() {
        this.physics.pause();
        if (spawnTimer) spawnTimer.paused = true;
        if (shootTimer) shootTimer.paused = true;
    }

    resumeGameplay() {
        if (boostLabelText) {
        boostLabelText.setText(CHARACTERS[currentCharacterIndex].name + ':');
        }
        if (player) player.destroy();

        player = this.physics.add.sprite(280, 520, CHARACTERS[currentCharacterIndex].spriteKey);
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

        applyBoostBonuses();

        shootTimer = this.time.addEvent({
            delay: 1000 / playerStats.fireRate,
            callback: this.autoShootAtNearest,
            callbackScope: this,
            loop: true
        });

        this.time.addEvent({
            delay: 150,
            callback: this.manageBarrierCrowd,
            callbackScope: this,
            loop: true
        });

        updateTopLeftStats();
        // No statsButton.setVisible(true) — button is hidden forever
    }

    autoShootAtNearest() {
        if (!player || !player.active) return;

        const targets = [];
        enemies.children.iterate(e => {
            if (e.active) targets.push(e);
        });

        if (targets.length === 0) return;

        const priority = targets.sort((a, b) => a.x - b.x);
        const count = Math.min(playerStats.projectilesCount, priority.length);
        for (let i = 0; i < count; i++) {
            this.shootAtTarget(priority[i]);
        }
    }

    shootAtTarget(target) {
        if (!target || !target.active) return;

        const spawnX = player.x;
        const spawnY = player.y - (player.displayHeight / 2);

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

    showStatsOverlay() {
        updateStatsGrid();
        statsOverlay.setVisible(true);
    }

    spawnEnemyCastle() {
        let currentEnemyCount = 0;
        enemies.children.iterate(e => { if (e.active) currentEnemyCount++; });
        if (currentEnemyCount >= MAX_ENEMIES_ON_SCREEN) return;

        let atBarrierCount = 0;
        enemies.children.iterate(enemy => {
            if (enemy.active && this.physics.overlap(enemy, barrierZone)) {
                atBarrierCount++;
            }
        });
        if (atBarrierCount >= 3) return;

        let availableLanes = LANES.filter((_, idx) => idx !== lastSpawnLaneIndex);
        if (availableLanes.length === 0) availableLanes = LANES;

        for (let i = 0; i < availableLanes.length; i++) {
            const candidateY = availableLanes[i];

            let isClear = true;
            enemies.children.iterate(enemy => {
                if (!enemy.active) return;

                const dx = 1500 - enemy.x;
                const dy = candidateY - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < MIN_ENEMY_SEPARATION) {
                    isClear = false;
                    return false;
                }
            });

            if (isClear) {
                const enemy = enemies.create(1500, candidateY, 'slime');

                enemy.setScale(ENEMY_VISUAL_SCALE);
                enemy.setTint(ENEMY_BASE.tint);
                enemy.play('slime_anim');

                enemy.health = ENEMY_BASE.health;
                enemy.maxHealth = ENEMY_BASE.health;
                enemy.barrierBlocked = false;

                const baseSpeed = ENEMY_BASE.speed;
                const variedSpeed = baseSpeed * Phaser.Math.FloatBetween(0.85, 1.15);
                enemy.originalSpeed = -variedSpeed;

                enemy.setVelocityX(enemy.originalSpeed);
                enemy.setVelocityY(0);

                if (enemy.body) {
                    enemy.body.setBounce(0);
                    enemy.body.setSize(enemy.width * 0.5, enemy.height * 0.5);
                    enemy.body.setOffset((enemy.width - enemy.body.width) / 2, (enemy.height - enemy.body.height) / 2);
                }

                lastSpawnLaneIndex = LANES.indexOf(candidateY);
                return;
            }
        }
    }

    manageBarrierCrowd() {
        enemies.children.iterate(enemy => {
            if (enemy.active) {
                if (this.physics.overlap(enemy, barrierZone)) {
                    enemy.setVelocityX(0);
                    enemy.setVelocityY(0);
                    enemy.barrierBlocked = true;
                } else {
                    enemy.barrierBlocked = false;
                }
            }
        });

        enemies.children.iterate(enemy => {
            if (!enemy.active || enemy.barrierBlocked) return;

            let shouldMove = true;

            enemies.children.iterate(other => {
                if (!other.active || other === enemy) return;

                if (Math.abs(other.y - enemy.y) > LANE_PROXIMITY) return;
                if (other.x >= enemy.x) return;

                if (other.body.velocity.x === 0 || other.barrierBlocked) {
                    if (enemy.x - other.x < MIN_ENEMY_SEPARATION + 40) {
                        shouldMove = false;
                        return false;
                    }
                }
            });

            if (shouldMove) {
                if (Math.abs(enemy.body.velocity.x) < 5) {
                    enemy.setVelocityX(enemy.originalSpeed);
                }
            } else {
                enemy.setVelocityX(0);
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
            playerStats.boost = Math.min(playerStats.boost + BOOST_PER_KILL, MAX_BOOST);
            applyBoostBonuses();
            updateBoostBar();
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