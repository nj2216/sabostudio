/**
 * Fake Popup — a dismissible fake OS dialog that steals one click.
 * Category: visual
 */

/** @type {import('../SabotageEffect.js').SabotageEffect} */
export const fakePopup = {
  id: 'fake-popup',
  name: 'Fake Popup',
  description: 'A fake system dialog appears and steals your next click.',
  category: 'visual',
  durationMs: 15_000,

  apply(stationEl) {
    const messages = [
      { title: 'Update Available', body: 'A critical system update is ready to install.', btn: 'Install Now' },
      { title: 'Low Battery', body: 'You have 5% battery remaining. Connect to power.', btn: 'Dismiss' },
      { title: 'Storage Almost Full', body: 'Only 128 MB of storage remaining.', btn: 'Manage Storage' },
      { title: 'Security Warning', body: 'An unusual sign-in attempt was detected.', btn: 'Review Activity' },
    ];
    const msg = messages[Math.floor(Math.random() * messages.length)];

    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: absolute;
      inset: 0;
      background: rgba(0,0,0,0.4);
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: #2d2d2d;
      border: 1px solid #555;
      border-radius: 8px;
      padding: 20px 24px;
      width: 260px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.6);
      font-family: system-ui, sans-serif;
    `;
    const notificationP = document.createElement('p');
    notificationP.style.cssText = 'font-size:0.8rem;color:#aaa;margin:0 0 4px';
    notificationP.textContent = 'System Notification';

    const titleP = document.createElement('p');
    titleP.style.cssText = 'font-size:1rem;font-weight:bold;color:#fff;margin:0 0 8px';
    titleP.textContent = msg.title;

    const bodyP = document.createElement('p');
    bodyP.style.cssText = 'font-size:0.85rem;color:#ccc;margin:0 0 16px';
    bodyP.textContent = msg.body;

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display:flex;gap:8px;justify-content:flex-end';

    const dismissBtn = document.createElement('button');
    dismissBtn.id = 'sabo-dismiss';
    dismissBtn.style.cssText = 'padding:6px 14px;background:#444;border:none;border-radius:4px;color:#fff;cursor:pointer;font-size:0.8rem';
    dismissBtn.textContent = 'Cancel';

    const confirmBtn = document.createElement('button');
    confirmBtn.id = 'sabo-confirm';
    confirmBtn.style.cssText = 'padding:6px 14px;background:#0078d4;border:none;border-radius:4px;color:#fff;cursor:pointer;font-size:0.8rem';
    confirmBtn.textContent = msg.btn;

    buttonContainer.appendChild(dismissBtn);
    buttonContainer.appendChild(confirmBtn);

    dialog.appendChild(notificationP);
    dialog.appendChild(titleP);
    dialog.appendChild(bodyP);
    dialog.appendChild(buttonContainer);

    overlay.appendChild(dialog);
    stationEl.style.position = 'relative';
    stationEl.appendChild(overlay);

    function dismiss() {
      overlay.remove();
    }

    dialog.querySelector('#sabo-dismiss').addEventListener('click', dismiss);
    dialog.querySelector('#sabo-confirm').addEventListener('click', dismiss);

    return () => overlay.remove();
  },
};
