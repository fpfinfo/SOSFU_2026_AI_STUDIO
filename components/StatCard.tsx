import React from 'react';
import { StatCardData } from '../types';
import { Inbox, FileText, UserCheck, ShieldCheck } from 'lucide-react';

interface StatCardProps {
  data: StatCardData;
}

export const StatCard: React.FC<StatCardProps> = ({ data }) => {
  const getIcon = () => {
    switch (data.iconType) {
      case 'inbox': return <Inbox size={20} className="text-blue-500" />;
      case 'file': return <FileText size={20} className="text-teal-500" />;
      case 'user': return <UserCheck size={20} className="text-orange-500" />;
      case 'shield': return <ShieldCheck size={20} className="text-yellow-500" />;
    }
  };

  const getBorderColor = () => {
    switch (data.color) {
      case 'blue': return 'border-l-blue-500';
      case 'teal': return 'border-l-teal-500';
      case 'orange': return 'border-l-orange-500';
      case 'yellow': return 'border-l-yellow-500';
      default: return 'border-l-gray-300';
    }
  };
  
  const getLightBg = () => {
    switch (data.color) {
        case 'blue': return 'bg-blue-50';
        case 'teal': return 'bg-teal-50';
        case 'orange': return 'bg-orange-50';
        case 'yellow': return 'bg-yellow-50';
    }
  }

  return (
    <div className={`bg-white rounded-xl p-5 shadow-sm border border-gray-100 border-l-4 ${getBorderColor()} relative overflow-hidden group hover:shadow-md transition-shadow`}>
      <div className="flex justify-between items-start mb-2">
        <div className={`p-2 rounded-lg ${getLightBg()}`}>
          {getIcon()}
        </div>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{data.title}</span>
      </div>
      
      <div className="mt-2">
        <h3 className="text-3xl font-bold text-gray-800">{data.count}</h3>
        <p className="text-xs font-bold text-gray-500 uppercase mt-1">{data.subtitle}</p>
      </div>

      <div className="mt-4 flex items-center gap-2">
        {data.details.map((detail, index) => (
          <span key={index} className="flex items-center text-[10px] font-medium text-gray-500">
            <span className={`w-1.5 h-1.5 rounded-full mr-1 ${
                index === 0 ? `bg-${data.color}-500` : 'bg-gray-300'
            }`}></span>
            {detail}
          </span>
        ))}
      </div>
    </div>
  );
};
