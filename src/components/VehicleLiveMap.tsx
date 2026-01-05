import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRealtimeLocation } from '@/hooks/useRealtimeLocation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Navigation, AlertCircle, Map } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import maplibregl, { type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Feature, LineString } from 'geojson';

interface VehicleLiveMapProps {
  vehicleId: string;
  vehicleName?: string;
  autoCenter?: boolean;
  height?: string;
  pickupPoint?: { lat: number; lng: number; label?: string };
  dropPoint?: { lat: number; lng: number; label?: string };
}

type LiveLocation = NonNullable<ReturnType<typeof useRealtimeLocation>['location']>;

const expandTileUrl = (template: string): string[] =>
  template.includes('{s}') ? ['a', 'b', 'c'].map((subdomain) => template.replace('{s}', subdomain)) : [template];

export function VehicleLiveMap({
  vehicleId,
  vehicleName = 'Vehicle',
  autoCenter = true,
  height = '500px',
  pickupPoint,
  dropPoint,
}: VehicleLiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const pickupMarkerRef = useRef<maplibregl.Marker | null>(null);
  const dropMarkerRef = useRef<maplibregl.Marker | null>(null);
  const { location, loading, error } = useRealtimeLocation(vehicleId);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [routeFeature, setRouteFeature] = useState<Feature<LineString> | null>(null);

  const tileUrl = import.meta.env.VITE_OPENSTREETMAP_TILES || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  const tileUrls = useMemo(() => expandTileUrl(tileUrl), [tileUrl]);

  const mapStyle = useMemo<StyleSpecification>(
    () =>
      ({
        version: 8,
        sources: {
          openfreemap: {
            type: 'raster',
            tiles: tileUrls,
            tileSize: 256,
            attribution: '© OpenStreetMap contributors • Tiles by OpenFreeMap',
          },
        },
        layers: [
          {
            id: 'openfreemap',
            type: 'raster',
            source: 'openfreemap',
          },
        ],
      }) as StyleSpecification,
    [tileUrls],
  );

  const buildPopupContent = useCallback(
    (loc: LiveLocation) => {
      const updated = new Date(loc.timestamp).toLocaleTimeString();
      return `
        <div style="padding:8px;font-family:sans-serif;">
          <strong>${vehicleName}</strong><br/>
          <small>Live Tracking (MapLibre)</small><br/>
          <small>Lat: ${loc.lat.toFixed(6)}</small><br/>
          <small>Lng: ${loc.lng.toFixed(6)}</small><br/>
          <small>Updated: ${updated}</small>
        </div>
      `;
    },
    [vehicleName],
  );

  const destroyMap = useCallback(() => {
    popupRef.current?.remove();
    popupRef.current = null;

    markerRef.current?.remove();
    markerRef.current = null;

    pickupMarkerRef.current?.remove();
    pickupMarkerRef.current = null;

    dropMarkerRef.current?.remove();
    dropMarkerRef.current = null;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    setMapLoaded(false);
    setRouteFeature(null);
  }, []);

  const initializeMap = useCallback(
    (loc: LiveLocation) => {
      if (!mapContainerRef.current) return;

      destroyMap();
      setMapError(null);
      setDebugInfo(null);

      try {
        const map = new maplibregl.Map({
          container: mapContainerRef.current,
          style: mapStyle,
          center: [loc.lng, loc.lat],
          zoom: 13,
        });

        map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');

        map.on('load', () => {
          setMapLoaded(true);
        });

        map.on('error', (evt) => {
          console.error('MapLibre error', evt?.error || evt);
          setMapError('Map rendering error. Please check your network and console logs.');
          setDebugInfo(evt?.error || evt);
        });

        const popup = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 18,
        }).setHTML(buildPopupContent(loc));
        popupRef.current = popup;

        const marker = new maplibregl.Marker({
          color: '#2563eb',
        })
          .setLngLat([loc.lng, loc.lat])
          .setPopup(popup)
          .addTo(map);

        marker.togglePopup();
        markerRef.current = marker;
        mapInstanceRef.current = map;

        // Pickup marker
        if (pickupPoint) {
          const pickupMarker = new maplibregl.Marker({ color: '#16a34a' })
            .setLngLat([pickupPoint.lng, pickupPoint.lat])
            .setPopup(
              new maplibregl.Popup({ closeButton: false, closeOnClick: false }).setHTML(
                `<div style="padding:6px;font-family:sans-serif;"><strong>Pickup</strong><br/><small>${pickupPoint.label || ''}</small></div>`,
              ),
            )
            .addTo(map);
          pickupMarkerRef.current = pickupMarker;
        }

        // Drop marker
        if (dropPoint) {
          const dropMarker = new maplibregl.Marker({ color: '#dc2626' })
            .setLngLat([dropPoint.lng, dropPoint.lat])
            .setPopup(
              new maplibregl.Popup({ closeButton: false, closeOnClick: false }).setHTML(
                `<div style="padding:6px;font-family:sans-serif;"><strong>Drop</strong><br/><small>${dropPoint.label || ''}</small></div>`,
              ),
            )
            .addTo(map);
          dropMarkerRef.current = dropMarker;
        }

        // Fit bounds to include pickup/drop/current if available
        const bounds = new maplibregl.LngLatBounds();
        bounds.extend([loc.lng, loc.lat]);
        if (pickupPoint) bounds.extend([pickupPoint.lng, pickupPoint.lat]);
        if (dropPoint) bounds.extend([dropPoint.lng, dropPoint.lat]);
        if (bounds.isEmpty() === false && (pickupPoint || dropPoint)) {
          map.fitBounds(bounds, { padding: 50, maxZoom: 14, duration: 800 });
        }

        // Draw existing route if available
        if (routeFeature) {
          if (!map.getSource('route')) {
            map.addSource('route', {
              type: 'geojson',
              data: routeFeature,
            });
            map.addLayer({
              id: 'route-line',
              type: 'line',
              source: 'route',
              paint: {
                'line-color': '#2563eb',
                'line-width': 4,
                'line-opacity': 0.8,
              },
            });
          } else {
            (map.getSource('route') as maplibregl.GeoJSONSource).setData(routeFeature);
          }
        }
      } catch (err) {
        console.error('Failed to initialize MapLibre map', err);
        setMapError('Unable to initialize map view.');
        setDebugInfo(err instanceof Error ? { message: err.message, stack: err.stack } : err);
      }
    },
    [buildPopupContent, destroyMap, mapStyle],
  );

  useEffect(() => {
    if (!location) {
      destroyMap();
      return;
    }

    if (!mapInstanceRef.current) {
      initializeMap(location);
    }
  }, [location, initializeMap, destroyMap]);

  useEffect(() => {
    if (!location || !mapInstanceRef.current || !markerRef.current) {
      return;
    }

    const { lat, lng } = location;

    markerRef.current.setLngLat([lng, lat]);
    popupRef.current?.setHTML(buildPopupContent(location));

    if (autoCenter) {
      mapInstanceRef.current.easeTo({
        center: [lng, lat],
        duration: 1000,
        easing: (t) => t,
        essential: true,
      });
    }
  }, [location, autoCenter, buildPopupContent]);

  // Apply route to map when available
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded || !routeFeature) return;

    const map = mapInstanceRef.current;
    if (!map.getSource('route')) {
      map.addSource('route', {
        type: 'geojson',
        data: routeFeature,
      });
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        paint: {
          'line-color': '#2563eb',
          'line-width': 4,
          'line-opacity': 0.8,
        },
      });
    } else {
      (map.getSource('route') as maplibregl.GeoJSONSource).setData(routeFeature);
    }
  }, [routeFeature, mapLoaded]);

  // Fetch route from pickup to drop using OSRM when both points provided
  useEffect(() => {
    const fetchRoute = async () => {
      if (!pickupPoint || !dropPoint) {
        setRouteFeature(null);
        return;
      }

      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${pickupPoint.lng},${pickupPoint.lat};${dropPoint.lng},${dropPoint.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Routing failed with status ${res.status}`);
        const data = await res.json();
        const coords = data?.routes?.[0]?.geometry?.coordinates;
        if (Array.isArray(coords) && coords.length > 1) {
          setRouteFeature({
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: coords,
            },
          });
        } else {
          // fallback to straight line
          setRouteFeature({
            type: 'Feature',
            properties: { fallback: true },
            geometry: {
              type: 'LineString',
              coordinates: [
                [pickupPoint.lng, pickupPoint.lat],
                [dropPoint.lng, dropPoint.lat],
              ],
            },
          });
        }
      } catch (err) {
        console.warn('Routing fallback to straight line', err);
        setRouteFeature({
          type: 'Feature',
          properties: { fallback: true },
          geometry: {
            type: 'LineString',
            coordinates: [
              [pickupPoint.lng, pickupPoint.lat],
              [dropPoint.lng, dropPoint.lat],
            ],
          },
        });
      }
    };

    fetchRoute();
  }, [pickupPoint, dropPoint]);

  useEffect(() => () => destroyMap(), [destroyMap]);

  const handleRecenter = () => {
    if (!mapInstanceRef.current || !location) return;
    mapInstanceRef.current.flyTo({
      center: [location.lng, location.lat],
      zoom: Math.max(mapInstanceRef.current.getZoom(), 13),
      duration: 800,
      essential: true,
    });
  };

  const handleRetryMap = () => {
    if (!location) return;
    initializeMap(location);
  };

  if (loading && !location) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-4" style={{ height }}>
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading vehicle location...</p>
        </CardContent>
      </Card>
    );
  }

  if (error || mapError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Map Rendering Error
          </CardTitle>
        </CardHeader>
        <CardContent style={{ height }}>
          <Alert variant="destructive" className="mb-4">
            <AlertDescription className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error || mapError || 'Failed to render map view'}
            </AlertDescription>
          </Alert>

          <div className="space-y-4 text-sm text-muted-foreground">
            <div>
              <p className="font-medium mb-2">Quick checks:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Confirm internet connectivity</li>
                <li>Ensure MapLibre and OpenFreeMap tiles are reachable (no ad-block restrictions)</li>
                <li>Open developer tools (F12) for detailed error logs</li>
              </ul>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleRetryMap} size="sm" disabled={!location}>
                <Loader2 className="w-4 h-4 mr-2" />
                Retry Map Load
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                Refresh Page
              </Button>
            </div>

            {debugInfo && (
              <div className="p-3 bg-muted/30 border rounded-md">
                <p className="text-xs font-medium mb-1 text-muted-foreground">Debug details:</p>
                <pre className="text-xs bg-background p-2 rounded max-h-36 overflow-auto">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!location) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-4" style={{ height }}>
          <Navigation className="w-12 h-12 text-muted-foreground opacity-50" />
          <div className="text-center">
            <p className="font-medium">No location data available</p>
            <p className="text-sm text-muted-foreground mt-1">
              This vehicle may not have an active driver or location sharing may be disabled.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <Navigation className="w-5 h-5" />
            Live Tracking: {vehicleName}
          </span>
          {mapLoaded && (
            <Button variant="outline" size="sm" onClick={handleRecenter}>
              <Map className="w-4 h-4 mr-2" />
              Recenter
            </Button>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Last updated: {new Date(location.timestamp).toLocaleTimeString()}
        </p>
      </CardHeader>
      <CardContent>
        <div
          ref={mapContainerRef}
          style={{
            width: '100%',
            height,
            minHeight: '400px',
            borderRadius: '0.75rem',
            border: '1px solid hsl(var(--border))',
            overflow: 'hidden',
          }}
          className="relative"
        >
          {!mapLoaded && !mapError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/50">
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <p className="text-sm text-muted-foreground">Loading map (MapLibre + OpenFreeMap)...</p>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
            <p className="font-medium">Vehicle Information</p>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name:</span>
              <span className="font-medium">{vehicleName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Map Provider:</span>
              <span className="font-medium">OpenFreeMap (MapLibre)</span>
            </div>
          </div>

          <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
            <p className="font-medium">Current Location</p>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Coordinates:</span>
              <span className="font-mono">
                {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Updated:</span>
              <span>{new Date(location.timestamp).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}