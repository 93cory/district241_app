import React from 'react';

interface Unit {
  id: string;
  name: string;
  sector: string;
  capacity: number;
  location: string;
  status: 'active' | 'inactive';
}

interface Props {
  units: Unit[];
}

export const UnitsTable: React.FC<Props> = ({ units }) => (
  <div className="table-card">
    <h3>Unités industrielles</h3>
    <div style={{ marginTop: '1rem' }}>
      {units.map((unit) => (
        <div
          key={unit.id}
          style={{
            padding: '0.9rem 0',
            borderBottom: '1px solid #eef1f5',
            display: 'flex',
            justifyContent: 'space-between',
            gap: '0.4rem',
          }}
        >
          <div>
            <strong>{unit.name}</strong>
            <p style={{ margin: '0.25rem 0', color: '#3a4351' }}>
              {unit.sector} • {unit.location}
            </p>
            <p style={{ margin: '0', color: '#6c7a8c' }}>
              Capacité {unit.capacity.toFixed(0)} T
            </p>
          </div>
          <span
            style={{
              alignSelf: 'center',
              color: unit.status === 'active' ? '#0f6b3f' : '#bf1a1a',
              fontWeight: 600,
            }}
          >
            {unit.status === 'active' ? 'Actif' : 'Inactif'}
          </span>
        </div>
      ))}
    </div>
  </div>
);
