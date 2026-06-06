// Pure HTML/CSS overlay controller. Binds to elements already present in
// index.html and exposes methods the game loop calls. No canvas drawing.
export class UI {
  constructor() {
    this.el = (id) => document.getElementById(id);
    this.menu = this.el('menu');
    this.hud = this.el('hud');
    this.objText = this.el('objText');
    this.searchFill = this.el('searchFill');
    this.escapeTimer = this.el('escapeTimer');
    this.distVal = this.el('distVal');
    this.escVal = this.el('escVal');
    this.speedo = this.el('speedo');
    this.spdVal = this.el('spdVal');
    this.prompt = this.el('prompt');
    this.victory = this.el('victory');
    this.defeat = this.el('defeat');
    this.defeatReason = this.el('defeatReason');
    this.flash = this.el('flash');
    this.crosshair = this.el('crosshair');

    this._flashT = 0;
  }

  onPlay(cb) {
    this.el('playBtn').addEventListener('click', cb);
  }
  onRetry(cb) {
    this.el('retryWin').addEventListener('click', cb);
    this.el('retryLose').addEventListener('click', cb);
  }

  showMenu() {
    this.menu.style.display = 'flex';
    this.hud.style.display = 'none';
    this.victory.style.display = 'none';
    this.defeat.style.display = 'none';
    this.crosshair.style.display = 'none';
  }

  startGame() {
    this.menu.style.display = 'none';
    this.victory.style.display = 'none';
    this.defeat.style.display = 'none';
    this.hud.style.display = 'block';
    this.crosshair.style.display = 'block';
    this.speedo.style.display = 'none';
    this.escapeTimer.style.display = 'none';
  }

  setObjective(text) { this.objText.textContent = text; }

  setSearchLevel(pct) {
    this.searchFill.style.width = Math.max(0, Math.min(100, pct)) + '%';
  }

  setSpeed(kmh) {
    this.spdVal.textContent = Math.round(kmh);
  }

  showSpeedo(v) { this.speedo.style.display = v ? 'block' : 'none'; }

  showEscapeTimer(v) { this.escapeTimer.style.display = v ? 'block' : 'none'; }

  setEscape(seconds, distance) {
    this.escVal.textContent = Math.floor(seconds);
    this.distVal.textContent = Math.round(distance);
  }

  setPrompt(text) {
    if (text) {
      this.prompt.innerHTML = text;
      this.prompt.style.display = 'block';
    } else {
      this.prompt.style.display = 'none';
    }
  }

  showVictory() {
    this.hud.style.display = 'none';
    this.crosshair.style.display = 'none';
    this.victory.style.display = 'flex';
  }

  showDefeat(reason) {
    this.hud.style.display = 'none';
    this.crosshair.style.display = 'none';
    if (reason) this.defeatReason.textContent = reason;
    this.defeat.style.display = 'flex';
  }

  triggerFlash() { this._flashT = 0.6; }

  update(dt) {
    if (this._flashT > 0) {
      this._flashT -= dt;
      this.flash.style.opacity = Math.max(0, this._flashT).toFixed(3);
    }
  }
}
