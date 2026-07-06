// Export data location for use by other packages
export const DATA_DIR = new URL('./data', import.meta.url).pathname;

// Re-export data generation utilities
export { generateDummyData } from './generateDummyData';
export { generateAdvancedData } from './generateAdvancedData';
