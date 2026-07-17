import { closeDialog, downloadBlob, openDialog, showToast } from './ui.mjs';

export function buildPosterModel({ url }) {
  return {
    url,
    brand: 'ChurchOS',
    product: '教会通 APP',
    title: '一起决定 ChurchOS 第一版先做什么',
    subtitle: '在正式开发前，我们正在收集教会现场的真实问题与需要。',
    prompts: ['不需要技术背景', '不需要完整方案', '只要说出您真实遇到的问题'],
    audience: '教会领袖 · 服侍同工 · 弟兄姊妹 · 慕道朋友',
    qrTitle: '扫码参与调研',
    qrSubtitle: '提交真实问题，帮助 ChurchOS 更贴近教会现场'
  };
}

export function buildShareText({ url }) {
  return [
    '我正在邀请大家参与 ChurchOS（教会通）APP 前期需求调研。',
    '',
    '如果你在教会服侍、聚会参与、会友关怀、财务报销、主日学、场地设备等方面遇到过真实问题，欢迎一起提交建议。',
    '',
    '你的一个真实场景，可能会帮助 ChurchOS 第一版更贴近教会现场，也可能被未来的共创致谢墙永久纪念。',
    '',
    `参与链接：${url}`
  ].join('\n');
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

function roundRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

export async function drawSharePoster(canvas, model, qrDataUrl) {
  const context = canvas.getContext('2d');
  const qr = await loadImage(qrDataUrl);
  const width = canvas.width;
  const height = canvas.height;

  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#08111f');
  gradient.addColorStop(0.58, '#0b1120');
  gradient.addColorStop(1, '#083344');
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.fillStyle = 'rgba(34, 211, 238, 0.16)';
  context.beginPath();
  context.arc(width - 90, 110, 180, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = 'rgba(99, 102, 241, 0.12)';
  context.beginPath();
  context.arc(70, height - 130, 220, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = 'rgba(17, 24, 39, 0.86)';
  roundRect(context, 50, 50, width - 100, height - 100, 36);
  context.fill();
  context.strokeStyle = 'rgba(34, 211, 238, 0.42)';
  context.lineWidth = 2;
  context.stroke();

  context.fillStyle = '#22d3ee';
  roundRect(context, 86, 92, 64, 64, 16);
  context.fill();
  context.fillStyle = '#06232a';
  context.font = '700 44px sans-serif';
  context.fillText('✝', 100, 139);
  context.fillStyle = '#f8fafc';
  context.font = '700 32px sans-serif';
  context.fillText(model.brand, 168, 124);
  context.fillStyle = '#94a3b8';
  context.font = '500 22px sans-serif';
  context.fillText(model.product, 168, 154);

  context.fillStyle = '#f8fafc';
  context.font = '700 58px sans-serif';
  const titleBottom = wrapText(context, model.title, 86, 246, width - 172, 72);
  context.fillStyle = '#cbd5e1';
  context.font = '400 28px sans-serif';
  const subtitleBottom = wrapText(context, model.subtitle, 86, titleBottom + 54, width - 172, 42);

  const promptTop = subtitleBottom + 72;
  const promptHeight = 72;
  model.prompts.forEach((label, index) => {
    const y = promptTop + index * 88;
    context.fillStyle = index === 2 ? 'rgba(34, 211, 238, 0.18)' : 'rgba(15, 23, 42, 0.9)';
    roundRect(context, 86, y, width - 172, promptHeight, 18);
    context.fill();
    context.strokeStyle = 'rgba(148, 163, 184, 0.22)';
    context.stroke();
    context.fillStyle = '#22d3ee';
    context.font = '700 26px sans-serif';
    context.fillText(`0${index + 1}`, 116, y + 46);
    context.fillStyle = '#f8fafc';
    context.font = '600 30px sans-serif';
    context.fillText(label, 174, y + 47);
  });

  context.fillStyle = '#94a3b8';
  context.font = '500 24px sans-serif';
  context.textAlign = 'center';
  const qrSize = 250;
  const qrX = (width - qrSize) / 2;
  const qrY = height - 470;
  context.fillText(model.audience, width / 2, qrY - 46);
  context.fillStyle = '#ffffff';
  roundRect(context, qrX - 18, qrY - 18, qrSize + 36, qrSize + 36, 22);
  context.fill();
  context.drawImage(qr, qrX, qrY, qrSize, qrSize);
  context.fillStyle = '#f8fafc';
  context.font = '700 34px sans-serif';
  context.fillText(model.qrTitle, width / 2, qrY + qrSize + 70);
  context.fillStyle = '#94a3b8';
  context.font = '400 25px sans-serif';
  context.fillText(model.qrSubtitle, width / 2, qrY + qrSize + 118);
  context.font = '400 20px sans-serif';
  context.fillText(model.url.replace(/^https?:\/\//, ''), width / 2, height - 70);
  context.textAlign = 'left';
}

function canvasToPosterFile(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('海报生成失败，请重试'));
        return;
      }
      resolve(new File([blob], 'ChurchOS-CoCreation-Poster.png', { type: 'image/png' }));
    }, 'image/png');
  });
}

export function initSharing({ api }) {
  const dialog = document.getElementById('share-dialog');
  const messageInput = document.getElementById('share-message');
  const copyButton = document.getElementById('copy-share-button');
  const nativeShareButton = document.getElementById('native-share-button');
  const canvas = document.getElementById('share-poster');
  const downloadButton = document.getElementById('download-poster-button');

  async function open() {
    const url = window.location.href;
    messageInput.value = buildShareText({ url });
    openDialog(dialog);
    try {
      const qr = await api.request(`/api/share/qr?${new URLSearchParams({ url })}`);
      await drawSharePoster(canvas, buildPosterModel({ url }), qr.dataUrl);
    } catch (error) {
      showToast(error.message, { tone: 'error' });
    }
  }

  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(messageInput.value);
    } catch (error) {
      messageInput.select();
      document.execCommand('copy');
    }
    showToast('分享文案和链接已复制', { tone: 'success' });
  });

  nativeShareButton.addEventListener('click', async () => {
    try {
      const posterFile = await canvasToPosterFile(canvas);
      const shareData = {
        title: 'ChurchOS（教会通）调研',
        text: messageInput.value,
        files: [posterFile]
      };

      if (navigator.canShare?.({ files: [posterFile] })) {
        await navigator.share(shareData);
        return;
      }

      if (navigator.share) {
        await navigator.share({ title: shareData.title, text: shareData.text });
        showToast('当前设备不支持直接带上海报，可再下载海报配图发送', { tone: 'info' });
        return;
      }

      await navigator.clipboard.writeText(messageInput.value);
      showToast('已复制文案，请下载海报后一起发送', { tone: 'info' });
    } catch (error) {
      if (error.name !== 'AbortError') showToast(error.message, { tone: 'error' });
    }
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

  document.querySelectorAll('[data-open-share]').forEach((button) => button.addEventListener('click', open));
  dialog.addEventListener('close', () => closeDialog(dialog));
  return { open };
}
