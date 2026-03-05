import React from 'react';

interface Batch {
  batch_id: string;
  product: string;
  factory: string;
  certification: string;
  timestamp: string;
  quantity_tons: number;
}

interface Props {
  batches: Batch[];
}

export const BatchTable: React.FC<Props> = ({ batches }) => (
  <div className="table-card">
    <h3>Lots tracés</h3>
    <div style={{ marginTop: '1rem' }}>
      {batches.map((batch) => (
        <div
          key={batch.batch_id}
          style={{
            padding: '0.9rem 0',
            borderBottom: '1px solid #eef1f5',
          }}
        >
          <strong>{batch.batch_id}</strong>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.95rem', color: '#3a4351' }}>
            {batch.product} • {batch.factory} • {batch.certification}
          </p>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#647088' }}>
            {new Date(batch.timestamp).toLocaleDateString('fr-FR')} • {batch.quantity_tons.toFixed(1)} T
          </p>
        </div>
      ))}
    </div>
  </div>
);
