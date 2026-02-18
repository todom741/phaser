// =============================================
// STATS & CONFIGURATION
// =============================================

// ── SINGLE CHARACTER + COSTUMES ────────────────────────────────
const CHARACTER = {
    baseName: 'Mona',
    spriteKey: 'dude',
    spriteScale: 3.0,
    baseStats: {
        attack: 50,
        projectileTravelSpeed: 220,
        fireRate: 0.40,
        projectilesCount: 1,
        pierce: 0
    },
    boostProgression: [
        { threshold: 25,  attack: +8,  projectileTravelSpeed: +20, fireRate: -0.05, projectilesCount: 0, pierce: 0 },
        { threshold: 50,  attack: +18, projectileTravelSpeed: +40, fireRate: -0.10, projectilesCount: +1, pierce: +1 },
        { threshold: 75,  attack: +12, projectileTravelSpeed: +30, fireRate: -0.04, projectilesCount: 0, pierce: +1 },
        { threshold: 100, attack: +25, projectileTravelSpeed: +60, fireRate: -0.08, projectilesCount: +1, pierce: +1 }
    ]
};

const COSTUMES = [
    { id: 0, name: 'Mona',        frameOffset: 0,   preselected: ['fire'] },
    { id: 1, name: 'Schoolgirl',  frameOffset: 8,   preselected: []      }
];

let currentCostumeIndex = 0;
let selectedElements = [];

// Projectile configs
const FIRE_CONFIG = {
    key: 'fb001',
    animKey: 'fireball_anim',
    scale: 2.6,
    bodySize: 104
};

const SHURIKEN_CONFIG = {
    key: 'shuriken',
    animKey: 'shuriken_anim',
    scale: 2.8,
    bodySize: 44
};

// ── ENEMY BASE STATS ────────────────────────────────────────────
const ENEMY_BASE = { health: 100, speed: 32, tint: 0xffffff };

// ── GENERAL GAME CONFIG ─────────────────────────────────────────
const MAX_ENEMIES_ON_SCREEN = 60;
const BOOST_PER_KILL = 1;
const MAX_BOOST = 100;

// ── LANE CONFIG (4 rows) ────────────────────────────────────────
const LANES = [300, 360, 420, 480];

// ── ENEMY VISUAL SIZE & SPACING ─────────────────────────────────
const ENEMY_VISUAL_SCALE = 4.4;
const ENEMY_SPACING = 160;
const LANE_PROXIMITY = 60;

// ── BARRIER ZONE CONFIG ─────────────────────────────────────────
const BARRIER_ZONE_X = 520;
const BARRIER_ZONE_RIGHT_EDGE = BARRIER_ZONE_X + 120;

// ── GAME VARIABLES ──────────────────────────────────────────────
let player, enemies, fireballs, stopLine, barrierZone;
let statsOverlay, statsCloseButton, statsGridContainer;
let topLeftStatsText, boostLabelText, boostBarBackground, boostBarFill;
let shootTimer;
let playerStats = { boost: 0 };
let statsButton;
let selectionOverlay;
let laneLastRightmost = {};
let gold = 0;
let goldText;
let goldIcon;

// =============================================
// BOOST & STATS HELPERS
// =============================================

function applyBoostBonuses() {
    const base = CHARACTER.baseStats;

    playerStats.attack = base.attack;
    playerStats.projectileTravelSpeed = base.projectileTravelSpeed;
    playerStats.fireRate = base.fireRate;
    playerStats.projectilesCount = base.projectilesCount;
    playerStats.pierce = base.pierce;

    CHARACTER.boostProgression.forEach(bonus => {
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
    const costumeName = COSTUMES[currentCostumeIndex].name;
    topLeftStatsText.setText(`${costumeName}`);
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
    const costumeName = COSTUMES[currentCostumeIndex].name;
    const titleText = statsGridContainer.scene.add.text(0, -220, `${costumeName} Stats`, {
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

        this.add.text(720, 80, 'Elementa', { fontSize: '48px', fill: '#ffffff', stroke: '#000000', strokeThickness: 10 }).setOrigin(0.5);

        boostLabelText = this.add.text(20, 60, '', { fontSize: '32px', fill: '#ffffff', stroke: '#000000', strokeThickness: 6 });

        const barX = 130, barY = 85, barWidth = 220, barHeight = 18;
        boostBarBackground = this.add.rectangle(barX, barY, barWidth, barHeight, 0x000000).setStrokeStyle(2, 0xffffff).setOrigin(0.5, -0.5);
        boostBarFill = this.add.rectangle(barX, barY, barWidth, barHeight - 4, 0x00ff88).setOrigin(0.5, -0.5);
        updateBoostBar();

        gold = 0;
        const goldIconX = 1350;
        const goldIconY = 45;

        goldIcon = this.add.circle(goldIconX, goldIconY, 22, 0xffd700)
            .setStrokeStyle(4, 0x000000)
            .setDepth(20);

        goldText = this.add.text(goldIconX - 20, goldIconY, '0', {
            fontSize: '38px',
            fontStyle: 'bold',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 8
        })
        .setOrigin(1, 0.5)
        .setDepth(20);

        this.updateGoldCounter();

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

        barrierZone = this.add.rectangle(BARRIER_ZONE_X, 360, 120, 720, 0x00ff00, 0);
        this.physics.add.existing(barrierZone);
        barrierZone.body.allowGravity = false;
        barrierZone.body.immovable = true;
        barrierZone.body.moves = false;

        statsButton = this.add.text(400, 40, 'Stats', {
            fontSize: '32px',
            fill: '#00ffcc',
            backgroundColor: '#444444',
            padding: { left: 16, right: 16, top: 8, bottom: 8 }
        }).setOrigin(1, 0)
          .setInteractive()
          .setVisible(false);

        statsOverlay = this.add.container(720, 360).setDepth(15).setVisible(false);

        const overlayBgStats = this.add.rectangle(0, 0, 760, 520, 0x112233)
            .setAlpha(0.88)
            .setStrokeStyle(4, 0x88ccff);
        statsOverlay.add(overlayBgStats);

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

        LANES.forEach(laneY => {
            laneLastRightmost[laneY] = BARRIER_ZONE_RIGHT_EDGE;
        });
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

    const dividerX = -overlayW * 0.15;
    this.selectionOverlay.add(
        this.add.line(dividerX, -overlayH/2 + 80, dividerX, overlayH - 160, 0xffffff, 0.6)
            .setLineWidth(3)
    );

    // ── LEFT SECTION ────────────────────────────────────────────
    const leftCenterX = -overlayW * 0.28;
    const previewContainer = this.add.container(leftCenterX, -overlayH/2 + 240);
    this.selectionOverlay.add(previewContainer);

    this.bigPreviewSprite = null;

    this.previewName = this.add.text(0, 180, COSTUMES[0].name, {
        fontSize: '44px',
        fontStyle: 'bold',
        fill: '#aaffdd',
        stroke: '#000000',
        strokeThickness: 10,
        align: 'center'
    }).setOrigin(0.5);
    previewContainer.add(this.previewName);

    const arrowOffset = 180;

    const leftArrow = this.add.text(-arrowOffset, 180, '←', {
        fontSize: '80px',
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 12
    }).setOrigin(0.5).setInteractive()
      .on('pointerdown', () => {
          currentCostumeIndex = (currentCostumeIndex - 1 + COSTUMES.length) % COSTUMES.length;
          this.updateCharacterPreview();
      })
      .on('pointerover', () => leftArrow.setStyle({ fill: '#ffff88' }))
      .on('pointerout', () => leftArrow.setStyle({ fill: '#ffffff' }));
    previewContainer.add(leftArrow);

    const rightArrow = this.add.text(arrowOffset, 180, '→', {
        fontSize: '80px',
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 12
    }).setOrigin(0.5).setInteractive()
      .on('pointerdown', () => {
          currentCostumeIndex = (currentCostumeIndex + 1) % COSTUMES.length;
          this.updateCharacterPreview();
      })
      .on('pointerover', () => rightArrow.setStyle({ fill: '#ffff88' }))
      .on('pointerout', () => rightArrow.setStyle({ fill: '#ffffff' }));
    previewContainer.add(rightArrow);

    // ── RIGHT SECTION ───────────────────────────────────────────
    const rightBaseX = overlayW * 0.10;
    const gridTopY   = -overlayH/2 + 80;

    const buttonWidth  = 240;
    const buttonHeight = 60;
    const colSpacing   = 280;
    const rowSpacing   = 80;

    this.add.text(rightBaseX + colSpacing / 2, gridTopY - 50, 'CHOOSE TWO ELEMENTS', {
        fontSize: '38px',
        fontStyle: 'bold',
        fill: '#ffdd88',
        stroke: '#000000',
        strokeThickness: 8
    }).setOrigin(0.5);

    // Store all active button containers so we can reset highlights
    this.activeButtons = [];

    this.selectedElements = [...COSTUMES[currentCostumeIndex].preselected];

    let fireButton = null;
    let shurikenButton = null;

    const elements = [
        { name: 'FIRE',      color: 0xff4444, border: 0xff8800, key: 'fire',   active: true  },
        { name: 'SHURIKEN',  color: 0x6666ff, border: 0x4444ff, key: 'shuriken', active: true  },
        { name: 'Locked',    color: 0x555555, border: 0x333333, key: null,     active: false },
        { name: 'Locked',    color: 0x555555, border: 0x333333, key: null,     active: false },
        { name: 'Locked',    color: 0x555555, border: 0x333333, key: null,     active: false },
        { name: 'Locked',    color: 0x555555, border: 0x333333, key: null,     active: false },
        { name: 'Locked',    color: 0x555555, border: 0x333333, key: null,     active: false },
        { name: 'Locked',    color: 0x555555, border: 0x333333, key: null,     active: false },
        { name: 'Locked',    color: 0x555555, border: 0x333333, key: null,     active: false },
        { name: 'Locked',    color: 0x555555, border: 0x333333, key: null,     active: false }
    ];

    elements.forEach((el, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);

        const btnX = rightBaseX + col * colSpacing;
        const btnY = gridTopY + row * rowSpacing;

        const btnContainer = this.add.container(btnX, btnY);
        this.selectionOverlay.add(btnContainer);

        const bg = this.add.rectangle(0, 0, buttonWidth, buttonHeight, el.color)
            .setStrokeStyle(6, el.border);
        btnContainer.add(bg);

        const txt = this.add.text(0, 0, el.name, {
            fontSize: el.name.length > 6 ? '30px' : '38px',
            fontStyle: 'bold',
            fill: el.active ? '#ffffff' : '#aaaaaa',
            stroke: '#000000',
            strokeThickness: el.active ? 8 : 6,
            align: 'center'
        }).setOrigin(0.5);
        btnContainer.add(txt);

        if (el.active) {
            btnContainer.setInteractive(
                new Phaser.Geom.Rectangle(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight),
                Phaser.Geom.Rectangle.Contains
            );

            // Store for later reset
            this.activeButtons.push({ container: btnContainer, bg: bg, key: el.key, border: el.border });

            if (el.name === 'FIRE') fireButton = btnContainer;
            if (el.name === 'SHURIKEN') shurikenButton = btnContainer;

            btnContainer.on('pointerdown', () => {
                const elementKey = el.key;
                if (!elementKey) return;

                const costume = COSTUMES[currentCostumeIndex];

                // Prevent deselecting preselected items
                if (costume.preselected.includes(elementKey)) {
                    return;
                }

                if (this.selectedElements.includes(elementKey)) {
                    this.selectedElements = this.selectedElements.filter(e => e !== elementKey);
                    bg.setStrokeStyle(6, el.border);
                    bg.setScale(1);
                } else if (this.selectedElements.length < 2) {
                    this.selectedElements.push(elementKey);
                    bg.setStrokeStyle(10, 0xffff00);
                    bg.setScale(1.08);
                }

                this.updateStartButtonState();
            })
            .on('pointerover', () => {
                if (!this.selectedElements.includes(el.key)) {
                    bg.setFillStyle(Phaser.Display.Color.IntegerToColor(el.color).lighten(25).color);
                }
            })
            .on('pointerout', () => {
                if (!this.selectedElements.includes(el.key)) {
                    bg.setFillStyle(el.color);
                }
            });
        } else {
            btnContainer.setAlpha(0.55);
        }
    });

    this.startButton = this.add.text(0, overlayH/2 - 90, 'SELECT TWO ELEMENTS', {
        fontSize: '46px',
        fontStyle: 'bold',
        fill: '#888888',
        backgroundColor: '#333333',
        padding: { left: 80, right: 80, top: 30, bottom: 30 },
        stroke: '#000000',
        strokeThickness: 10
    })
    .setOrigin(0.5)
    .setAlpha(0.6)
    .setInteractive();

    this.startButton.on('pointerdown', () => {
        if (this.selectedElements.length === 2) {
            this.selectionOverlay.setVisible(false);
            this.resumeGameplay();
        }
    });

    this.selectionOverlay.add(this.startButton);

    // ── Helper methods ─────────────────────────────────────────

    this.updateStartButtonState = () => {
        const preCount = COSTUMES[currentCostumeIndex].preselected.length;
        const needed = 2 - preCount;

        if (this.selectedElements.length === 2) {
            this.startButton.setText('DEFEND THE CASTLE');
            this.startButton.setStyle({
                fill: '#ffffff',
                backgroundColor: '#006633'
            }).setAlpha(1);
        } else {
            this.startButton.setText(needed > 0 ? `SELECT ${needed} MORE` : 'SELECT TWO ELEMENTS');
            this.startButton.setStyle({
                fill: '#888888',
                backgroundColor: '#333333'
            }).setAlpha(0.6);
        }
    };

    this.updateCharacterPreview = () => {
        if (this.bigPreviewSprite) this.bigPreviewSprite.destroy();
        const costume = COSTUMES[currentCostumeIndex];

        this.bigPreviewSprite = this.add.sprite(0, 60, CHARACTER.spriteKey)
            .setScale(3.5)
            .setOrigin(0.5, 0.8)
            .setFrame(costume.frameOffset)
            .play('idle_cycle');
        previewContainer.add(this.bigPreviewSprite);

        this.previewName.setText(costume.name);

        const nameWidth = this.previewName.width;
        const maxNameWidth = arrowOffset * 2 - 60;

        if (nameWidth > maxNameWidth) {
            this.previewName.setScale(maxNameWidth / nameWidth);
        } else {
            this.previewName.setScale(1);
        }

        // Reset all button highlights first
        this.activeButtons.forEach(btn => {
            if (btn.key) {
                btn.bg.setStrokeStyle(6, btn.border);
                btn.bg.setScale(1);
            }
        });

        // Reset selections to this costume's preselected
        this.selectedElements = [...costume.preselected];

        // Re-apply highlights ONLY to preselected for this costume
        this.activeButtons.forEach(btn => {
            if (costume.preselected.includes(btn.key)) {
                btn.bg.setStrokeStyle(10, 0xffff00);
                btn.bg.setScale(1.08);
            }
        });

        this.updateStartButtonState();
    };

    // Initial setup
    this.updateStartButtonState();
    this.updateCharacterPreview();
}

    // ── GAME METHODS ─────────────────────────────────────────────

    pauseGameplay() {
        this.physics.pause();
        if (shootTimer) shootTimer.paused = true;
    }

    resumeGameplay() {
        if (boostLabelText) {
            const costumeName = COSTUMES[currentCostumeIndex].name;
            boostLabelText.setText(`${costumeName}:`);
        }

        if (player) player.destroy();

        const costume = COSTUMES[currentCostumeIndex];

        player = this.physics.add.sprite(280, 520, CHARACTER.spriteKey);
        player.setScale(CHARACTER.spriteScale);
        player.setOrigin(0.5, 1.0);
        player.setFrame(costume.frameOffset);
        player.body.setSize(32, 64);
        player.body.setOffset(16, 0);
        player.body.immovable = true;
        player.anims.play('idle_cycle');

        this.spawnInitialPackedRows();

        this.physics.resume();

        applyBoostBonuses();

        gold = 0;
        this.updateGoldCounter();

        this.useFireNext = true;

        shootTimer = this.time.addEvent({
            delay: 1000 / playerStats.fireRate,
            callback: this.autoShootAtNearest,
            callbackScope: this,
            loop: true
        });

        this.time.addEvent({
            delay: 150,
            callback: this.updateLaneMovement,
            callbackScope: this,
            loop: true
        });

        this.time.addEvent({
            delay: 800,
            callback: () => {
                LANES.forEach(lane => this.refillLane(lane));
            },
            callbackScope: this,
            loop: true
        });

        updateTopLeftStats();
    }

    spawnEnemyInLane(laneY, atX) {
        const enemy = enemies.create(atX, laneY, 'slime');
        enemy.setScale(ENEMY_VISUAL_SCALE);
        enemy.setTint(ENEMY_BASE.tint);
        enemy.play('slime_anim');

        enemy.health = ENEMY_BASE.health;
        enemy.maxHealth = ENEMY_BASE.health;

        const variedSpeed = ENEMY_BASE.speed * Phaser.Math.FloatBetween(0.9, 1.1);
        enemy.originalSpeed = -variedSpeed;

        enemy.setVelocityX(0);
        enemy.setVelocityY(0);

        if (enemy.body) {
            enemy.body.setBounce(0);
            enemy.body.setSize(enemy.width * 0.5, enemy.height * 0.5);
            enemy.body.setOffset((enemy.width - enemy.body.width) / 2, (enemy.height - enemy.body.height) / 2);
        }

        laneLastRightmost[laneY] = Math.max(laneLastRightmost[laneY], atX);

        return enemy;
    }

    spawnInitialPackedRows() {
        const gap = ENEMY_SPACING;
        const startX = BARRIER_ZONE_RIGHT_EDGE;

        LANES.forEach(laneY => {
            let x = startX;
            while (x < 1500) {
                this.spawnEnemyInLane(laneY, x);
                x += gap;
            }
        });
    }

    getRightmostInLane(laneY) {
        let rightmost = BARRIER_ZONE_RIGHT_EDGE - ENEMY_SPACING;
        enemies.children.iterate(e => {
            if (e.active && Math.abs(e.y - laneY) < 40) {
                if (e.x > rightmost) rightmost = e.x;
            }
        });
        return rightmost;
    }

    refillLane(laneY) {
        const rightmost = this.getRightmostInLane(laneY);
        const nextX = rightmost + ENEMY_SPACING;

        if (nextX < 1480) {
            this.spawnEnemyInLane(laneY, nextX);
        }
    }

    updateLaneMovement() {
        LANES.forEach(laneY => {
            let frontEnemy = null;
            let minX = Infinity;

            enemies.children.iterate(e => {
                if (e.active && Math.abs(e.y - laneY) < 40) {
                    if (e.x < minX) {
                        minX = e.x;
                        frontEnemy = e;
                    }
                }
            });

            const shouldMove = minX > BARRIER_ZONE_RIGHT_EDGE + 20;

            enemies.children.iterate(e => {
                if (e.active && Math.abs(e.y - laneY) < 40) {
                    if (shouldMove) {
                        e.setVelocityX(e.originalSpeed);
                    } else {
                        e.setVelocityX(0);
                        e.setVelocityY(0);
                    }
                }
            });
        });
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
            const target = priority[i];

            let config;
            if (this.selectedElements.length === 0) {
                config = FIRE_CONFIG;
            } else if (this.selectedElements.length === 1) {
                config = this.selectedElements[0] === 'fire' ? FIRE_CONFIG : SHURIKEN_CONFIG;
            } else {
                config = this.useFireNext ? FIRE_CONFIG : SHURIKEN_CONFIG;
                this.useFireNext = !this.useFireNext;
            }

            this.shootAtTarget(target, config);
        }
    }

    shootAtTarget(target, config) {
        if (!target || !target.active) return;

        const spawnX = player.x;
        const spawnY = player.y - (player.displayHeight / 2);

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

    hitEnemy(projectile, enemy) {
        if (projectile.hitEnemies.has(enemy)) return;
        projectile.hitEnemies.add(enemy);

        const damage = playerStats.attack;
        enemy.health -= damage;

        this.createFloatingDamageText(enemy.x, enemy.y, damage);

        if (enemy.health < enemy.maxHealth) {
            enemy.setTint(0xffaa00);
        }

        if (enemy.health <= 0) {
            if (Math.random() < 0.9) {
                this.createGoldDrop(enemy.x, enemy.y);
                gold++;
                this.updateGoldCounter();
            }

            const laneY = Math.round(enemy.y / 60) * 60;
            enemy.destroy();

            playerStats.boost = Math.min(playerStats.boost + BOOST_PER_KILL, MAX_BOOST);
            applyBoostBonuses();
            updateBoostBar();
            if (shootTimer) shootTimer.delay = 1000 / playerStats.fireRate;

            this.refillLane(laneY);
        }

        projectile.pierceHits = (projectile.pierceHits || 0) + 1;
        if (projectile.pierceHits > playerStats.pierce) {
            projectile.destroy();
        }
    }

    createFloatingDamageText(x, y, damageAmount) {
        const text = this.add.text(x, y, `-${damageAmount}`, {
            fontSize: '28px',
            fontFamily: 'Arial',
            color: '#ff4444',
            stroke: '#000000',
            strokeThickness: 6,
            shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 3, fill: true }
        }).setOrigin(0.5, 1.0);

        text.setPosition(x, y - 30);

        const randomOffset = Phaser.Math.Between(-12, 12);
        text.x += randomOffset;

        this.tweens.add({
            targets: text,
            y: text.y - 80,
            alpha: 0,
            scale: 1.4,
            duration: 900,
            ease: 'Quad.easeOut',
            onComplete: () => text.destroy()
        });

        this.tweens.add({
            targets: text,
            scale: 1.0,
            duration: 400,
            ease: 'Quad.easeOut',
            delay: 100
        });
    }

    updateGoldCounter() {
        if (!goldText) return;
        goldText.setText(`${gold}`);
        const padding = 15;
        goldText.x = goldIcon.x - padding - goldText.width;
    }

    createGoldDrop(fromX, fromY) {
        const goldDrop = this.add.circle(fromX, fromY - 20, 20, 0xffd700)
            .setStrokeStyle(3, 0x000000)
            .setDepth(30)
            .setAlpha(1);

        const targetX = goldIcon.x;
        const targetY = goldIcon.y;

        this.tweens.add({
            targets: goldDrop,
            x: targetX,
            y: targetY,
            scale: 1.3,
            alpha: 0,
            rotation: Math.PI * 8,
            duration: 1500,
            ease: 'Sine.easeInOut',
            onComplete: () => goldDrop.destroy()
        });
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