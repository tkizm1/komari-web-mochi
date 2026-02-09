import React, { useMemo, useState, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap, CircleMarker, Tooltip as LeafletTooltip } from "react-leaflet";
import { LatLng, LatLngBounds } from "leaflet";
import type { LatLngExpression } from "leaflet";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection } from "geojson";
import "leaflet/dist/leaflet.css";
import "./NodeEarthView.css";
import type { NodeBasicInfo } from "@/contexts/NodeListContext";
import type { LiveData } from "@/types/LiveData";
import { useTranslation } from "react-i18next";
import { Card, Flex, Text } from "@radix-ui/themes";
import { Globe } from "lucide-react";
import Loading from "./loading";
import { getRegionCoordinates, emojiToRegionMap } from "@/utils/regionHelper";

interface NodeEarthViewProps {
  nodes: NodeBasicInfo[];
  liveData: LiveData;
}

// 地图边界控制组件
function MapBounds() {
  const map = useMap();
  
  React.useEffect(() => {
    // 设置最大边界，防止无限滚动
    const southWest = new LatLng(-90, -180);
    const northEast = new LatLng(90, 180);
    const bounds = new LatLngBounds(southWest, northEast);
    
    map.setMaxBounds(bounds);
    map.setMinZoom(2);
    map.setMaxZoom(8);
  }, [map]);
  
  return null;
}

// 预加载地图数据（在组件外部，只加载一次）
let cachedWorldData: FeatureCollection | null = null;
let dataLoadingPromise: Promise<FeatureCollection> | null = null;

const loadWorldData = async (): Promise<FeatureCollection> => {
  if (cachedWorldData) return cachedWorldData;
  
  if (!dataLoadingPromise) {
    dataLoadingPromise = fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(response => response.json())
      .then(topology => {
        const geoJson = feature(topology, topology.objects.countries);
        const countries = geoJson as unknown as FeatureCollection;
        cachedWorldData = countries;
        return countries;
      });
  }
  
  return dataLoadingPromise;
};

// 立即开始预加载
loadWorldData();

// 国家/地区名称映射（从emoji到国家名称）
const emojiToCountryName: Record<string, string> = Object.entries(emojiToRegionMap).reduce((acc, [emoji, info]) => {
  // 特殊处理大中华区名称
  acc[emoji] = info.en;
  return acc;
}, {} as Record<string, string>);

const NodeEarthView: React.FC<NodeEarthViewProps> = ({ nodes, liveData }) => {
  const [t] = useTranslation();
  const [worldData, setWorldData] = useState<FeatureCollection | null>(null);
  const [, setSelectedRegion] = useState<string | null>(null);
  const [isDataReady, setIsDataReady] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  
  // 创建一个状态签名来追踪在线节点的变化
  const onlineSignature = useMemo(() => {
    return (liveData?.online || []).sort().join(',');
  }, [liveData?.online]);

  // 大中华区的地区标识
  const greaterChinaRegions = new Set(['🇭🇰', '🇨🇳', '🇲🇴', '🇹🇼']);
  const greaterChinaNames = new Set(['Hong Kong S.A.R., China', 'China Mainland', 'Macau S.A.R., China', 'Taiwan, Province of China']);
  
  // 处理特殊名称映射（将地图数据中的名称映射到我们使用的名称）
  const nameMapping: Record<string, string> = {
    'China': 'China Mainland', // 地图: China -> 我们: China Mainland
    'Taiwan': 'Taiwan, Province of China',  // 地图: Taiwan -> 我们: Taiwan, Province of China
    'Hong Kong': 'Hong Kong S.A.R., China',  // 地图: Hong Kong -> 我们: Hong Kong S.A.R., China
    'Macao': 'Macau S.A.R., China',  // 地图: Macao -> 我们: Macau S.A.R., China
    'United States of America': 'United States',  // 地图: United States of America -> 我们: United States
    'United Kingdom': 'United Kingdom',  // 地图数据已经是 United Kingdom，保持不变
    'Russia': 'Russia',  // 地图数据已经是 Russia，保持不变
    'South Korea': 'South Korea',  // 地图数据已经是 South Korea，保持不变
    'Republic of Korea': 'South Korea'  // 备用映射
  };
  
  const hasGreaterChina = useMemo(() => {
    return nodes.some(node => greaterChinaRegions.has(node.region));
  }, [nodes, greaterChinaRegions]);
  
  const fixAntimeridian = useCallback((geojson: any) => {
    if (geojson.type === 'FeatureCollection') {
      geojson.features = geojson.features.map((feature: any) => {
        if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
          const checkCrossing = (ring: number[][]) => {
            for (let i = 1; i < ring.length; i++) {
              if (Math.abs(ring[i][0] - ring[i-1][0]) > 180) return true;
            }
            return false;
          };
          const fixCoordinates = (coordinates: any): any => {
            if (feature.geometry.type === 'Polygon') {
              return coordinates.map((ring: number[][]) => checkCrossing(ring) ? ring.map(c => [c[0] < 0 ? c[0] + 360 : c[0], c[1]]) : ring);
            } else if (feature.geometry.type === 'MultiPolygon') {
              return coordinates.map((polygon: number[][][]) => polygon.map((ring: number[][]) => checkCrossing(ring) ? ring.map(c => [c[0] < 0 ? c[0] + 360 : c[0], c[1]]) : ring));
            }
            return coordinates;
          };
          const problematicCountries = ['Russia', 'Russian Federation', 'Fiji', 'United States', 'United States of America', 'Kiribati', 'New Zealand'];
          const countryName = feature.properties?.name || feature.properties?.NAME;
          if (problematicCountries.some(name => countryName?.includes(name))) {
            feature.geometry.coordinates = fixCoordinates(feature.geometry.coordinates);
          }
        }
        return feature;
      });
    }
    return geojson;
  }, []);
  
  useEffect(() => {
    if (nodes.length > 0 && liveData && liveData.online && liveData.data) {
      if (nodes.some(node => liveData.data[node.uuid]) || liveData.online.length > 0) {
        setIsDataReady(true);
      }
    }
  }, [nodes, liveData]);
  
  useEffect(() => {
    if (!isDataReady) return;
    loadWorldData()
      .then(countries => {
        setWorldData(fixAntimeridian(countries));
        setIsMapReady(true);
      })
      .catch(console.error);
  }, [isDataReady, fixAntimeridian]);
  
  const nodesByRegion = useMemo(() => {
    const regionMap = new Map<string, NodeBasicInfo[]>();
    nodes.forEach(node => {
      const countryName = emojiToCountryName[node.region];
      if (countryName) {
        if (!regionMap.has(countryName)) regionMap.set(countryName, []);
        regionMap.get(countryName)!.push(node);
      }
    });
    return regionMap;
  }, [nodes]);
  
  const activeRegions = useMemo(() => {
    const regions = new Set<string>(nodesByRegion.keys());
    if (hasGreaterChina) {
      greaterChinaNames.forEach(name => regions.add(name));
    }
    return regions;
  }, [nodesByRegion, hasGreaterChina, greaterChinaNames]);
  
  // 实时判断节点状态
  const getRegionStatus = useCallback((countryName: string) => {
    const getStatusFromNodes = (nodeList: NodeBasicInfo[]) => {
      if (nodeList.length === 0) return 'inactive';
      const onlineSet = new Set(liveData?.online || []);
      let onlineCount = 0;
      for (const node of nodeList) {
        // 直接使用 liveData.online 判断节点是否在线
        if (onlineSet.has(node.uuid)) {
          onlineCount++;
        }
      }
      if (onlineCount === 0) return 'offline';
      if (onlineCount === nodeList.length) return 'online';
      return 'partial';
    };

    if (hasGreaterChina && greaterChinaNames.has(countryName)) {
      const allGreaterChinaNodes: NodeBasicInfo[] = [];
      nodes.forEach(node => {
        if (greaterChinaRegions.has(node.region)) {
          allGreaterChinaNodes.push(node);
        }
      });
      return getStatusFromNodes(allGreaterChinaNodes);
    }
    
    return getStatusFromNodes(nodesByRegion.get(countryName) || []);
  }, [hasGreaterChina, greaterChinaNames, greaterChinaRegions, nodes, nodesByRegion, liveData?.online]);

  const geoJsonStyle = useCallback((feature: Feature | undefined) => {
    if (!feature || !feature.properties) {
      return { fillColor: 'transparent', weight: 0.5, opacity: 0.3, color: '#4a5568', fillOpacity: 0 };
    }
    const countryName = feature.properties.name;
    const mappedName = nameMapping[countryName] || countryName;
    const isActive = activeRegions.has(mappedName);
    const status = isActive ? getRegionStatus(mappedName) : 'inactive';
    
    let fillColor = 'transparent', fillOpacity = 0, weight = 0.5, color = '#4a5568';
    if (isActive) {
      weight = 2;
      fillOpacity = 0.6;
      switch (status) {
        case 'online': fillColor = '#10b981'; color = '#10b981'; break;
        case 'offline': fillColor = '#ef4444'; color = '#ef4444'; fillOpacity = 0.4; break;
        case 'partial': fillColor = '#f59e0b'; color = '#f59e0b'; fillOpacity = 0.5; break;
      }
    }
    return { fillColor, weight, opacity: isActive ? 1 : 0.3, color, fillOpacity, className: '' };
  }, [activeRegions, nameMapping, getRegionStatus]);
  
  // 实时生成Tooltip内容
  const generateTooltipContent = useCallback((mappedName: string, regionNodes: NodeBasicInfo[]) => {
    const onlineSet = new Set(liveData?.online || []);
    const onlineNodes: NodeBasicInfo[] = [];
    const offlineNodes: NodeBasicInfo[] = [];
    
    regionNodes.forEach(node => {
      // 直接使用 liveData.online 判断节点是否在线
      if (onlineSet.has(node.uuid)) {
        onlineNodes.push(node);
      } else {
        offlineNodes.push(node);
      }
    });
    
    const sortedNodes = [...offlineNodes, ...onlineNodes];
    const displayNodes = sortedNodes.slice(0, 5);
    const remainingCount = sortedNodes.length - 5;
    
    const nodesList = displayNodes.map(node => {
      const online = onlineSet.has(node.uuid);
      const statusColor = online ? '#10b981' : '#ef4444';
      const statusText = online ? t("nodeCard.online") : t("nodeCard.offline");
      return `<div style="display: flex; align-items: center; gap: 8px; padding: 4px 0;">
        <span style="width: 8px; height: 8px; border-radius: 50%; background: ${statusColor}; flex-shrink: 0;"></span>
        <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${node.name}</span>
        <span style="color: ${statusColor}; font-size: 12px;">${statusText}</span>
      </div>`;
    }).join('');
    
    const moreText = remainingCount > 0 ? `<div style="display: flex; align-items: center; gap: 8px; padding: 4px 0; color: #94a3b8; font-style: italic;"><span style="width: 8px; height: 8px; flex-shrink: 0;"></span><span>+${remainingCount} ${t("earthView.more")}</span></div>` : '';
    
    const tooltipStats = offlineNodes.length > 0 
      ? t("earthView.totalServers", { total: regionNodes.length }) + 
        `, <span style="color: #10b981;">${onlineNodes.length} ${t("earthView.online")}</span>` +
        `, <span style="color: #ef4444;">${offlineNodes.length} ${t("earthView.offline")}</span>`
      : t("earthView.totalServers", { total: regionNodes.length }) + 
        `, <span style="color: #10b981;">${onlineNodes.length} ${t("earthView.online")}</span>`;
    
    return `<div class="map-tooltip" style="min-width: 250px; max-width: 350px;">
        <h3 class="tooltip-title">${mappedName}</h3>
        <div class="tooltip-stats" style="margin-bottom: 12px;">
          ${tooltipStats}
        </div>
        <div style="border-top: 1px solid rgba(148, 163, 184, 0.2); padding-top: 8px;">${nodesList}${moreText}</div>
      </div>`;
  }, [liveData?.online, t]);
  
  const onEachFeature = useCallback((feature: Feature, layer: any) => {
    if (!feature.properties) return;
    const countryName = feature.properties.name;
    const mappedName = nameMapping[countryName] || countryName;
    const regionNodes = nodesByRegion.get(mappedName);
    if (!regionNodes || regionNodes.length === 0) return;
    
    layer.bindTooltip('', { permanent: false, direction: 'top', offset: [0, -10], opacity: 1, className: 'custom-tooltip' });
    layer.on({
      mouseover: (e: any) => {
        e.target.setStyle({ weight: 3, fillOpacity: 0.8 });
        // 实时生成tooltip内容
        const freshContent = generateTooltipContent(mappedName, regionNodes);
        layer.setTooltipContent(freshContent);
        layer.openTooltip();
      },
      mouseout: (e: any) => {
        e.target.setStyle(geoJsonStyle(feature));
        layer.closeTooltip();
      },
      click: () => setSelectedRegion(mappedName),
    });
  }, [nodesByRegion, geoJsonStyle, generateTooltipContent, liveData?.online]);
  
  const smallRegions = useMemo(() => {
    const regions: Array<{ name: string; emoji: string; coords: [number, number]; nodes: NodeBasicInfo[]; }> = [];
    const smallRegionEmojis = ['🇭🇰', '🇲🇴', '🇸🇬'];
    smallRegionEmojis.forEach(emoji => {
      const countryName = emojiToCountryName[emoji];
      const coords = getRegionCoordinates(emoji);
      const regionNodes = nodesByRegion.get(countryName) || [];
      if (countryName && coords && activeRegions.has(countryName)) {
        regions.push({ name: countryName, emoji, coords, nodes: regionNodes });
      }
    });
    return regions;
  }, [activeRegions, nodesByRegion]);
  
  if (!isDataReady || !isMapReady || !worldData) {
    return <div className="earth-view-container flex items-center justify-center"><Loading /></div>;
  }

  return (
    <div className="earth-view-container">
      <MapContainer center={[20, 0] as LatLngExpression} zoom={2} className="earth-map" scrollWheelZoom={true} doubleClickZoom={true} dragging={true} attributionControl={false} worldCopyJump={false} maxBoundsViscosity={1.0}>
        <MapBounds />
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png" attribution="" />
        {worldData && <GeoJSON 
          key={`geojson-${onlineSignature}`}
          data={worldData} 
          style={geoJsonStyle} 
          onEachFeature={onEachFeature} 
        />}
        {smallRegions.map(region => {
          const status = getRegionStatus(region.name);
          let color = '#4a5568';
          if (status === 'online') color = '#10b981';
          else if (status === 'offline') color = '#ef4444';
          else if (status === 'partial') color = '#f59e0b';
          
          // 重新生成tooltip内容
          const tooltipContent = generateTooltipContent(region.name, region.nodes);
          
          return (
            <CircleMarker 
              key={`${region.emoji}-${onlineSignature}`} 
              center={region.coords as LatLngExpression} 
              radius={5} 
              pathOptions={{ fillColor: color, color: color, weight: 2, opacity: 1, fillOpacity: 0.7 }}
              eventHandlers={{
                mouseover: (e) => e.target.setStyle({ weight: 3, radius: 6, fillOpacity: 0.9 }),
                mouseout: (e) => e.target.setStyle({ weight: 2, radius: 5, fillOpacity: 0.7 }),
                click: () => setSelectedRegion(region.name),
              }}
            >
              <LeafletTooltip 
                permanent={false} 
                direction="top" 
                offset={[0, -10]} 
                opacity={1} 
                className="custom-tooltip"
              >
                <div dangerouslySetInnerHTML={{ __html: tooltipContent }} />
              </LeafletTooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
      
      <div className="map-legend">
        <Card size="1">
          <Flex direction="column" gap="2">
            <Flex align="center" gap="2">
              <Globe size={16} />
              <Text size="2" weight="bold">{t("common.status")}</Text>
            </Flex>
            <Flex direction="column" gap="1">
              <Flex align="center" gap="2">
                <div className="legend-box online"></div>
                <Text size="1">{t("earthView.allOnline")}</Text>
              </Flex>
              <Flex align="center" gap="2">
                <div className="legend-box partial"></div>
                <Text size="1">{t("common.partial")}</Text>
              </Flex>
              <Flex align="center" gap="2">
                <div className="legend-box offline"></div>
                <Text size="1">{t("earthView.allOffline")}</Text>
              </Flex>
            </Flex>
          </Flex>
        </Card>
      </div>
    </div>
  );
};

export default NodeEarthView;