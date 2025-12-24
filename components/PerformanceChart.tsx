import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const data = [
  {
    name: 'Wk 1',
    Traditional: 5,
    ADAM: 30,
  },
  {
    name: 'Wk 4',
    Traditional: 20,
    ADAM: 100,
  },
  {
    name: 'Wk 8',
    Traditional: 40,
    ADAM: 180,
  },
  {
    name: 'Wk 12',
    Traditional: 60,
    ADAM: 240, // Steady state optimization
  },
];

const PerformanceChart: React.FC = () => {
  return (
    <div className="w-full h-[400px] font-mono text-xs">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
          <XAxis dataKey="name" stroke="#a3a3a3" />
          <YAxis stroke="#a3a3a3" label={{ value: 'Experiments Completed', angle: -90, position: 'insideLeft', fill: '#a3a3a3' }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a', color: '#e5e5e5' }}
            itemStyle={{ color: '#e5e5e5' }}
            cursor={{fill: '#2a2a2a', opacity: 0.4}}
          />
          <Legend />
          <Bar dataKey="Traditional" fill="#525252" name="Manual Lab" radius={[2, 2, 0, 0]} />
          <Bar dataKey="ADAM" fill="#3b82f6" name="ADAM Platform" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default React.memo(PerformanceChart);