// @ts-nocheck
import React from 'react';

type RadarData = {
  technical: number;
  culture: number;
  communication: number;
  leadership: number;
  adaptability: number;
};

export default function RadarChart({ data }: { data: RadarData }) {
  const size = 200;
  const center = size / 2;
  const radius = center - 25;
  
  const axes = ['Technical', 'Culture', 'Comms', 'Leadership', 'Adaptable'];
  const values = [data.technical, data.culture, data.communication, data.leadership, data.adaptability];
  
  const angleSlice = (Math.PI * 2) / axes.length;
  
  const points = values.map((val, i) => {
    const r = (val / 100) * radius;
    const x = center + r * Math.cos(angleSlice * i - Math.PI / 2);
    const y = center + r * Math.sin(angleSlice * i - Math.PI / 2);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="relative flex items-center justify-center w-full h-full">
      <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        {/* Background webs */}
        {[0.2, 0.4, 0.6, 0.8, 1].map((scale, i) => (
          <polygon
            key={i}
            points={axes.map((_, j) => {
              const r = radius * scale;
              const x = center + r * Math.cos(angleSlice * j - Math.PI / 2);
              const y = center + r * Math.sin(angleSlice * j - Math.PI / 2);
              return `${x},${y}`;
            }).join(' ')}
            fill={i % 2 === 0 ? "rgba(216, 210, 200, 0.1)" : "none"}
            stroke="#D8D2C8"
            strokeWidth="1"
          />
        ))}
        {/* Axes lines and Labels */}
        {axes.map((axis, i) => {
          const x = center + radius * Math.cos(angleSlice * i - Math.PI / 2);
          const y = center + radius * Math.sin(angleSlice * i - Math.PI / 2);
          const labelX = center + (radius + 20) * Math.cos(angleSlice * i - Math.PI / 2);
          const labelY = center + (radius + 15) * Math.sin(angleSlice * i - Math.PI / 2);
          return (
            <g key={i}>
              <line x1={center} y1={center} x2={x} y2={y} stroke="#D8D2C8" strokeWidth="1" strokeDasharray="2,2" />
              <text 
                x={labelX} 
                y={labelY}
                fontSize="9"
                fontFamily="DM Mono, monospace"
                fontWeight="bold"
                fill="#9A9486"
                textAnchor="middle"
                alignmentBaseline="middle"
              >
                {axis}
              </text>
            </g>
          );
        })}
        {/* Data polygon */}
        <polygon points={points} fill="rgba(184, 151, 46, 0.2)" stroke="#B8972E" strokeWidth="2" />
        {/* Data points */}
        {values.map((val, i) => {
          const r = (val / 100) * radius;
          const x = center + r * Math.cos(angleSlice * i - Math.PI / 2);
          const y = center + r * Math.sin(angleSlice * i - Math.PI / 2);
          return <circle key={i} cx={x} cy={y} r="3" fill="#B8972E" stroke="#fff" strokeWidth="1" />;
        })}
      </svg>
    </div>
  );
}
