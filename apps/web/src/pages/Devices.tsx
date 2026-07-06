import { useState } from 'react';
import { useDevices } from '../hooks/useData';
import { DeviceCard } from '../components/DeviceCard';
import './Devices.css';

export function Devices() {
  const devices = useDevices();
  const [filter, setFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [search, setSearch] = useState('');

  const filteredDevices = devices.filter(device => {
    const matchesFilter = filter === 'all' || device.status === filter;
    const matchesSearch = search === '' ||
      device.name.toLowerCase().includes(search.toLowerCase()) ||
      device.deploymentId.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="devices-page">
      <header className="page-header">
        <h1>Devices</h1>
        <p className="page-description">Monitor and manage all your air quality sensors</p>
      </header>

      <div className="devices-controls">
        <input
          type="text"
          className="search-input"
          placeholder="Search devices by name or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="filter-buttons">
          <button
            className={filter === 'all' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilter('all')}
          >
            All ({devices.length})
          </button>
          <button
            className={filter === 'online' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilter('online')}
          >
            Online ({devices.filter(d => d.status === 'online').length})
          </button>
          <button
            className={filter === 'offline' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilter('offline')}
          >
            Offline ({devices.filter(d => d.status === 'offline').length})
          </button>
        </div>
      </div>

      {filteredDevices.length === 0 ? (
        <div className="no-results">
          <p>No devices found matching your criteria.</p>
        </div>
      ) : (
        <div className="devices-grid">
          {filteredDevices.map(device => (
            <DeviceCard key={device.id} device={device} />
          ))}
        </div>
      )}
    </div>
  );
}
