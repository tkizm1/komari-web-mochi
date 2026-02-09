import type { PublicInfo } from "@/contexts/PublicInfoContext";

/**
 * 根据配置处理台湾地区的旗帜显示
 * @param regionFlag 原始地区旗帜 emoji（如 '🇹🇼'）
 * @param _publicInfo 公共信息配置（保留参数以保持接口兼容性）
 * @returns 处理后的旗帜 emoji 或 null
 */
export const getFlagDisplay = (regionFlag: string, _publicInfo: PublicInfo | null): string => {
  // 直接返回原始旗帜
  return regionFlag;
};

/**
 * 检查是否需要特殊处理的地区
 * @param regionFlag 地区旗帜 emoji
 * @returns 是否需要特殊处理
 */
export const isSpecialRegion = (regionFlag: string): boolean => {
  return false;
};