import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { DeviceCard } from '../DeviceCard';
import type { Device } from '../../types';

const mockDevice: Device = {
  id: 'device-1',
  name: 'Living Room Sensor',
  homeId: 'home-1',
  roomId: 'room-1',
  deploymentId: 'AS-0001',
  firmwareVersion: '1.2.3',
  status: 'online',
  lastSeen: new Date().toISOString(),
  batteryLevel: 82,
  latestReading: {
    deviceId: 'device-1',
    timestamp: new Date().toISOString(),
    pm25: 12.5,
    pm10: 20.0,
    co2: null,
    temperature: 22.5,
    humidity: 45,
    pressure: 1013,
    vocIndex: null,
    noiseDb: null,
    aqi: 42,
  },
};

const renderDeviceCard = (device: Device = mockDevice) => {
  return render(
    <BrowserRouter>
      <DeviceCard device={device} />
    </BrowserRouter>
  );
};

describe('DeviceCard', () => {
  it('renders device name', () => {
    renderDeviceCard();
    expect(screen.getByText('Living Room Sensor')).toBeInTheDocument();
  });

  it('displays online status correctly', () => {
    renderDeviceCard();
    expect(screen.getByText(/online/i)).toBeInTheDocument();
  });

  it('displays offline status correctly', () => {
    const offlineDevice = { ...mockDevice, status: 'offline' as const };
    renderDeviceCard(offlineDevice);
    expect(screen.getByText(/offline/i)).toBeInTheDocument();
  });

  it('displays AQI value from latest reading', () => {
    renderDeviceCard();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('displays temperature from latest reading', () => {
    renderDeviceCard();
    expect(screen.getByText(/22\.5/)).toBeInTheDocument();
  });

  it('displays PM2.5 value', () => {
    renderDeviceCard();
    expect(screen.getByText(/12\.5/)).toBeInTheDocument();
  });

  it('shows the device serial', () => {
    renderDeviceCard();
    expect(screen.getByText('AS-0001')).toBeInTheDocument();
  });

  it('navigates to device detail on click', () => {
    renderDeviceCard();
    const card = screen.getByRole('link');
    expect(card).toHaveAttribute('href', '/devices/device-1');
  });

  it('handles device without latest reading', () => {
    const deviceWithoutReading = {
      ...mockDevice,
      latestReading: undefined,
    };
    renderDeviceCard(deviceWithoutReading);
    expect(screen.getByText('Living Room Sensor')).toBeInTheDocument();
  });

  it('applies offline CSS modifier', () => {
    const { container } = renderDeviceCard({ ...mockDevice, status: 'offline' as const });
    expect(container.querySelector('.device-card')).toHaveClass('device-card--offline');
  });
});
