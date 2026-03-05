"use client";

import React from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Point {
  month: string;
  volume_tons: number;
}

interface Props {
  data: Point[];
}

const ForecastChart: React.FC<Props> = ({ data }) => (
  <div className="chart-card">
    <h3>Prévision de production</h3>
    <div style={{ width: '100%', height: 220, marginTop: '1rem' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="month" stroke="#93a3bd" />
          <Tooltip
            contentStyle={{ borderRadius: 12, padding: '0.5rem 0.8rem' }}
            formatter={(value) => `${value} T`}
          />
          <Bar dataKey="volume_tons" fill="#004A37" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

export default ForecastChart;
