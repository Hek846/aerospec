import { useState } from 'react';
import './ExportButton.css';

interface ExportButtonProps {
  onExport: (format: 'csv' | 'json', range: '24h' | '7d' | '30d') => Promise<void>;
  label?: string;
}

export function ExportButton({ onExport, label = 'Export Data' }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedRange, setSelectedRange] = useState<'24h' | '7d' | '30d'>('24h');

  const handleExport = async (format: 'csv' | 'json') => {
    setLoading(true);
    try {
      await onExport(format, selectedRange);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setLoading(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="export-button-container">
      <button
        className="export-button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
      >
        {loading ? 'Exporting...' : label}
      </button>

      {isOpen && !loading && (
        <div className="export-dropdown">
          <div className="export-range-selector">
            <label>Time Range:</label>
            <select
              value={selectedRange}
              onChange={(e) => setSelectedRange(e.target.value as '24h' | '7d' | '30d')}
              className="range-select"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
          <div className="export-format-buttons">
            <button
              className="export-option"
              onClick={() => handleExport('csv')}
            >
              📄 Export as CSV
            </button>
            <button
              className="export-option"
              onClick={() => handleExport('json')}
            >
              📋 Export as JSON
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
