import React, { useState, useEffect, useRef } from 'react';
import { Shield, Target, Trophy, AlertTriangle, RefreshCw, Languages, Flame, Sparkles, Zap, ArrowUpCircle, Sword, Skull, GraduationCap, Github, Globe } from 'lucide-react';

/**
 * 游戏配置常量 - 适配生产环境
 */
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const WIN_SCORE = 1000;
const UPGRADE_SCORE = 200; 
const ENEMY_POINTS = 20;

const TEXTS = {
  zh: {
    title: "CHENCHEN NOVA DEFENSE",
    subtitle: "奥术科技：地狱觉醒",
    start: "启动法阵",
    restart: "重新充能",
    win: "圣光在上！星域已稳固",
    lose: "寂灭！魔网彻底崩塌",
    score: "魔力碎片",
    target: "目标量",
    ammo: "符文能量",
    wave: "波动等级",
    upgrade: "奥术升阶：能量上限提升！",
    difficulty: "难度选择",
    diff_easy: "学徒",
    diff_normal: "大师",
    diff_hard: "至尊",
    winDesc: "奇迹！你融合了禁忌科技与上古奥术，成功击退了虚空大军。",
    loseDesc: "混沌吞噬了一切。所有的奥术塔已熄灭，城市化作尘埃。",
    guide: "利用符文导弹拦截混沌之箭。魔法阵的连锁引爆将净化虚空！",
    footer: "由 React + Tailwind CSS 驱动 | 部署于 Vercel"
  },
  en: {
    title: "CHENCHEN NOVA DEFENSE",
    subtitle: "Arcane Tech: Hell Awakening",
    start: "ACTIVATE RITUAL",
    restart: "RECHARGE",
    win: "VICTORY! STAR SECTOR STABILIZED",
    lose: "ANNIHILATION! MANA WEB COLLAPSED",
    score: "MANA SHARDS",
    target: "GOAL",
    ammo: "RUNE ENERGY",
    wave: "WAVE LEVEL",
    upgrade: "ARCANE ASCENSION: AMMO UPGRADED!",
    difficulty: "DIFFICULTY",
    diff_easy: "Apprentice",
    diff_normal: "Master",
    diff_hard: "Grandmaster",
    winDesc: "Incredible! You merged forbidden tech with ancient arcane to repel the Void.",
    loseDesc: "Chaos has consumed all. Arcane Spires dark. Cities turned to dust.",
    guide: "Intercept Chaos Arrows with Rune Missiles. Alchemical explosions will purge the Void!",
    footer: "Powered by React + Tailwind | Deployed on Vercel"
  }
};

const App = () => {
  const [lang, setLang] = useState('zh');
  const [gameState, setGameState] = useState('MENU');
  const [difficulty, setDifficulty] = useState('NORMAL'); 
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [isUpgraded, setIsUpgraded] = useState(false);
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const t = TEXTS[lang];

  class GameEngine {
    constructor(ctx, onScoreUpdate, onGameStateChange, onUpgrade, diff) {
      this.ctx = ctx;
      this.onScoreUpdate = onScoreUpdate;
      this.onGameStateChange = onGameStateChange;
      this.onUpgrade = onUpgrade;
      this.difficulty = diff;
      this.reset();
    }

    reset() {
      this.score = 0;
      this.wave = 1;
      this.upgraded = false;
      this.enemies = [];
      this.missiles = [];
      this.explosions = [];
      this.particles = [];
      this.upgradeMessageTimer = 0;
      
      let ammoMult = 1.0;
      this.spawnRateBase = 800;
      this.speedBase = 0.45;

      if (this.difficulty === 'EASY') {
        ammoMult = 1.5;
        this.spawnRateBase = 1200;
        this.speedBase = 0.35;
      } else if (this.difficulty === 'HARD') {
        ammoMult = 0.8;
        this.spawnRateBase = 550;
        this.speedBase = 0.6;
      }

      this.silos = [
        { id: 0, x: 80, y: 560, ammo: Math.floor(40 * ammoMult), maxAmmo: Math.floor(40 * ammoMult), active: true, width: 60, height: 60, crystalRot: 0 },
        { id: 1, x: 400, y: 560, ammo: Math.floor(80 * ammoMult), maxAmmo: Math.floor(80 * ammoMult), active: true, width: 80, height: 80, crystalRot: 0 },
        { id: 2, x: 720, y: 560, ammo: Math.floor(40 * ammoMult), maxAmmo: Math.floor(40 * ammoMult), active: true, width: 60, height: 60, crystalRot: 0 },
      ];

      this.cities = [
        { x: 180, y: 580, active: true }, { x: 260, y: 580, active: true }, { x: 340, y: 580, active: true },
        { x: 460, y: 580, active: true }, { x: 540, y: 580, active: true }, { x: 620, y: 580, active: true },
      ];

      this.lastEnemySpawn = 0;
      this.spawnRate = this.spawnRateBase;
      this.frameCount = 0;

      for(let i=0; i<40; i++) {
        this.particles.push({
          x: Math.random() * CANVAS_WIDTH,
          y: Math.random() * CANVAS_HEIGHT,
          vx: (Math.random() - 0.5) * 0.3,
          vy: Math.random() * 0.6,
          size: Math.random() * 2,
          color: Math.random() > 0.5 ? '#4cc9f0' : '#bd00ff'
        });
      }
    }

    spawnEnemy() {
      const startX = Math.random() * CANVAS_WIDTH;
      const targets = [
        ...this.cities.filter(c => c.active),
        ...this.silos.filter(s => s.active)
      ];
      if (targets.length === 0) return;
      const target = targets[Math.floor(Math.random() * targets.length)];
      
      const speed = this.speedBase + (this.wave * 0.15) + (Math.random() * 0.4);
      const angle = Math.atan2(target.y - 0, target.x - startX);

      this.enemies.push({
        x: startX, y: 0, targetX: target.x, targetY: target.y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        angle: angle, originX: startX, originY: 0,
        chaosEnergy: Math.random() * Math.PI * 2
      });
    }

    fireMissile(targetX, targetY) {
      let bestSilo = null;
      let minDist = Infinity;
      this.silos.forEach(silo => {
        if (silo.active && silo.ammo > 0) {
          const d = Math.abs(silo.x - targetX);
          if (d < minDist) { minDist = d; bestSilo = silo; }
        }
      });

      if (bestSilo) {
        bestSilo.ammo--;
        const speed = 13;
        const angle = Math.atan2(targetY - bestSilo.y, targetX - bestSilo.x);
        this.missiles.push({
          x: bestSilo.x, y: bestSilo.y - 40, targetX, targetY,
          vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          angle: angle
        });
      }
    }

    createExplosion(x, y, radius = 55, color = '#4cc9f0') {
      const finalRadius = this.upgraded ? radius * 1.35 : radius;
      this.explosions.push({
        x, y, r: 1, maxR: finalRadius, expanding: true, color, 
        rot: Math.random() * Math.PI,
        magicCircleType: Math.floor(Math.random() * 2)
      });
    }

    update(deltaTime) {
      this.frameCount++;
      this.lastEnemySpawn += deltaTime;
      if (this.lastEnemySpawn > this.spawnRate) {
        this.spawnEnemy();
        this.lastEnemySpawn = 0;
        const minRate = this.difficulty === 'HARD' ? 180 : 350;
        this.spawnRate = Math.max(minRate, this.spawnRateBase - (this.wave * 125));
      }

      this.particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if(p.y > CANVAS_HEIGHT) p.y = 0;
      });

      if (this.score >= UPGRADE_SCORE && !this.upgraded) {
        this.upgraded = true;
        this.onUpgrade(true);
        this.upgradeMessageTimer = 180; 
        this.silos.forEach(s => {
          if (s.active) {
            s.maxAmmo = Math.floor(s.maxAmmo * 1.5);
            s.ammo = s.maxAmmo; 
          }
        });
        for(let i=0; i<60; i++) {
          this.particles.push({
            x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2,
            vx: (Math.random() - 0.5) * 12, vy: (Math.random() - 0.5) * 12,
            size: Math.random() * 6 + 2, color: '#ffd700', life: 80
          });
        }
      }

      if (this.upgradeMessageTimer > 0) this.upgradeMessageTimer--;

      this.enemies.forEach((enemy, index) => {
        enemy.x += enemy.vx; enemy.y += enemy.vy;
        enemy.chaosEnergy += 0.12;
        if (enemy.y >= enemy.targetY) {
          this.createExplosion(enemy.x, enemy.y, 45, '#bd00ff');
          this.checkImpact(enemy.x, enemy.y);
          this.enemies.splice(index, 1);
        }
      });

      this.missiles.forEach((m, index) => {
        m.x += m.vx; m.y += m.vy;
        const currentDist = Math.hypot(m.targetX - m.x, m.targetY - m.y);
        if (currentDist < 16 || m.y < 0) {
          this.createExplosion(m.targetX, m.targetY);
          this.missiles.splice(index, 1);
        }
      });

      this.explosions.forEach((ex, index) => {
        if (ex.expanding) {
          ex.r += 3.0;
          if (ex.r >= ex.maxR) ex.expanding = false;
        } else {
          ex.r -= 1.6;
        }
        if (ex.r <= 0) this.explosions.splice(index, 1);

        this.enemies.forEach((enemy, eIdx) => {
          if (Math.hypot(enemy.x - ex.x, enemy.y - ex.y) < ex.r) {
            this.enemies.splice(eIdx, 1);
            this.score += ENEMY_POINTS;
            this.onScoreUpdate(this.score);
            this.createExplosion(enemy.x, enemy.y, 35, '#ffd700');
            if (this.score >= WIN_SCORE) this.onGameStateChange('WON');
          }
        });
      });

      this.silos.forEach(s => { if(s.active) s.crystalRot += 0.06; });

      if (this.score > this.wave * 200 && !this.isWaveClearing) {
        this.wave++;
        this.silos.forEach(s => { if (s.active) s.ammo = s.maxAmmo; });
      }
    }

    checkImpact(x, y) {
      const impactRadius = 55;
      this.cities.forEach(city => {
        if (city.active && Math.abs(city.x - x) < impactRadius) city.active = false;
      });
      this.silos.forEach(silo => {
        if (silo.active && Math.abs(silo.x - x) < impactRadius) silo.active = false;
      });
      if (this.silos.every(s => !s.active)) this.onGameStateChange('LOST');
    }

    drawMissileEntity(x, y, angle, type, data) {
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      if (type === 'enemy') {
        const scale = 2.0;
        const flicker = Math.sin(data.chaosEnergy * 2.5) * 6;
        const flameGrad = ctx.createLinearGradient(-25 * scale, 0, -5 * scale, 0);
        flameGrad.addColorStop(0, 'rgba(189, 0, 255, 0)');
        flameGrad.addColorStop(0.5, 'rgba(189, 0, 255, 0.9)');
        flameGrad.addColorStop(1, '#ff00ff');
        ctx.fillStyle = flameGrad;
        ctx.beginPath();
        ctx.moveTo(-5 * scale, -4); ctx.lineTo((-18 - flicker) * scale, 0); ctx.lineTo(-5 * scale, 4); ctx.fill();
        ctx.fillStyle = '#1a0022'; 
        ctx.beginPath(); ctx.moveTo(-8 * scale, -4 * scale); ctx.lineTo(6 * scale, -2 * scale); ctx.lineTo(12 * scale, 0); ctx.lineTo(6 * scale, 2 * scale); ctx.lineTo(-8 * scale, 4 * scale); ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 12; ctx.shadowColor = '#bd00ff';
        ctx.fillStyle = '#bd00ff'; ctx.fillRect(-2 * scale, -1 * scale, 4 * scale, 2 * scale);
      } else {
        const scale = this.upgraded ? 3.0 : 2.4; 
        ctx.shadowBlur = 22; ctx.shadowColor = this.upgraded ? '#ffd700' : '#00f2ff';
        ctx.fillStyle = this.upgraded ? 'rgba(255, 215, 0, 0.7)' : 'rgba(0, 242, 255, 0.7)';
        ctx.beginPath(); ctx.arc(-10, 0, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = this.upgraded ? '#fff' : '#f0f9ff';
        ctx.beginPath(); ctx.moveTo(-8 * scale, -2 * scale); ctx.lineTo(8 * scale, -2 * scale); ctx.lineTo(14 * scale, 0); ctx.lineTo(8 * scale, 2 * scale); ctx.lineTo(-8 * scale, 2 * scale); ctx.closePath(); ctx.fill();
        const runeGlow = Math.sin(Date.now() / 90) * 0.5 + 0.5;
        ctx.fillStyle = this.upgraded ? `rgba(255, 215, 0, ${runeGlow})` : `rgba(0, 242, 255, ${runeGlow})`;
        ctx.fillRect(-2 * scale, -1.2 * scale, 4 * scale, 2.4 * scale);
        ctx.shadowBlur = 0;
      }
      ctx.restore();
    }

    drawMagicCircle(x, y, r, color, rot, type, isUpgradedSilo = false) {
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.strokeStyle = color;
      ctx.lineWidth = isUpgradedSilo ? 3 : 1.5;
      ctx.globalAlpha = isUpgradedSilo ? 0.9 : 0.6;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2); ctx.stroke();
      if (type === 0) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const ang = (i * Math.PI * 2) / 6;
          const nextAng = ((i + 2) * Math.PI * 2) / 6;
          ctx.moveTo(Math.cos(ang) * r * 0.9, Math.sin(ang) * r * 0.9);
          ctx.lineTo(Math.cos(nextAng) * r * 0.9, Math.sin(nextAng) * r * 0.9);
        }
        ctx.stroke();
      } else {
        ctx.strokeRect(-r*0.6, -r*0.6, r*1.2, r*1.2);
        ctx.save(); ctx.rotate(Math.PI / 4); ctx.strokeRect(-r*0.6, -r*0.6, r*1.2, r*1.2); ctx.restore();
      }
      ctx.restore();
    }

    draw() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      const bgGrad = ctx.createRadialGradient(CANVAS_WIDTH/2, CANVAS_HEIGHT/2, 0, CANVAS_WIDTH/2, CANVAS_HEIGHT/2, CANVAS_WIDTH);
      bgGrad.addColorStop(0, '#0a0a24'); bgGrad.addColorStop(1, '#02020a');
      ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      this.particles.forEach(p => {
        ctx.fillStyle = p.color; ctx.globalAlpha = 0.25;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        if (p.life) p.life--;
      });
      ctx.globalAlpha = 1.0;

      // 绘制环境网格
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.03)';
      for(let i=0; i<CANVAS_WIDTH; i+=50) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_HEIGHT); ctx.stroke(); }
      for(let j=0; j<CANVAS_HEIGHT; j+=50) { ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(CANVAS_WIDTH, j); ctx.stroke(); }

      this.cities.forEach(city => {
        if (!city.active) return;
        ctx.save();
        ctx.shadowBlur = 18; ctx.shadowColor = '#38bdf8';
        ctx.fillStyle = '#38bdf8'; ctx.fillRect(city.x - 12, city.y - 25, 24, 25);
        ctx.beginPath(); ctx.arc(city.x, city.y, 42, Math.PI, 0);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)'; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.restore();
      });

      this.silos.forEach(silo => {
        const cx = silo.x; const cy = 560;
        const w = silo.width; const h = silo.height;
        if (!silo.active) {
          ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.moveTo(cx-w/2, cy); ctx.lineTo(cx, cy-20); ctx.lineTo(cx+w/2, cy); ctx.fill();
          return;
        }

        if (this.upgraded) {
          this.drawMagicCircle(cx, cy, 55, '#ffd700', Date.now()/850, 0, true);
        }

        const baseGrad = ctx.createLinearGradient(cx - w/2, cy, cx + w/2, cy);
        baseGrad.addColorStop(0, '#1e293b'); baseGrad.addColorStop(0.5, this.upgraded ? '#d97706' : '#2563eb'); baseGrad.addColorStop(1, '#1e293b');
        ctx.fillStyle = baseGrad;
        ctx.beginPath(); ctx.moveTo(cx-w/2, cy+20); ctx.lineTo(cx-w/3, cy-h*0.3); ctx.lineTo(cx+w/3, cy-h*0.3); ctx.lineTo(cx+w/2, cy+20); ctx.fill();

        ctx.save();
        ctx.translate(cx, cy - h*0.6 + Math.sin(Date.now()/280)*6);
        ctx.rotate(silo.crystalRot);
        const crystalColor = silo.ammo > 0 ? (this.upgraded ? '#fbbf24' : '#0ea5e9') : '#f43f5e';
        ctx.shadowBlur = 30; ctx.shadowColor = crystalColor;
        ctx.fillStyle = crystalColor;
        ctx.beginPath();
        const crySize = this.upgraded ? w/2.8 : w/3.5;
        ctx.moveTo(0, -crySize); ctx.lineTo(crySize/1.4, 0); ctx.lineTo(0, crySize); ctx.lineTo(-crySize/1.4, 0);
        ctx.closePath(); ctx.fill();
        ctx.restore();

        const ammoPercent = silo.ammo / silo.maxAmmo;
        ctx.fillStyle = '#000000cc'; ctx.fillRect(cx - 28, cy + 14, 56, 10);
        ctx.fillStyle = ammoPercent < 0.25 ? '#f43f5e' : (this.upgraded ? '#fbbf24' : '#0ea5e9');
        ctx.fillRect(cx - 28, cy + 14, 56 * ammoPercent, 10);
      });

      this.enemies.forEach(e => {
        this.drawMissileEntity(e.x, e.y, e.angle, 'enemy', e);
      });

      this.missiles.forEach(m => {
        this.drawMissileEntity(m.x, m.y, m.angle, 'player', m);
      });

      this.explosions.forEach(ex => {
        this.drawMagicCircle(ex.x, ex.y, ex.r, ex.color, ex.rot, ex.magicCircleType);
        const gradient = ctx.createRadialGradient(ex.x, ex.y, 0, ex.x, ex.y, ex.r);
        gradient.addColorStop(0, '#fff');
        gradient.addColorStop(0.3, ex.color);
        gradient.addColorStop(0.7, ex.color + '33');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath(); ctx.arc(ex.x, ex.y, ex.r, 0, Math.PI * 2); ctx.fill();
      });

      if (this.upgradeMessageTimer > 0) {
        ctx.save();
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 44px italic sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 25; ctx.shadowColor = '#fbbf24';
        ctx.globalAlpha = Math.min(1, this.upgradeMessageTimer / 25);
        ctx.fillText(TEXTS[lang].upgrade, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);
        ctx.restore();
      }
    }
  }

  useEffect(() => {
    if (gameState === 'PLAYING') {
      const ctx = canvasRef.current.getContext('2d');
      const engine = new GameEngine(ctx, setScore, setGameState, setIsUpgraded, difficulty);
      engineRef.current = engine;
      let lastTime = 0;
      const loop = (time) => {
        const deltaTime = time - lastTime; lastTime = time;
        if (gameState === 'PLAYING') {
          engine.update(deltaTime); engine.draw();
          requestAnimationFrame(loop);
        }
      };
      requestAnimationFrame(loop);
    }
  }, [gameState, difficulty]);

  const handleInteraction = (e) => {
    if (gameState !== 'PLAYING' || !engineRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    const scaleX = CANVAS_WIDTH / rect.width; const scaleY = CANVAS_HEIGHT / rect.height;
    const x = (clientX - rect.left) * scaleX; const y = (clientY - rect.top) * scaleY;
    engineRef.current.fireMissile(x, y);
  };

  const startGame = () => { 
    setScore(0); 
    setWave(1); 
    setIsUpgraded(false);
    setGameState('PLAYING'); 
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#020206] text-slate-100 p-4 font-sans select-none selection:bg-sky-500/30">
      
      {/* 生产环境 HUD */}
      <div className="w-full max-w-[800px] flex items-center justify-between mb-5 bg-slate-900/40 p-5 rounded-[2rem] border border-sky-900/40 backdrop-blur-2xl shadow-2xl">
        <div className="flex flex-col">
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-white to-sky-400 tracking-tighter uppercase italic flex items-center gap-3">
            <Zap className="text-sky-400 animate-pulse" size={24} /> {t.title}
          </h1>
          <div className="flex items-center gap-6 mt-1.5 opacity-80">
             <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
               <Sparkles size={13} className="text-purple-400" /> {t.score}: <span className="text-sky-400 text-sm font-black">{score}</span>
             </span>
             <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
               <Skull size={13} className={difficulty === 'HARD' ? "text-rose-500" : "text-slate-500"} /> {t.target}: <span className="text-white text-sm font-black">1000</span>
             </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setLang(l => l === 'zh' ? 'en' : 'zh')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800/60 hover:bg-sky-900/40 rounded-xl text-xs font-black transition-all border border-sky-800/40 shadow-inner group"
          >
            <Languages size={15} className="group-hover:rotate-12 transition-transform" />
            {lang === 'zh' ? 'EN' : 'ZH'}
          </button>
        </div>
      </div>

      {/* 画布核心容器 */}
      <div className="relative w-full max-w-[800px] aspect-[4/3] bg-black rounded-[3.5rem] overflow-hidden shadow-[0_0_100px_rgba(14,165,233,0.15)] border-[6px] border-slate-900/80">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onMouseDown={handleInteraction}
          onTouchStart={(e) => { e.preventDefault(); handleInteraction(e); }}
          className="w-full h-full cursor-crosshair block bg-[#000005]"
        />

        {gameState !== 'PLAYING' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-[30px] p-12 text-center animate-in fade-in duration-1000">
            {gameState === 'MENU' && (
              <div className="max-w-md w-full animate-in zoom-in duration-700">
                <div className="w-24 h-24 bg-sky-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-sky-400 border border-sky-500/20 shadow-[0_0_60px_rgba(14,165,233,0.25)] ring-1 ring-sky-500/30">
                  <Shield size={48} />
                </div>
                <h2 className="text-5xl font-black mb-2 bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent italic tracking-tighter uppercase leading-tight">
                  {t.title}
                </h2>
                <p className="text-sky-500 text-xs font-black tracking-[0.4em] mb-10 opacity-70 italic">{t.subtitle}</p>
                
                <div className="mb-12">
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.5em] mb-5">{t.difficulty}</p>
                  <div className="grid grid-cols-3 gap-4">
                    <button 
                      onClick={() => setDifficulty('EASY')}
                      className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${difficulty === 'EASY' ? 'bg-sky-500/10 border-sky-500/60 shadow-[0_0_20px_rgba(14,165,233,0.3)]' : 'bg-slate-900/30 border-slate-800 opacity-50 hover:opacity-100'}`}
                    >
                      <GraduationCap size={24} className={difficulty === 'EASY' ? "text-sky-400" : "text-slate-400"} />
                      <span className="text-[10px] font-black uppercase tracking-widest">{t.diff_easy}</span>
                    </button>
                    <button 
                      onClick={() => setDifficulty('NORMAL')}
                      className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${difficulty === 'NORMAL' ? 'bg-purple-500/10 border-purple-500/60 shadow-[0_0_20px_rgba(168,85,247,0.3)]' : 'bg-slate-900/30 border-slate-800 opacity-50 hover:opacity-100'}`}
                    >
                      <Sword size={24} className={difficulty === 'NORMAL' ? "text-purple-400" : "text-slate-400"} />
                      <span className="text-[10px] font-black uppercase tracking-widest">{t.diff_normal}</span>
                    </button>
                    <button 
                      onClick={() => setDifficulty('HARD')}
                      className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${difficulty === 'HARD' ? 'bg-rose-500/10 border-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.3)]' : 'bg-slate-900/30 border-slate-800 opacity-50 hover:opacity-100'}`}
                    >
                      <Skull size={24} className={difficulty === 'HARD' ? "text-rose-400" : "text-slate-400"} />
                      <span className="text-[10px] font-black uppercase tracking-widest">{t.diff_hard}</span>
                    </button>
                  </div>
                </div>

                <button 
                  onClick={startGame}
                  className="group relative w-full py-6 bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 hover:from-sky-500 hover:to-purple-500 rounded-3xl font-black text-2xl transition-all hover:scale-[1.03] active:scale-95 shadow-[0_20px_40px_rgba(79,70,229,0.3)] overflow-hidden"
                >
                  <span className="relative z-10 flex items-center justify-center gap-4 text-white uppercase tracking-tighter">
                    <Zap size={28} className="fill-white" /> {t.start}
                  </span>
                  <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full duration-[1500ms] transition-transform skew-x-12" />
                </button>
              </div>
            )}

            {gameState === 'WON' && (
              <div className="max-w-md animate-in zoom-in duration-500">
                <div className="w-28 h-28 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-10 text-yellow-400 border border-yellow-500/20 shadow-[0_0_60px_rgba(234,179,8,0.25)]">
                  <Trophy size={56} />
                </div>
                <h2 className="text-5xl font-black mb-8 text-yellow-400 italic tracking-tighter uppercase">{t.win}</h2>
                <p className="text-slate-400 mb-6 text-lg font-medium leading-relaxed">{t.winDesc}</p>
                <div className="text-4xl font-black mb-12 text-white tracking-widest bg-slate-900/50 py-4 rounded-3xl border border-slate-800">{score}</div>
                <button 
                  onClick={() => setGameState('MENU')}
                  className="px-14 py-6 bg-white hover:bg-slate-100 text-slate-950 rounded-3xl font-black text-2xl transition-all hover:scale-105 active:scale-95 flex items-center gap-4 mx-auto shadow-2xl"
                >
                  <RefreshCw size={30} /> {t.restart}
                </button>
              </div>
            )}

            {gameState === 'LOST' && (
              <div className="max-w-md animate-in zoom-in duration-500">
                <div className="w-28 h-28 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-10 text-rose-500 border border-rose-500/20 shadow-[0_0_60px_rgba(244,63,94,0.25)]">
                  <AlertTriangle size={56} />
                </div>
                <h2 className="text-5xl font-black mb-8 text-rose-500 italic tracking-tighter uppercase">{t.lose}</h2>
                <p className="text-slate-400 mb-6 text-lg font-medium leading-relaxed">{t.loseDesc}</p>
                <div className="text-4xl font-black mb-12 text-white tracking-widest bg-slate-900/50 py-4 rounded-3xl border border-slate-800">{score}</div>
                <button 
                  onClick={() => setGameState('MENU')}
                  className="px-14 py-6 bg-gradient-to-r from-rose-700 to-rose-600 hover:from-rose-600 hover:to-rose-500 text-white rounded-3xl font-black text-2xl transition-all hover:scale-105 active:scale-95 flex items-center gap-4 mx-auto shadow-2xl"
                >
                  <RefreshCw size={30} /> {t.restart}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 生产环境页脚 */}
      <div className="mt-10 flex flex-col items-center gap-6 opacity-40 hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-8">
           <a href="https://github.com" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] hover:text-sky-400 transition-colors">
             <Github size={14} /> Github
           </a>
           <a href="https://vercel.com" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] hover:text-sky-400 transition-colors">
             <Globe size={14} /> Vercel
           </a>
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-center text-slate-500 max-w-[600px] leading-relaxed">
          {t.footer}
        </p>
      </div>

      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoom-in { from { transform: scale(0.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-in { animation: fade-in 1.2s cubic-bezier(0.16, 1, 0.3, 1); }
        .zoom-in { animation: zoom-in 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
        canvas { image-rendering: auto; }
      `}</style>
    </div>
  );
};

export default App;
