import React from 'react';

interface Props {
  sector: string;
  local: number;
  imported: number;
  jobs: number;
}

export const SectorCard: React.FC<Props> = ({ sector, local, imported, jobs }) => (
  <div className="chart-card">
    <h3 style={{ margin: '0 0 0.75rem' }}>{sector}</h3>
    <p style={{ margin: 0, color: '#4a5361' }}>Local : {local.toFixed(0)} T</p>
    <p style={{ margin: 0, color: '#4a5361' }}>Importé : {imported.toFixed(0)} T</p>
    <p style={{ margin: 0, fontWeight: 600, color: '#004a37' }}>{jobs} emplois</p>
  </div>
);
