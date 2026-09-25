// main.js — wires up DOM, draws the title logo, boots the game loop.
'use strict';

(function () {
  const canvas = document.getElementById('game');
  const game = new Game(canvas);
  window.__gameRef = game; // debug hook

  document.getElementById('highScoreVal').textContent = Utils.formatMoney(game.highScore);

  // ---- title logo, drawn with the same procedural toolkit ----
  function drawLogo() {
    const lc = document.getElementById('logoCanvas');
    const lctx = lc.getContext('2d');
    lctx.clearRect(0, 0, lc.width, lc.height);
    lctx.save();
    lctx.translate(lc.width / 2, lc.height / 2 - 10);

    lctx.textAlign = 'center';
    lctx.font = 'italic 900 46px "Bungee", sans-serif';
    lctx.fillStyle = '#ffb238';
    lctx.strokeStyle = '#3a1e00';
    lctx.lineWidth = 8;
    lctx.strokeText('DACHSHUND', 0, -14);
    lctx.fillText('DACHSHUND', 0, -14);

    lctx.font = 'italic 900 54px "Bungee", sans-serif';
    lctx.fillStyle = '#ff5f6d';
    lctx.strokeStyle = '#3a0008';
    lctx.lineWidth = 9;
    lctx.strokeText('G T A', 0, 42);
    lctx.fillText('G T A', 0, 42);
    lctx.restore();

    // a little wandering dachshund mascot under the wordmark
    lctx.save();
    lctx.translate(lc.width / 2, lc.height - 14);
    lctx.rotate(Math.PI);
    Sprites.drawDachshund(lctx, { phase: performance.now() / 260, speed01: 1, body: '#8a4b28' });
    lctx.restore();
  }
  drawLogo();
  setInterval(drawLogo, 90);

  let started = false;
  document.getElementById('startBtn').addEventListener('click', () => {
    Sound.init(); Sound.resume(); Sound.playClick();
    if (!started) { started = true; game.run(); }
    game.start();
  });

  document.getElementById('retryBtn').addEventListener('click', () => { Sound.playClick(); game.start(); });
  document.getElementById('titleBtn').addEventListener('click', () => { Sound.playClick(); game.quitToTitle(); });
  document.getElementById('resumeBtn').addEventListener('click', () => { Sound.playClick(); game.resume(); });
  document.getElementById('quitBtn').addEventListener('click', () => { Sound.playClick(); game.quitToTitle(); });

  document.getElementById('pauseBtn').addEventListener('click', () => {
    if (game.state === 'playing') game.pause(); else if (game.state === 'paused') game.resume();
  });

  document.getElementById('muteBtn').addEventListener('click', () => {
    const muted = Sound.toggleMute();
    document.getElementById('muteBtn').textContent = muted ? '🔇' : '🔊';
  });

  Input.init({
    onPause: () => {
      if (game.state === 'playing') game.pause();
      else if (game.state === 'paused') game.resume();
    },
    onMute: () => {
      const muted = Sound.toggleMute();
      document.getElementById('muteBtn').textContent = muted ? '🔇' : '🔊';
    }
  });

  // keep canvas crisp on resize / orientation change
  window.addEventListener('resize', () => game._resize());
  window.addEventListener('orientationchange', () => setTimeout(() => game._resize(), 200));

  // draw an idle title frame immediately (in case the loop hasn't started)
  game._draw();
})();
