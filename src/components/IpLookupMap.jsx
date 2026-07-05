import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Default Leaflet marker icons reference image URLs that don't resolve correctly under Vite's bundler
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

const defaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

// Dark CARTO basemap tiles to match the app's dark theme
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

export default function IpLookupMap({ latitude, longitude, label }) {
  const position = [latitude, longitude]

  return (
    <MapContainer
      center={position}
      zoom={10}
      scrollWheelZoom={false}
      style={{ height: '100%', width: '100%', background: 'var(--color-background)' }}
      key={`${latitude}-${longitude}`}
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <Marker position={position} icon={defaultIcon}>
        {label && <Popup>{label}</Popup>}
      </Marker>
    </MapContainer>
  )
}