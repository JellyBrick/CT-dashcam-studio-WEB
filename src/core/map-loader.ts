// Ported from core/map_loader.py (OpenStreetMapTileLoader)
import { i18n } from '@/i18n';

const MAX_CACHED_TILES = 128;

export class OpenStreetMapTileLoader {
  private static tileCache: Map<string, HTMLImageElement> = new Map();
  private static pendingFetches: Map<string, Promise<HTMLImageElement | null>> = new Map();

  static latLonToTile(lat: number, lon: number, zoom: number): { x: number; y: number } {
    const latRad = (lat * Math.PI) / 180;
    const n = Math.pow(2, zoom);
    const x = ((lon + 180) / 360) * n;
    const y = ((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * n;
    return { x, y };
  }

  static async getTile(
    zoom: number,
    tileX: number,
    tileY: number,
  ): Promise<HTMLImageElement | null> {
    const key = `${zoom}/${tileX}/${tileY}`;
    const cached = this.tileCache.get(key);
    if (cached) {
      this.tileCache.delete(key);
      this.tileCache.set(key, cached);
      return cached;
    }
    if (this.pendingFetches.has(key)) {
      return this.pendingFetches.get(key)!;
    }

    const fetchPromise = (async () => {
      try {
        const url = `https://tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('Tile load error'));
          img.src = url;
        });
        this.tileCache.set(key, img);
        if (this.tileCache.size > MAX_CACHED_TILES) {
          this.tileCache.delete(this.tileCache.keys().next().value!);
        }
        return img;
      } catch {
        return null;
      } finally {
        this.pendingFetches.delete(key);
      }
    })();

    this.pendingFetches.set(key, fetchPromise);
    return fetchPromise;
  }

  static drawMinimap(
    ctx: CanvasRenderingContext2D,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
    lat: number,
    lon: number,
    heading: number,
    zoom = 16,
  ): void {
    ctx.save();
    ctx.beginPath();
    ctx.rect(dx, dy, dw, dh);
    ctx.clip();

    ctx.fillStyle = '#1c1c22';
    ctx.fillRect(dx, dy, dw, dh);

    if (lat === 0 && lon === 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '500 13px "Pretendard Variable", Pretendard, system-ui, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillText(i18n.t('map_no_gps'), dx + dw / 2, dy + dh / 2);
      ctx.restore();
      return;
    }

    const { x: exactTileX, y: exactTileY } = this.latLonToTile(lat, lon, zoom);
    const centerTileX = Math.floor(exactTileX);
    const centerTileY = Math.floor(exactTileY);
    const subOffsetX = (exactTileX - centerTileX) * 256;
    const subOffsetY = (exactTileY - centerTileY) * 256;

    const centerX = dx + dw / 2;
    const centerY = dy + dh / 2;

    // Draw 3x3 tiles surrounding the center
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const tx = centerTileX + ox;
        const ty = centerTileY + oy;
        const posX = centerX + ox * 256 - subOffsetX;
        const posY = centerY + oy * 256 - subOffsetY;

        const key = `${zoom}/${tx}/${ty}`;
        const cachedImg = this.tileCache.get(key);
        if (cachedImg) {
          ctx.drawImage(cachedImg, posX, posY, 256, 256);
        } else {
          // Trigger async load for future frames
          this.getTile(zoom, tx, ty).catch(() => null);
        }
      }
    }

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((heading * Math.PI) / 180);
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.lineTo(10, 10);
    ctx.lineTo(0, 4);
    ctx.lineTo(-10, 10);
    ctx.closePath();
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.fillStyle = '#226cff';
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }
}
