/**
 * 高德地图前端集成组件 (AMap JS API 2.0)
 *
 * 使用示例：
 * ======
 * import { MapView, type AMapInstance } from "@/components/Map";
 *
 * const mapRef = useRef<AMapInstance | null>(null);
 *
 * <MapView
 *   initialCenter={[114.0579, 22.5431]}  // [lng, lat] 深圳
 *   initialZoom={13}
 *   onMapReady={(map) => {
 *     mapRef.current = map;
 *     // 添加标记
 *     new AMap.Marker({ map, position: [114.0579, 22.5431], title: "深圳" });
 *   }}
 * />
 * ======
 */
import { useEffect, useRef } from "react";
import { usePersistFn } from "@/hooks/usePersistFn";
import { cn } from "@/lib/utils";

const AMAP_KEY = import.meta.env.VITE_AMAP_KEY;

// 高德地图实例类型
export type AMapInstance = {
  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;
  getCenter: () => { lng: number; lat: number };
  getZoom: () => number;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  off: (event: string, handler: (...args: unknown[]) => void) => void;
  destroy: () => void;
};

export type AMapAutoCompleteTip = {
  name: string;
  district: string;
  address: string | string[];
  location?: { lng: number; lat: number };
  id?: string;
};

declare global {
  interface Window {
    AMap?: {
      Map: new (container: HTMLElement, options: object) => AMapInstance;
      Marker: new (options: object) => {
        setMap: (map: AMapInstance | null) => void;
        getPosition: () => { lng: number; lat: number };
        on: (event: string, handler: () => void) => void;
      };
      InfoWindow: new (options: object) => {
        open: (map: AMapInstance, position: [number, number]) => void;
        close: () => void;
      };
      Geocoder: new (options?: object) => {
        getLocation: (
          address: string,
          callback: (status: string, result: { geocodes?: Array<{ location: { lng: number; lat: number } }> }) => void
        ) => void;
      };
      PlaceSearch: new (options?: object) => {
        search: (keyword: string, callback: (status: string, result: unknown) => void) => void;
      };
      AutoComplete: new (options?: object) => {
        search: (
          keyword: string,
          callback: (status: string, result: { tips?: AMapAutoCompleteTip[] }) => void
        ) => void;
      };
    };
  }
}

let amapScriptPromise: Promise<void> | null = null;

/** 加载高德地图基础脚本（不含插件） */
function loadAMapBase(): Promise<void> {
  if (window.AMap) return Promise.resolve();
  if (amapScriptPromise) return amapScriptPromise;

  amapScriptPromise = new Promise((resolve, reject) => {
    const callbackName = `_amapCb_${Date.now()}`;
    (window as unknown as Record<string, unknown>)[callbackName] = () => {
      delete (window as unknown as Record<string, unknown>)[callbackName];
      resolve();
    };
    const script = document.createElement("script");
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}&callback=${callbackName}`;
    script.async = true;
    script.onerror = () => {
      amapScriptPromise = null;
      delete (window as unknown as Record<string, unknown>)[callbackName];
      reject(new Error("高德地图脚本加载失败，请检查 API Key 是否正确"));
    };
    document.head.appendChild(script);
  });

  return amapScriptPromise;
}

/** 加载高德地图脚本 + 指定插件，确保插件就绪后才 resolve */
export function loadAMapScript(plugins: string[] = ['AMap.AutoComplete', 'AMap.PlaceSearch', 'AMap.Geocoder', 'AMap.Geolocation']): Promise<void> {
  return loadAMapBase().then(() => {
    if (!window.AMap) return;
    const amap = window.AMap as unknown as { plugin: (plugins: string[], cb: () => void) => void };
    if (typeof amap.plugin !== 'function') return;
    // 检查所有插件是否已就绪
    const amapAny = window.AMap as unknown as Record<string, unknown>;
    const allLoaded = plugins.every(p => {
      const name = p.replace('AMap.', '');
      return !!amapAny[name];
    });
    if (allLoaded) return;
    return new Promise<void>(resolve => {
      amap.plugin(plugins, () => resolve());
    });
  });
}

interface MapViewProps {
  className?: string;
  /** 初始中心点 [经度, 纬度]，默认深圳市中心 */
  initialCenter?: [number, number];
  initialZoom?: number;
  onMapReady?: (map: AMapInstance) => void;
}

export function MapView({
  className,
  initialCenter = [114.0579, 22.5431],
  initialZoom = 13,
  onMapReady,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<AMapInstance | null>(null);

  const init = usePersistFn(async () => {
    try {
      await loadAMapScript();
      if (!mapContainer.current || !window.AMap) return;

      if (mapInstance.current) {
        mapInstance.current.destroy();
        mapInstance.current = null;
      }

      mapInstance.current = new window.AMap.Map(mapContainer.current, {
        zoom: initialZoom,
        center: initialCenter,
        mapStyle: "amap://styles/normal",
        resizeEnable: true,
      });

      if (onMapReady) {
        onMapReady(mapInstance.current);
      }
    } catch (err) {
      console.error("高德地图初始化失败:", err);
    }
  });

  useEffect(() => {
    init();
    return () => {
      if (mapInstance.current) {
        mapInstance.current.destroy();
        mapInstance.current = null;
      }
    };
  }, [init]);

  return (
    <div
      ref={mapContainer}
      className={cn("w-full h-[400px] rounded-xl overflow-hidden", className)}
    />
  );
}

/**
 * 生成高德地图导航链接（支持 H5 和小程序跳转）
 */
export function getAmapNavUrl(lng: number, lat: number, name: string): string {
  return `https://uri.amap.com/marker?position=${lng},${lat}&name=${encodeURIComponent(name)}&src=acebook&coordinate=gaode&callnative=1`;
}

/**
 * 根据地址关键词生成高德搜索导航链接
 */
export function getAmapSearchUrl(keyword: string): string {
  return `https://uri.amap.com/search?keyword=${encodeURIComponent(keyword)}&src=acebook&callnative=1`;
}
