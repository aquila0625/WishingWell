import { closeDialog, downloadBlob, openDialog, showToast } from './ui.mjs';

export function buildPosterModel({ url, title }) {
  return {
    url,
    title,
    subtitle: '连接全球，共建数字化教会未来'
  };
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

function wrapText(context, text, x, y, maxWidth, lineHeight) {
  const characters = [...text];
  let line = '';
  let offset = 0;
  for (const character of characters) {
    const next = line + character;
    if (context.measureText(next).width > maxWidth && line) {
      context.fillText(line, x, y + offset);
      line = character;
      offset += lineHeight;
    } else {
      line = next;
    }
  }
  if (line) context.fillText(line, x, y + offset);
  return y + offset;
}

export async function drawSharePoster(canvas, model, qrDataUrl) {
  const context = canvas.getContext('2d');
  const qr = await loadImage(qrDataUrl);
  const width = canvas.width;
  const height = canvas.height;

  context.fillStyle = '#0b1120';
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#111827';
  context.fillRect(54, 54, width - 108, height - 108);
  context.strokeStyle = '#22d3ee';
  context.lineWidth = 2;
  context.strokeRect(54, 54, width - 108, height - 108);

  context.fillStyle = '#22d3ee';
  context.fillRect(86, 92, 58, 58);
  context.fillStyle = '#06232a';
  context.font = '700 42px sans-serif';
  context.fillText('✝', 98, 136);
  context.fillStyle = '#f8fafc';
  context.font = '700 30px sans-serif';
  context.fillText('ChurchOS', 162, 132);

  context.font = '700 62px sans-serif';
  const titleBottom = wrapText(context, model.title, 86, 250, width - 172, 78);
  context.fillStyle = '#94a3b8';
  context.font = '400 28px sans-serif';
  context.fillText(model.subtitle, 86, titleBottom + 70);

  context.fillStyle = '#172033';
  context.fillRect(86, titleBottom + 122, width - 172, 250);
  context.strokeStyle = 'rgba(34,211,238,.4)';
  context.strokeRect(86, titleBottom + 122, width - 172, 250);
  context.fillStyle = '#f8fafc';
  context.font = '600 28px sans-serif';
  ['教牧排班与日历', '奉献财务与合规', '会友关怀与儿青', '空间设备与治理'].forEach((label, index) => {
    context.fillStyle = '#22d3ee';
    context.fillRect(116, titleBottom + 165 + index * 48, 12, 12);
    context.fillStyle = '#f8fafc';
    context.fillText(label, 148, titleBottom + 178 + index * 48);
  });

  const qrSize = 260;
  const qrX = (width - qrSize) / 2;
  const qrY = height - 430;
  context.fillStyle = '#ffffff';
  context.fillRect(qrX - 16, qrY - 16, qrSize + 32, qrSize + 32);
  context.drawImage(qr, qrX, qrY, qrSize, qrSize);
  context.fillStyle = '#f8fafc';
  context.font = '600 26px sans-serif';
  context.textAlign = 'center';
  context.fillText('扫码参与共创 · 建言进入产品规划', width / 2, qrY + qrSize + 62);
  context.fillStyle = '#94a3b8';
  context.font = '400 20px sans-serif';
  context.fillText(model.url.replace(/^https?:\/\//, ''), width / 2, qrY + qrSize + 100);
  context.textAlign = 'left';
}

export function initSharing({ api }) {
  const dialog = document.getElementById('share-dialog');
  const urlInput = document.getElementById('share-url');
  const copyButton = document.getElementById('copy-share-button');
  const canvas = document.getElementById('share-poster');
  const downloadButton = document.getElementById('download-poster-button');

  async function open() {
    const url = window.location.href;
    urlInput.value = url;
    openDialog(dialog);
    try {
      const qr = await api.request(`/api/share/qr?${new URLSearchParams({ url })}`);
      await drawSharePoster(canvas, buildPosterModel({ url, title: '全球教会管理 App 需求共创计划' }), qr.dataUrl);
    } catch (error) {
      showToast(error.message, { tone: 'error' });
    }
  }

  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(urlInput.value);
    } catch (error) {
      urlInput.select();
      document.execCommand('copy');
    }
    showToast('分享链接已复制', { tone: 'success' });
  });

  downloadButton.addEventListener('click', () => {
    canvas.toBlob((blob) => {
      if (!blob) {
        showToast('海报生成失败，请重试', { tone: 'error' });
        return;
      }
      downloadBlob(blob, 'ChurchOS-CoCreation-Poster.png');
    }, 'image/png');
  });

  document.getElementById('drawer-share-button').addEventListener('click', open);
  dialog.addEventListener('close', () => closeDialog(dialog));
  return { open };
}
