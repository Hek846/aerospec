import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { AQIBadge } from '../components/AQIBadge';
import { useHomes, useDevices } from '../hooks/useData';
import './MapView.css';

interface Room {
  id: string;
  name: string;
  homeId: string;
  floor: number;
  deviceCount: number;
}

interface DeviceWithReading {
  id: string;
  name: string;
  roomId: string;
  status: 'online' | 'offline';
  latestAqi?: number;
  latestPm25?: number;
  latestCo2?: number;
  lastSeen: string;
}

export function MapView() {
  const navigate = useNavigate();
  const homes = useHomes();
  const devices = useDevices();
  const [selectedHome, setSelectedHome] = useState<string>('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (homes.length > 0 && !selectedHome) {
      setSelectedHome(homes[0].id);
    }
  }, [homes, selectedHome]);

  useEffect(() => {
    if (selectedHome) {
      loadRooms();
    }
  }, [selectedHome]);

  const loadRooms = async () => {
    if (!selectedHome) return;

    try {
      setLoading(true);
      const data = await api.getHomeRooms(selectedHome);
      setRooms(data.rooms);
    } catch (error) {
      console.error('Failed to load rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDevicesInRoom = (roomId: string): DeviceWithReading[] => {
    return devices.filter(d => d.roomId === roomId).map(device => ({
      id: device.id,
      name: device.name,
      roomId: device.roomId,
      status: device.status,
      latestAqi: undefined, // Would be loaded from latest readings
      latestPm25: undefined,
      latestCo2: undefined,
      lastSeen: device.lastSeen
    }));
  };

  const getRoomAverageAqi = (roomId: string): number | null => {
    const roomDevices = getDevicesInRoom(roomId);
    if (roomDevices.length === 0) return null;

    // In a real implementation, we would fetch latest readings for all devices
    // For now, return a placeholder value
    return 50; // Moderate AQI
  };

  const groupRoomsByFloor = () => {
    const grouped = rooms.reduce((acc, room) => {
      if (!acc[room.floor]) {
        acc[room.floor] = [];
      }
      acc[room.floor].push(room);
      return acc;
    }, {} as Record<number, Room[]>);

    return Object.entries(grouped)
      .sort(([a], [b]) => Number(b) - Number(a)) // Sort floors descending
      .map(([floor, roomsList]) => ({
        floor: Number(floor),
        rooms: roomsList
      }));
  };

  const handleDeviceClick = (deviceId: string) => {
    navigate(`/devices/${deviceId}`);
  };

  if (homes.length === 0) {
    return (
      <div className="map-view-empty">
        <h1>Map View</h1>
        <p>No homes found. Add a home to get started.</p>
      </div>
    );
  }

  const selectedHomeData = homes.find(h => h.id === selectedHome);
  const floorGroups = groupRoomsByFloor();

  return (
    <div className="map-view">
      <header className="map-header">
        <h1>Map View</h1>
        <div className="home-selector">
          <label htmlFor="home-select">Select Home:</label>
          <select
            id="home-select"
            value={selectedHome}
            onChange={(e) => setSelectedHome(e.target.value)}
          >
            {homes.map(home => (
              <option key={home.id} value={home.id}>
                {home.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      {selectedHomeData && (
        <div className="home-info">
          <h2>{selectedHomeData.name}</h2>
          <p>{selectedHomeData.location.city}, {selectedHomeData.location.region}</p>
          <div className="home-stats">
            <span>{rooms.length} rooms</span>
            <span>•</span>
            <span>{devices.filter(d => rooms.some(r => r.id === d.roomId)).length} devices</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="map-loading">Loading rooms...</div>
      ) : (
        <div className="floor-plans">
          {floorGroups.length === 0 ? (
            <div className="no-rooms">
              <p>No rooms found in this home.</p>
            </div>
          ) : (
            floorGroups.map(({ floor, rooms: floorRooms }) => (
              <div key={floor} className="floor-section">
                <h3 className="floor-title">
                  {floor === 0 ? 'Ground Floor' : floor === 1 ? '1st Floor' : floor === 2 ? '2nd Floor' : `${floor}th Floor`}
                </h3>
                <div className="rooms-grid">
                  {floorRooms.map(room => {
                    const roomDevices = getDevicesInRoom(room.id);
                    const avgAqi = getRoomAverageAqi(room.id);
                    const onlineDevices = roomDevices.filter(d => d.status === 'online').length;

                    return (
                      <div key={room.id} className="room-card">
                        <div className="room-header">
                          <h4>{room.name}</h4>
                          {avgAqi !== null && <AQIBadge aqi={avgAqi} size="small" />}
                        </div>

                        <div className="room-stats">
                          <span className="device-count">
                            {onlineDevices}/{roomDevices.length} devices online
                          </span>
                        </div>

                        <div className="room-devices">
                          {roomDevices.length === 0 ? (
                            <p className="no-devices">No devices in this room</p>
                          ) : (
                            <div className="devices-list">
                              {roomDevices.map(device => (
                                <div
                                  key={device.id}
                                  className={`device-indicator ${device.status}`}
                                  onClick={() => handleDeviceClick(device.id)}
                                  title={`${device.name} - ${device.status}`}
                                >
                                  <div className="device-icon">
                                    {device.status === 'online' ? '🟢' : '🔴'}
                                  </div>
                                  <div className="device-name">{device.name}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <div className="map-legend">
        <h4>Legend</h4>
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-icon">🟢</span>
            <span>Online Device</span>
          </div>
          <div className="legend-item">
            <span className="legend-icon">🔴</span>
            <span>Offline Device</span>
          </div>
        </div>
      </div>
    </div>
  );
}
