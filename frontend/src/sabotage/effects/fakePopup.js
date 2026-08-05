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
    const p1 = document.createElement('p');
    p1.style.cssText = 'font-size:0.8rem;color:#aaa;margin:0 0 4px';
    p1.textContent = 'System Notification';

    const p2 = document.createElement('p');
    p2.style.cssText = 'font-size:1rem;font-weight:bold;color:#fff;margin:0 0 8px';
    p2.textContent = msg.title;

    const p3 = document.createElement('p');
    p3.style.cssText = 'font-size:0.85rem;color:#ccc;margin:0 0 16px';
    p3.textContent = msg.body;

    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = 'display:flex;gap:8px;justify-content:flex-end';

    const btnCancel = document.createElement('button');
    btnCancel.id = 'sabo-dismiss';
    btnCancel.style.cssText = 'padding:6px 14px;background:#444;border:none;border-radius:4px;color:#fff;cursor:pointer;font-size:0.8rem';
    btnCancel.textContent = 'Cancel';

    const btnConfirm = document.createElement('button');
    btnConfirm.id = 'sabo-confirm';
    btnConfirm.style.cssText = 'padding:6px 14px;background:#0078d4;border:none;border-radius:4px;color:#fff;cursor:pointer;font-size:0.8rem';
    btnConfirm.textContent = msg.btn;

    btnContainer.appendChild(btnCancel);
    btnContainer.appendChild(btnConfirm);

    dialog.appendChild(p1);
    dialog.appendChild(p2);
    dialog.appendChild(p3);
    dialog.appendChild(btnContainer);

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
