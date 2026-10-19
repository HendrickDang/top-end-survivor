// Towns for the Town Battle. Shared by the game, the booth map and the server (which validates them).
// lon/lat are used to place each town on the booth's NT map. Towns without coordinates are listed but not mapped.
export const TOWNS = [
  { id: 'darwin', name: 'Darwin', lon: 130.84, lat: -12.46 },
  { id: 'palmerston', name: 'Palmerston', lon: 130.98, lat: -12.48 },
  { id: 'litchfield', name: 'Litchfield & rural', lon: 131.05, lat: -12.95 },
  { id: 'jabiru', name: 'Jabiru & Kakadu', lon: 132.84, lat: -12.67 },
  { id: 'nhulunbuy', name: 'Nhulunbuy & Arnhem', lon: 136.78, lat: -12.18 },
  { id: 'katherine', name: 'Katherine', lon: 132.26, lat: -14.47 },
  { id: 'tennant', name: 'Tennant Creek', lon: 134.19, lat: -19.65 },
  { id: 'alice', name: 'Alice Springs', lon: 133.88, lat: -23.70 },
  { id: 'other-nt', name: 'Elsewhere in the NT' },
  { id: 'interstate', name: 'Interstate' },
  { id: 'overseas', name: 'Overseas' }
];
export const TOWN_IDS = TOWNS.map(t => t.id);
export const townName = (id) => (TOWNS.find(t => t.id === id) || {}).name || id;
