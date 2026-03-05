import React from 'react';

interface Props {
  title: string;
  value: string;
  detail?: string;
}

export const KpiCard: React.FC<Props> = ({ title, value, detail }) => (
  <div className="chart-card">
    <p style={{ margin: 0, color: '#6c7482', fontSize: '0.9rem', textTransform: 'uppercase' }}>
      {title}
    </p>
    <h3 style={{ margin: '0.4rem 0', fontSize: '2rem', color: '#082251' }}>{value}</h3>
    {detail && <p style={{ margin: 0, color: '#3a4351' }}>{detail}</p>}
  </div>
);
