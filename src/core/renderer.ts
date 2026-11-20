import { clamp, compact, sumBy } from 'es-toolkit';

import { OpenStreetMapTileLoader } from './map-loader';
import { drawQRCode } from './qr-code';
import { correctRearFrame } from './rear-correction';

import type { CameraKey } from './constants';
import type { TelemetryData } from './sei-decoder';

const REAR_BOTTOM_CROP = 0.15;

export interface RenderOptions {
  layout: 'front-focus' | 'quad' | 'single';
  single_cam: CameraKey;
  pillar_pip: boolean;
  map: boolean;
  speed: boolean;
  fsd: boolean;
  turn_signal: boolean;
  steering: boolean;
  pedal: boolean;
  timestamp: boolean;
  qr: boolean;
  rear_crop: boolean;
  rear_correction: boolean;
  brightness: number; // -100 ~ 100, default 0
  contrast: number; // 0.5 ~ 2.0, default 1.0
  playbackSpeed: number;
  exportSpeed?: number;
  telemetryOrder?: string[];
  draggingCol?: string | null;
}

export const DEFAULT_TELEMETRY_ORDER = [
  'timestamp',
  'steering',
  'turn_signal',
  'speed',
  'pedal',
  'fsd',
];

export const COL_WIDTH_BASE: Record<string, number> = {
  timestamp: 185,
  speed: 162,
  pedal: 176,
  steering: 118,
  turn_signal: 118,
  fsd: 156,
};

export const DEFAULT_RENDER_OPTIONS: RenderOptions = {
  layout: 'front-focus',
  single_cam: 'front',
  pillar_pip: true,
  map: true,
  speed: true,
  fsd: true,
  turn_signal: true,
  steering: true,
  pedal: true,
  timestamp: true,
  qr: true,
  rear_crop: false,
  rear_correction: false,
  brightness: 0,
  contrast: 1.0,
  playbackSpeed: 1.0,
  exportSpeed: 1.0,
  telemetryOrder: [...DEFAULT_TELEMETRY_ORDER],
  draggingCol: null,
};

const FONT_FAMILY = '"Pretendard Variable", Pretendard, system-ui, sans-serif';

const COLOR = {
  surface: '#000000',
  text: '#ffffff',
  muted: 'rgba(255, 255, 255, 0.5)',
  faint: 'rgba(255, 255, 255, 0.3)',
  track: 'rgba(255, 255, 255, 0.1)',
  hover: 'rgba(255, 255, 255, 0.08)',
  glass: 'rgba(0, 0, 0, 0.5)',
  primary: '#226cff',
  danger: '#ff4e4e',
  qr: '#e3e3e3',
};

const font = (weight: number, px: number) => `${weight} ${Math.round(px)}px ${FONT_FAMILY}`;

const CAMERA_LABELS: Record<CameraKey, string> = {
  front: 'Front',
  back: 'Rear',
  left_repeater: 'Left',
  right_repeater: 'Right',
  left_pillar: 'Left pillar',
  right_pillar: 'Right pillar',
};

const COLUMN_CAPTIONS: Record<string, string> = {
  timestamp: 'Time',
  steering: 'Steering',
  turn_signal: 'Blinker',
  speed: 'Speed',
  pedal: 'Pedals',
};

const DRIVE_MODES = [
  { key: 'MANUAL', label: 'Manual', color: '#6e6e73' },
  { key: 'TACC', label: 'TACC', color: '#1f9d55' },
  { key: 'AUTOPILOT', label: 'Autopilot', color: '#226cff' },
  { key: 'FSD', label: 'FSD', color: '#7c4dff' },
];

const glyphWidths = new Map<string, number>();

const glyphWidth = (ctx: CanvasRenderingContext2D, ch: string) => {
  const glyph = /\d/.test(ch) ? '0' : ch;
  const key = `${ctx.font}|${glyph}`;
  let width = glyphWidths.get(key);
  if (width === undefined) {
    width = ctx.measureText(glyph).width;
    glyphWidths.set(key, width);
  }
  return width;
};

export class OverlayRenderer {
  static measureTabular(ctx: CanvasRenderingContext2D, text: string): number {
    let width = 0;
    for (const ch of text) width += glyphWidth(ctx, ch);
    return width;
  }

  static fillTabular(ctx: CanvasRenderingContext2D, text: string, x: number, y: number): number {
    ctx.save();
    ctx.textAlign = 'center';
    let cx = x;
    for (const ch of text) {
      const w = glyphWidth(ctx, ch);
      ctx.fillText(ch, cx + w / 2, y);
      cx += w;
    }
    ctx.restore();
    return cx - x;
  }

  static drawSubSlotCover(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    source: CanvasImageSource | null | undefined,
    label: string,
    scale = 1.0,
    bottomCrop = 0,
    correctDistortion = false,
  ): void {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    ctx.fillStyle = COLOR.surface;
    ctx.fillRect(x, y, w, h);

    if (source) {
      try {
        const size = source as Partial<
          Record<'videoWidth' | 'videoHeight' | 'width' | 'height', number>
        >;
        const sw = size.videoWidth || size.width || w;
        const sh = size.videoHeight || size.height || h;

        if (sw > 0 && sh > 0) {
          const sRatio = sw / sh;
          const dRatio = w / h;
          let sx = 0,
            sy = 0,
            sCropW = sw,
            sCropH = sh;

          if (sRatio > dRatio) {
            sCropW = sh * dRatio;
            sx = (sw - sCropW) / 2;
          } else {
            sCropH = sw / dRatio;
            sy = (sh - sCropH) / 2;
          }

          sx += (sCropW * bottomCrop) / 2;
          sCropW *= 1 - bottomCrop;
          sCropH *= 1 - bottomCrop;
          const corrected = correctDistortion
            ? correctRearFrame(source, sw, sh, sx, sy, sCropW, sCropH, w, h)
            : null;
          if (corrected) ctx.drawImage(corrected, x, y, w, h);
          else ctx.drawImage(source, sx, sy, sCropW, sCropH, x, y, w, h);
        }
      } catch {}
    }

    ctx.strokeStyle = COLOR.surface;
    ctx.lineWidth = Math.max(2, Math.round(2 * scale));
    ctx.strokeRect(x, y, w, h);

    if (label) this.drawSlotBadge(ctx, x, y, label, scale);

    ctx.restore();
  }

  static drawGlassPill(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    text: string,
    scale: number,
    align: 'left' | 'right' = 'left',
  ): void {
    const fontSize = Math.max(10, Math.round(13 * scale));
    ctx.save();
    ctx.font = font(600, fontSize);
    const padX = Math.round(10 * scale);
    const h = Math.round(fontSize + 12 * scale);
    const w = ctx.measureText(text).width + padX * 2;
    const left = align === 'left' ? x : x - w;
    ctx.fillStyle = COLOR.glass;
    ctx.beginPath();
    ctx.roundRect(left, y, w, h, h / 2);
    ctx.fill();
    ctx.fillStyle = COLOR.text;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, left + padX, y + h / 2);
    ctx.restore();
  }

  static drawSlotBadge(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    label: string,
    scale = 1.0,
  ): void {
    const inset = Math.round(12 * scale);
    this.drawGlassPill(ctx, x + inset, y + inset, label, scale);
  }

  static drawTurnSignals(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    leftOn: boolean,
    rightOn: boolean,
    frameIdx: number,
    fps = 36.0,
    scale = 1.0,
  ): void {
    const isBlinkPhase = Math.floor((frameIdx / fps) * 3.5) % 2 === 0;
    const tip = Math.round(46 * scale);
    const head = Math.round(22 * scale);
    const stemEnd = Math.round(8 * scale);
    const headY = Math.round(16 * scale);
    const stemY = Math.round(6 * scale);

    ctx.save();
    for (const [direction, on] of [
      [-1, leftOn],
      [1, rightOn],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(cx + direction * tip, cy);
      ctx.lineTo(cx + direction * head, cy - headY);
      ctx.lineTo(cx + direction * head, cy - stemY);
      ctx.lineTo(cx + direction * stemEnd, cy - stemY);
      ctx.lineTo(cx + direction * stemEnd, cy + stemY);
      ctx.lineTo(cx + direction * head, cy + stemY);
      ctx.lineTo(cx + direction * head, cy + headY);
      ctx.closePath();
      ctx.fillStyle = on && isBlinkPhase ? COLOR.text : COLOR.track;
      ctx.fill();
    }
    ctx.restore();
  }

  static drawSteeringWheel(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    angleDeg: number,
    scale = 1.0,
  ): void {
    const ring = 34 * scale;
    const hub = 8 * scale;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((angleDeg * Math.PI) / 180);
    ctx.strokeStyle = COLOR.text;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(2, 5 * scale);
    ctx.beginPath();
    ctx.arc(0, 0, ring, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = Math.max(2, 4 * scale);
    ctx.beginPath();
    ctx.arc(0, 0, hub, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    for (const angle of [0, Math.PI / 2, Math.PI]) {
      ctx.moveTo(Math.cos(angle) * hub, Math.sin(angle) * hub);
      ctx.lineTo(Math.cos(angle) * ring, Math.sin(angle) * ring);
    }
    ctx.stroke();
    ctx.restore();
  }

  static computeTelemetryLayout(options: RenderOptions, outW = 1920, outH = 1080) {
    const scale = outW / 1920.0;
    const hasBottomHud =
      options.map ||
      options.timestamp ||
      options.speed ||
      options.fsd ||
      options.turn_signal ||
      options.steering ||
      options.pedal;
    const bottomH = hasBottomHud ? Math.round(180 * scale) : 0;
    const frontH = outH - bottomH;
    const mapW = options.map ? Math.round(410 * scale) : 0;
    const offsetX = mapW;
    const availW = outW - offsetX;

    // Only reserve the QR area while the overlay is enabled.
    const qrPx = Math.round(140 * scale);
    const qrPadR = Math.round(16 * scale);
    const qrZoneW = options.qr ? qrPx + qrPadR + Math.round(18 * scale) : 0;
    const colsAvailW = Math.max(Math.round(200 * scale), availW - qrZoneW);

    const rawOrder = options.telemetryOrder || DEFAULT_TELEMETRY_ORDER;
    const order = rawOrder.filter((k) => k in COL_WIDTH_BASE);
    for (const k of DEFAULT_TELEMETRY_ORDER) {
      if (!order.includes(k)) order.push(k);
    }

    const activeCols = order
      .filter((k) => options[k as keyof RenderOptions])
      .map((k) => [k, Math.round(COL_WIDTH_BASE[k] * scale)] as [string, number]);

    const numActive = activeCols.length;
    const totalColW = sumBy(activeCols, ([, w]) => w);

    const colBoxMap: Record<string, [number, number]> = {};
    const fsdDividers: number[] = [];

    if (numActive > 0) {
      const fsdIndices = activeCols.map(([k], i) => (k === 'fsd' ? i : -1)).filter((i) => i >= 0);
      let numDivs = 0;
      if (fsdIndices.length > 0 && numActive >= 2) {
        const fi = fsdIndices[0];
        if (fi > 0) numDivs++;
        if (fi < numActive - 1) numDivs++;
      }
      const divUnit = Math.round(12 * scale);
      const divExtra = numDivs * divUnit;

      if (options.map && numActive === 6) {
        const sidePadL = Math.round(32 * scale);
        const sidePadR = Math.round(20 * scale);
        const innerGap = Math.max(
          Math.round(14 * scale),
          (colsAvailW - sidePadL - sidePadR - totalColW - divExtra) / 5.0,
        );
        let currX = sidePadL;

        for (let i = 0; i < activeCols.length; i++) {
          const [k, wCol] = activeCols[i];
          if (k === 'fsd' && i > 0) {
            fsdDividers.push(Math.round(currX - innerGap / 2.0 + divUnit / 2.0));
            currX += divUnit;
          }
          colBoxMap[k] = [Math.round(currX), wCol];
          currX += wCol + innerGap;
          if (k === 'fsd' && i < numActive - 1) {
            fsdDividers.push(Math.round(currX - innerGap / 2.0 + divUnit / 2.0));
            currX += divUnit;
          }
        }
      } else {
        const freeW = Math.max(Math.round(20 * scale), colsAvailW - totalColW - divExtra);
        const gap = freeW / (numActive + 1);
        let currX = gap;

        for (let i = 0; i < activeCols.length; i++) {
          const [k, wCol] = activeCols[i];
          if (k === 'fsd' && i > 0) {
            fsdDividers.push(Math.round(currX - gap / 2.0 + divUnit / 2.0));
            currX += divUnit;
          }
          colBoxMap[k] = [Math.round(currX), wCol];
          currX += wCol + gap;
          if (k === 'fsd' && i < numActive - 1) {
            fsdDividers.push(Math.round(currX - gap / 2.0 + divUnit / 2.0));
            currX += divUnit;
          }
        }
      }
    }

    return {
      colBoxMap,
      fsdDividers,
      offsetX,
      availW,
      frontH,
      bottomH,
      qrPx,
      qrPadR,
    };
  }

  static render(
    canvas: HTMLCanvasElement,
    frames: Partial<Record<CameraKey, CanvasImageSource | null>>,
    telemetry: TelemetryData,
    baseDateStr: string,
    currentTimeSec: number,
    frameIdx: number,
    fps: number,
    options: RenderOptions,
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const outW = canvas.width;
    const outH = canvas.height;
    const scale = outW / 1920.0;
    const px = (value: number) => Math.round(value * scale);

    const b = options.brightness;
    const c = options.contrast;
    ctx.filter = b !== 0 || c !== 1.0 ? `brightness(${100 + b}%) contrast(${c * 100}%)` : 'none';

    const { colBoxMap, offsetX, frontH, bottomH, qrPx, qrPadR } = this.computeTelemetryLayout(
      options,
      outW,
      outH,
    );
    const rearCrop = options.rear_crop ? REAR_BOTTOM_CROP : 0;
    const hasBottomHud = bottomH > 0;
    const mapW = options.map ? offsetX : 0;
    const isQuad = options.layout === 'quad';
    const isSingle = options.layout === 'single';

    ctx.fillStyle = COLOR.surface;
    ctx.fillRect(0, 0, outW, outH);

    if (isQuad) {
      const halfW = Math.floor(outW / 2);
      const halfH = Math.floor(frontH / 2);
      this.drawSubSlotCover(ctx, 0, 0, halfW, halfH, frames.front, CAMERA_LABELS.front, scale);
      this.drawSubSlotCover(
        ctx,
        0,
        halfH,
        halfW,
        frontH - halfH,
        frames.back,
        CAMERA_LABELS.back,
        scale,
        rearCrop,
        options.rear_correction,
      );
      this.drawSubSlotCover(
        ctx,
        halfW,
        0,
        outW - halfW,
        halfH,
        frames.left_repeater,
        CAMERA_LABELS.left_repeater,
        scale,
      );
      this.drawSubSlotCover(
        ctx,
        halfW,
        halfH,
        outW - halfW,
        frontH - halfH,
        frames.right_repeater,
        CAMERA_LABELS.right_repeater,
        scale,
      );
    } else if (isSingle) {
      const key = options.single_cam || 'front';
      this.drawSubSlotCover(
        ctx,
        0,
        0,
        outW,
        frontH,
        frames[key],
        CAMERA_LABELS[key],
        scale,
        key === 'back' ? rearCrop : 0,
        key === 'back' && options.rear_correction,
      );
    } else {
      const subW = px(480);
      const frontW = outW - subW;
      const subH = Math.floor(frontH / 3);
      this.drawSubSlotCover(ctx, 0, 0, frontW, frontH, frames.front, CAMERA_LABELS.front, scale);
      this.drawSubSlotCover(
        ctx,
        frontW,
        0,
        subW,
        subH,
        frames.back,
        CAMERA_LABELS.back,
        scale,
        rearCrop,
        options.rear_correction,
      );
      this.drawSubSlotCover(
        ctx,
        frontW,
        subH,
        subW,
        subH,
        frames.left_repeater,
        CAMERA_LABELS.left_repeater,
        scale,
      );
      this.drawSubSlotCover(
        ctx,
        frontW,
        subH * 2,
        subW,
        frontH - subH * 2,
        frames.right_repeater,
        CAMERA_LABELS.right_repeater,
        scale,
      );
    }

    if (options.pillar_pip) {
      const pw = px(isQuad ? 236 : 320);
      const ph = px(isQuad ? 132 : 180);
      const pipY = frontH - ph - px(12);
      if (frames.left_pillar) {
        this.drawSubSlotCover(
          ctx,
          px(12),
          pipY,
          pw,
          ph,
          frames.left_pillar,
          CAMERA_LABELS.left_pillar,
          scale,
        );
      }
      if (frames.right_pillar) {
        const right = isQuad || isSingle ? outW : outW - px(480);
        this.drawSubSlotCover(
          ctx,
          right - pw - px(12),
          pipY,
          pw,
          ph,
          frames.right_pillar,
          CAMERA_LABELS.right_pillar,
          scale,
        );
      }
    }

    const viewSpeed = options.playbackSpeed || 1.0;
    const saveSpeed = options.exportSpeed || 1.0;
    const speedLabels = compact([
      Math.abs(viewSpeed - 1.0) > 0.01 ? `View ${viewSpeed.toFixed(1)}x` : null,
      Math.abs(saveSpeed - 1.0) > 0.01 ? `Save ${saveSpeed.toFixed(1)}x` : null,
    ]);
    if (speedLabels.length > 0) {
      const right = (options.layout === 'front-focus' ? outW - px(480) : outW) - px(12);
      this.drawGlassPill(ctx, right, px(12), speedLabels.join(' · '), scale, 'right');
    }

    ctx.filter = 'none';

    if (hasBottomHud) {
      const hudY = frontH;
      ctx.fillStyle = COLOR.surface;
      ctx.fillRect(0, hudY, outW, bottomH);

      if (options.map && mapW > 0) {
        OpenStreetMapTileLoader.drawMinimap(
          ctx,
          0,
          hudY,
          mapW,
          bottomH,
          telemetry.lat,
          telemetry.lon,
          telemetry.heading,
        );
      }

      const captionY = hudY + px(28);
      const iconCenterY = hudY + px(103);

      if (options.draggingCol && colBoxMap[options.draggingCol]) {
        const [dx, dw] = colBoxMap[options.draggingCol];
        const pad = px(10);
        ctx.fillStyle = COLOR.hover;
        ctx.beginPath();
        ctx.roundRect(offsetX + dx - pad, hudY + px(10), dw + pad * 2, bottomH - px(20), px(18));
        ctx.fill();
      }

      ctx.save();
      ctx.fillStyle = COLOR.muted;
      ctx.font = font(500, 15 * scale);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      for (const [key, [x]] of Object.entries(colBoxMap)) {
        const caption = COLUMN_CAPTIONS[key];
        if (caption) ctx.fillText(caption, offsetX + x, captionY);
      }
      ctx.restore();

      if ('timestamp' in colBoxMap) {
        const [x] = colBoxMap.timestamp;
        const left = offsetX + x;
        let dateStr = baseDateStr;
        let timeStr = '00:00:00';
        try {
          const [datePart = '2026-10-07', timePart = '00:00:00'] = baseDateStr.split(' ');
          const [yy, mo, dd] = datePart.split('-').map(Number);
          const [hh, mi, ss] = timePart.split(':').map(Number);
          const d = new Date(yy, (mo || 1) - 1, dd || 1, hh || 0, mi || 0, ss || 0);
          d.setSeconds(d.getSeconds() + currentTimeSec);
          const pad = (value: number) => String(value).padStart(2, '0');
          dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
          timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        } catch {}

        ctx.save();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = COLOR.muted;
        ctx.font = font(500, 18 * scale);
        this.fillTabular(ctx, dateStr, left, hudY + px(76));
        ctx.fillStyle = COLOR.text;
        ctx.font = font(600, 40 * scale);
        this.fillTabular(ctx, timeStr, left, hudY + px(124));
        if (options.map) {
          ctx.fillStyle = COLOR.faint;
          ctx.font = font(400, 11 * scale);
          ctx.fillText('Map: OpenStreetMap', left, hudY + px(156));
        }
        ctx.restore();
      }

      if ('steering' in colBoxMap) {
        const [x] = colBoxMap.steering;
        this.drawSteeringWheel(
          ctx,
          offsetX + x + px(52),
          iconCenterY,
          telemetry.steering_deg,
          scale,
        );
      }

      if ('turn_signal' in colBoxMap) {
        const [x] = colBoxMap.turn_signal;
        this.drawTurnSignals(
          ctx,
          offsetX + x + px(52),
          iconCenterY,
          telemetry.left_blinker,
          telemetry.right_blinker,
          frameIdx,
          fps,
          scale,
        );
      }

      if ('speed' in colBoxMap) {
        const [x] = colBoxMap.speed;
        const speed = Math.round(telemetry.speed_kmh);
        const barX = offsetX + x;
        const barW = px(152);
        const barH = Math.max(4, px(6));
        const barY = hudY + px(58);

        ctx.save();
        ctx.fillStyle = COLOR.track;
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, barH, barH / 2);
        ctx.fill();
        const ratio = clamp(speed / 150, 0, 1);
        if (ratio > 0.01) {
          ctx.fillStyle = COLOR.primary;
          ctx.beginPath();
          ctx.roundRect(barX, barY, Math.max(barH, barW * ratio), barH, barH / 2);
          ctx.fill();
        }

        const number = String(speed);
        ctx.font = font(600, 52 * scale);
        const numberW = this.measureTabular(ctx, number);
        ctx.font = font(500, 17 * scale);
        const unitW = ctx.measureText('km/h').width;
        const gap = px(8);
        const startX = barX + Math.max(0, Math.round((barW - numberW - gap - unitW) / 2));
        const baselineY = hudY + px(132);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = COLOR.text;
        ctx.font = font(600, 52 * scale);
        this.fillTabular(ctx, number, startX, baselineY);
        ctx.fillStyle = COLOR.muted;
        ctx.font = font(500, 17 * scale);
        ctx.fillText('km/h', startX + numberW + gap, baselineY);
        ctx.restore();
      }

      if ('pedal' in colBoxMap) {
        const [x] = colBoxMap.pedal;
        const accel = clamp(Math.round(telemetry.accel_pct), 0, 100);
        const braking = telemetry.brake_applied || telemetry.brake_pct > 0;
        const barW = px(16);
        const top = hudY + px(50);
        const bottom = hudY + px(146);
        const barH = bottom - top;
        const barX = offsetX + x;
        const labelX = barX + barW + px(14);
        const brakeX = offsetX + x + px(96);

        ctx.save();
        ctx.fillStyle = COLOR.track;
        ctx.beginPath();
        ctx.roundRect(barX, top, barW, barH, barW / 2);
        ctx.fill();
        if (accel > 0) {
          const fillH = Math.max(barW, Math.round(barH * (accel / 100)));
          ctx.fillStyle = COLOR.primary;
          ctx.beginPath();
          ctx.roundRect(barX, bottom - fillH, barW, fillH, barW / 2);
          ctx.fill();
        }

        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = COLOR.muted;
        ctx.font = font(500, 14 * scale);
        ctx.fillText('Accel', labelX, top + px(10));
        ctx.fillText('Brake', brakeX, top + px(10));

        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = accel > 0 ? COLOR.text : COLOR.muted;
        ctx.font = font(600, 22 * scale);
        this.fillTabular(ctx, `${accel}%`, labelX, bottom - px(2));

        const lampW = px(64);
        const lampH = px(28);
        const lampY = bottom - lampH;
        ctx.fillStyle = braking ? COLOR.danger : COLOR.track;
        ctx.beginPath();
        ctx.roundRect(brakeX, lampY, lampW, lampH, lampH / 2);
        ctx.fill();
        ctx.fillStyle = braking ? COLOR.text : COLOR.muted;
        ctx.font = font(600, 14 * scale);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(braking ? 'On' : 'Off', brakeX + lampW / 2, lampY + lampH / 2);
        ctx.restore();
      }

      if ('fsd' in colBoxMap) {
        const [x] = colBoxMap.fsd;
        const left = offsetX + x;
        const raw = telemetry.ap_mode || 'MANUAL';
        const active = raw === 'FSD ACTIVE' ? 'FSD' : raw;
        const rowH = px(30);
        const step = px(36);
        const rowW = px(145);
        const top = hudY + px(16);

        ctx.save();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        DRIVE_MODES.forEach(({ key, label, color }, index) => {
          const y = top + index * step;
          const on = active === key;
          ctx.fillStyle = color;
          ctx.beginPath();
          if (on) ctx.roundRect(left, y, rowW, rowH, rowH / 2);
          else ctx.arc(left + px(14), y + rowH / 2, px(4), 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = on ? COLOR.text : COLOR.faint;
          ctx.font = font(on ? 600 : 500, 16 * scale);
          ctx.fillText(label, left + px(26), y + rowH / 2);
        });
        ctx.restore();
      }

      if (options.qr) {
        const qrX = outW - qrPadR - qrPx;
        const qrY = hudY + px(12);
        drawQRCode(ctx, qrX, qrY, qrPx);
        ctx.save();
        ctx.fillStyle = COLOR.faint;
        ctx.font = font(500, Math.max(9, 11 * scale));
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText('CT Dashcam Studio', qrX + qrPx / 2, outH - px(10));
        ctx.restore();
      }
    }

    if (!hasBottomHud && options.qr) {
      const qrX = outW - qrPadR - qrPx;
      const qrY = outH - px(32) - qrPx;
      const pad = px(10);
      ctx.save();
      ctx.fillStyle = COLOR.glass;
      ctx.beginPath();
      ctx.roundRect(qrX - pad, qrY - pad, qrPx + pad * 2, qrPx + pad + px(30), px(18));
      ctx.fill();
      drawQRCode(ctx, qrX, qrY, qrPx);
      ctx.fillStyle = COLOR.muted;
      ctx.font = font(500, Math.max(9, 11 * scale));
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('CT Dashcam Studio', qrX + qrPx / 2, qrY + qrPx + px(18));
      ctx.restore();
    }
  }
}
