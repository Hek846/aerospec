import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { DeviceCard } from '../DeviceCard';
import type { Device } from '@aerospec/types';

const mockDevice: Device = {
  id: 'device-1',
  name: 'Living Room Sensor',
  homeId: 'home-1',
  location: 'Living Room',
  status: 'online',
  lastReading: {
    pm25: 12.5,
    pm10: 20.0,
    co2: 450,
    temperature: 22.5,
    humidity: 45,
    vocIndex: 100,
    noiseDb: 35,
    aqi: 42,
    timestamp: new Date().toISOString(),
    deviceId: 'device-1',
    anomalyFlags: []
  },
  firmware: '1.2.3',
  installDate: '2024-01-01T00:00:00Z'
};

const renderDeviceCard = (device: Device = mockDevice) => {
  return render(
    <BrowserRouter>
      <DeviceCard device={device} />
    </BrowserRouter>
  );
};

describe('DeviceCard', () => {
  it('renders device name and location', () => {
    renderDeviceCard();
    expect(screen.getByText('Living Room Sensor')).toBeInTheDocument();
    expect(screen.getByText('Living Room')).toBeInTheDocument();
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

  it('displays AQI value from last reading', () => {
    renderDeviceCard();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('displays temperature from last reading', () => {
    renderDeviceCard();
    expect(screen.getByText(/22\.5/)).toBeInTheDocument();
  });

  it('displays humidity from last reading', () => {
    renderDeviceCard();
    expect(screen.getByText(/45/)).toBeInTheDocument();
  });

  it('displays PM2.5 value', () => {
    renderDeviceCard();
    expect(screen.getByText(/12\.5/)).toBeInTheDocument();
  });

  it('navigates to device detail on click', () => {
    renderDeviceCard();
    const card = screen.getByRole('link');
    expect(card).toHaveAttribute('href', '/devices/device-1');
  });

  it('handles device without last reading', () => {
    const deviceWithoutReading = {
      ...mockDevice,
      lastReading: undefined
    };
    renderDeviceCard(deviceWithoutReading);
    expect(screen.getByText('Living Room Sensor')).toBeInTheDocument();
  });

  it('applies correct status CSS class', () => {
    const { container } = renderDeviceCard();
    expect(container.querySelector('.device-card')).toHaveClass('device-card--online');
  });

  it('shows warning status', () => {
    const warningDevice = { ...mockDevice, status: 'warning' as const };
    const { container } = renderDeviceCard(warningDevice);
    expect(container.querySelector('.device-card')).toHaveClass('device-card--warning');
  });
});
