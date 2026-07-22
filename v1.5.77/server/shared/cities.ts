/**
 * 城市列表配置
 *
 * 扩展说明：
 *   - active: true  → 当前已上线，用户可选择
 *   - active: false → 预留，后续开放时改为 true 即可
 *
 * 当前阶段：仅深圳上线，完成深圳测试后逐步开放其他城市
 */

export interface City {
  code: string;       // 唯一标识（存入数据库）
  name: string;       // 显示名称
  province: string;   // 所属省份
  adcode: string;     // 高德地图行政区编码
  active: boolean;    // 是否已上线
}

export const CITIES: City[] = [
  // ── 当前上线 ──────────────────────────────────────────────────────────────
  { code: "shenzhen",  name: "深圳",  province: "广东", adcode: "440300", active: true  },

  // ── 预留（测试完成后逐步开放）────────────────────────────────────────────
  { code: "guangzhou", name: "广州",  province: "广东", adcode: "440100", active: false },
  { code: "beijing",   name: "北京",  province: "北京", adcode: "110000", active: false },
  { code: "shanghai",  name: "上海",  province: "上海", adcode: "310000", active: false },
  { code: "chengdu",   name: "成都",  province: "四川", adcode: "510100", active: false },
  { code: "wuhan",     name: "武汉",  province: "湖北", adcode: "420100", active: false },
  { code: "hangzhou",  name: "杭州",  province: "浙江", adcode: "330100", active: false },
  { code: "nanjing",   name: "南京",  province: "江苏", adcode: "320100", active: false },
  { code: "chongqing", name: "重庆",  province: "重庆", adcode: "500000", active: false },
  { code: "xian",      name: "西安",  province: "陕西", adcode: "610100", active: false },
];

/** 当前已上线城市列表（供前端选择器使用） */
export const ACTIVE_CITIES = CITIES.filter(c => c.active);

/** 默认城市（深圳测试阶段） */
export const DEFAULT_CITY = CITIES.find(c => c.code === "shenzhen")!;

/** 根据 code 查找城市 */
export function getCityByCode(code: string): City | undefined {
  return CITIES.find(c => c.code === code);
}

/** 根据 code 获取高德地图 adcode（用于地图搜索限定城市范围） */
export function getCityAdcode(code: string): string {
  return getCityByCode(code)?.adcode ?? DEFAULT_CITY.adcode;
}
