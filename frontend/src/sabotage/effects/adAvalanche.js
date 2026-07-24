/**
 * frontend/src/sabotage/effects/adAvalanche.js
 * 90s Ad Avalanche — Spawns 6–8 retro obnoxiously bright internet pop-up ads
 * covering the target's screen. Must click the tiny [X] on each window to clear!
 */

export const adAvalanche = {
  id: 'adAvalanche',
  name: '90s Ad Avalanche',
  description: 'Spawns 6-8 retro pop-up ads covering your screen! Click [X] on each to clear.',
  category: 'visual',
  cost: 50,
  durationMs: 15_000,

  apply(targetEl) {
    const el = targetEl || document.body;

    const adsData = [
      { title: '🎉 CONGRATULATIONS USER!', body: 'YOU WON A FREE 1999 CRUISE SHIP TRIP! CLICK HERE TO CLAIM!', bg: '#000080', btn: 'CLAIM FREE CRUISE!' },
      { title: '⚠️ SYSTEM WARNING #404', body: 'VIRUS DETECTED ON YOUR HARD DRIVE! DOWNLOAD RAM NOW!', bg: '#800000', btn: 'FREE RAM DOWNLOAD' },
      { title: '💖 HOT SINGLES IN YOUR AREA', body: '3 LOCAL SINGLES WANT TO CHAT WITH YOU RIGHT NOW!', bg: '#800080', btn: 'OPEN CHAT ROOM' },
      { title: '💵 MAKE $5000/DAY FROM HOME', body: 'LOCAL MOM DISCOVERS ONE WEIRD TRICK DOCTORS HATE!', bg: '#008000', btn: 'SEE SECRET TRICK' },
      { title: '🎮 PLAY FREE GAME ONLINE NOW', body: 'PLAY THE #1 MULTIPLAYER STRATEGY GAME OF 1998!', bg: '#808000', btn: 'PLAY FOR FREE' },
      { title: '🎰 CASINO JACKPOT $1,000,000', body: 'SPIN THE WHEEL NOW FOR 100 FREE SLOT SPINS!', bg: '#ff0055', btn: 'SPIN WHEEL NOW' },
      { title: '📞 FREE DIAL-UP ACCELERATOR', body: 'BOOST YOUR MODEM TO 56KBPS TURBO SPEED!', bg: '#00f3ff', btn: 'BOOST MODEM NOW' },
    ];

    const container = document.createElement('div');
    container.style.cssText = `
      position: absolute;
      inset: 0;
      z-index: 100;
      pointer-events: auto;
      overflow: hidden;
    `;

    const activeAds = [];

    adsData.forEach((ad, i) => {
      const pop = document.createElement('div');
      const leftPct = 10 + (i * 12) % 65;
      const topPct = 10 + (i * 10) % 55;

      pop.style.cssText = `
        position: absolute;
        left: ${leftPct}%;
        top: ${topPct}%;
        width: 260px;
        background: #c0c0c0;
        border: 2px solid #fff;
        border-right-color: #404040;
        border-bottom-color: #404040;
        box-shadow: 4px 4px 15px rgba(0,0,0,0.6);
        font-family: 'MS Sans Serif', Tahoma, sans-serif;
        font-size: 11px;
        color: #000;
        z-index: ${101 + i};
      `;

      pop.innerHTML = `
        <div style="background: ${ad.bg}; color: #fff; font-weight: bold; padding: 3px 6px; display: flex; justify-content: space-between; align-items: center;">
          <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;">${ad.title}</span>
          <button class="ad-close-btn" style="background: #c0c0c0; border: 1px solid #fff; border-right-color: #404040; border-bottom-color: #404040; color: #000; width: 16px; height: 14px; font-size: 9px; cursor: pointer; font-weight: bold; line-height: 1;">✕</button>
        </div>
        <div style="padding: 10px; background: #c0c0c0;">
          <p style="margin: 0 0 10px; font-weight: bold;">${ad.body}</p>
          <button style="background: #c0c0c0; border: 2px solid #fff; border-right-color: #404040; border-bottom-color: #404040; width: 100%; padding: 4px; font-weight: bold; cursor: pointer; font-size: 10px;">${ad.btn}</button>
        </div>
      `;

      const closeBtn = pop.querySelector('.ad-close-btn');
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        pop.remove();
        if (container.children.length === 0) {
          container.remove();
        }
      });

      container.appendChild(pop);
      activeAds.push(pop);
    });

    el.style.position = 'relative';
    el.appendChild(container);

    return () => {
      container.remove();
    };
  },
};
