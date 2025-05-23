"use client";

import React, { useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Settings, X, Maximize2, Minimize2, MoreVertical, Move } from 'lucide-react';
interface WidgetProps {
  id: string;
  title: string;
  type: 'bar' | 'line' | 'pie' | 'stats' | 'table';
  data: any[];
  onRemove: (id: string) => void;
  onEdit: (id: string) => void;
  isEditing?: boolean;
  width?: number;
  height?: number;
}
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#4C6FFF'];
export default function DashboardWidget({
  id,
  title,
  type,
  data,
  onRemove,
  onEdit,
  isEditing = false,
  width = 1,
  height = 1
}: WidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const renderWidgetContent = () => {
    switch (type) {
      case 'bar':
        return <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{
            top: 10,
            right: 10,
            left: 0,
            bottom: 5
          }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              {Object.keys(data[0] || {}).filter(key => key !== 'name').map((key, index) => <Bar key={key} dataKey={key} fill={COLORS[index % COLORS.length]} data-unique-id={`3191482d-7b86-416c-a9ff-ce3170276fb3_${index}`} data-file-name="components/DashboardWidget.tsx" data-dynamic-text="true" />)}
            </BarChart>
          </ResponsiveContainer>;
      case 'line':
        return <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{
            top: 10,
            right: 10,
            left: 0,
            bottom: 5
          }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              {Object.keys(data[0] || {}).filter(key => key !== 'name').map((key, index) => <Line key={key} type="monotone" dataKey={key} stroke={COLORS[index % COLORS.length]} activeDot={{
              r: 8
            }} data-unique-id={`106af546-3372-469a-a984-f14d770061c3_${index}`} data-file-name="components/DashboardWidget.tsx" data-dynamic-text="true" />)}
            </LineChart>
          </ResponsiveContainer>;
      case 'pie':
        return <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" labelLine={false} outerRadius="80%" fill="#8884d8" dataKey="value" nameKey="name" label={({
              name,
              percent
            }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} data-unique-id={`52a078be-542d-4607-97a2-a0b1eceb83d7_${index}`} data-file-name="components/DashboardWidget.tsx" data-dynamic-text="true" />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>;
      case 'stats':
        return <div className="grid grid-cols-2 gap-2 h-full" data-unique-id="50fc2273-bd3a-49f1-a3ff-caf35dd3f80e" data-file-name="components/DashboardWidget.tsx" data-dynamic-text="true">
            {data.map((item, index) => <div key={index} className="bg-white p-3 rounded-lg border border-gray-100 flex flex-col items-center justify-center" data-unique-id="648df47f-bb40-4cc3-ae0b-1d080b16a83d" data-file-name="components/DashboardWidget.tsx" data-dynamic-text="true">
                <div className="text-xs text-gray-500" data-unique-id="aa50f571-d98b-4b16-95ac-0f9926c7319e" data-file-name="components/DashboardWidget.tsx" data-dynamic-text="true">{item.label}</div>
                <div className="text-xl font-bold" style={{
              color: COLORS[index % COLORS.length]
            }} data-unique-id="383dc892-be22-4177-9530-d9f15b71a681" data-file-name="components/DashboardWidget.tsx" data-dynamic-text="true">
                  {item.value}
                </div>
                {item.percentage !== undefined && <div className="text-xs text-green-600" data-unique-id="0b4f33ef-5b31-45b4-a524-33767c752fd3" data-file-name="components/DashboardWidget.tsx" data-dynamic-text="true">
                    {item.percentage > 0 ? '+' : ''}{item.percentage}<span className="editable-text" data-unique-id="d9399643-aceb-4ad5-9874-2db52486ee6e" data-file-name="components/DashboardWidget.tsx">%
                  </span></div>}
              </div>)}
          </div>;
      case 'table':
        const headers = Object.keys(data[0] || {});
        return <div className="overflow-auto h-full" data-unique-id="9b230734-b8ec-4f94-991a-1ade9b8e7565" data-file-name="components/DashboardWidget.tsx">
            <table className="min-w-full bg-white" data-unique-id="df503f92-3a88-4ffb-94ac-daf478f3fea0" data-file-name="components/DashboardWidget.tsx">
              <thead data-unique-id="858549ca-ad73-4ca6-9fae-e9d418e8adeb" data-file-name="components/DashboardWidget.tsx">
                <tr data-unique-id="8a46bccb-a39a-4045-bd1e-e71d7f88bef0" data-file-name="components/DashboardWidget.tsx" data-dynamic-text="true">
                  {headers.map(header => <th key={header} className="py-2 px-3 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-unique-id="6828a231-133b-44d6-a401-d9b402816298" data-file-name="components/DashboardWidget.tsx" data-dynamic-text="true">
                      {header}
                    </th>)}
                </tr>
              </thead>
              <tbody data-unique-id="f14fb447-1c3e-4162-b93a-cde37143df18" data-file-name="components/DashboardWidget.tsx" data-dynamic-text="true">
                {data.map((row, rowIndex) => <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'} data-unique-id="45bc30ce-3667-4365-b941-f1e739f3f1b0" data-file-name="components/DashboardWidget.tsx" data-dynamic-text="true">
                    {headers.map(header => <td key={`${rowIndex}-${header}`} className="py-2 px-3 border-b border-gray-200 text-sm" data-unique-id="ec4df861-0add-40e6-bdb2-e7bd6cf94cb3" data-file-name="components/DashboardWidget.tsx" data-dynamic-text="true">
                        {row[header]}
                      </td>)}
                  </tr>)}
              </tbody>
            </table>
          </div>;
      default:
        return <div className="flex items-center justify-center h-full" data-unique-id="7b4dab7e-8cb7-444e-9385-4e58ea29de07" data-file-name="components/DashboardWidget.tsx"><span className="editable-text" data-unique-id="43639070-dd75-41ac-bd50-094ef4432dc9" data-file-name="components/DashboardWidget.tsx">Unknown widget type</span></div>;
    }
  };
  return <div className={`bg-white rounded-xl shadow-sm overflow-hidden flex flex-col transition-all duration-300 
        ${isEditing ? 'border-2 border-dashed border-blue-400' : 'border border-gray-100'}
        ${isExpanded ? 'fixed inset-4 z-50' : 'relative'}`} data-unique-id="7140fb9d-d452-4e84-98ba-9d4f4ef0474e" data-file-name="components/DashboardWidget.tsx">
      <div className={`flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100 ${isEditing ? 'cursor-move' : ''}`} data-unique-id="12568d15-b7c6-44bb-a8f5-da5eef093448" data-file-name="components/DashboardWidget.tsx" data-dynamic-text="true">
        {isEditing && <div className="p-1 mr-2 text-gray-400" data-unique-id="f6d39634-9d6d-4796-b4a0-a54c5f848366" data-file-name="components/DashboardWidget.tsx">
            <Move size={16} />
          </div>}
        <h3 className="text-sm font-medium text-gray-700 flex-grow truncate" data-unique-id="57a54e77-ec13-4b93-9932-cd573761a87f" data-file-name="components/DashboardWidget.tsx" data-dynamic-text="true">{title}</h3>
        <div className="flex items-center space-x-1" data-unique-id="1731dbab-2f8e-4c60-9a58-2c2e81c3a013" data-file-name="components/DashboardWidget.tsx" data-dynamic-text="true">
          <button className="p-1 hover:bg-gray-100 rounded-full transition-colors" onClick={() => setIsExpanded(!isExpanded)} data-unique-id="e3b86c5c-a59b-4c6a-996b-ae7da57b42db" data-file-name="components/DashboardWidget.tsx" data-dynamic-text="true">
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button className="p-1 hover:bg-gray-100 rounded-full transition-colors" onClick={() => setShowMenu(!showMenu)} data-unique-id="e892b365-f154-416c-9762-eb9eac468ab5" data-file-name="components/DashboardWidget.tsx">
            <MoreVertical size={16} />
          </button>
          {showMenu && <div className="absolute top-full right-0 mt-1 bg-white border border-gray-100 rounded-lg shadow-lg py-1 z-10" data-unique-id="f40d560e-ed89-4a03-ad6b-47aa44c17cbf" data-file-name="components/DashboardWidget.tsx">
              <button className="w-full text-left px-4 py-1 text-sm hover:bg-gray-50 flex items-center" onClick={() => {
            setShowMenu(false);
            onEdit(id);
          }} data-unique-id="a541b561-094e-4086-a3d0-54aa652090ec" data-file-name="components/DashboardWidget.tsx">
                <Settings size={14} className="mr-2" /><span className="editable-text" data-unique-id="a1de223b-e1cf-429a-8c3f-3bccc7db85ae" data-file-name="components/DashboardWidget.tsx"> Edit Widget
              </span></button>
              <button className="w-full text-left px-4 py-1 text-sm hover:bg-gray-50 text-red-500 flex items-center" onClick={() => {
            setShowMenu(false);
            onRemove(id);
          }} data-unique-id="5473ea91-f664-4587-aaaf-25f0d124880d" data-file-name="components/DashboardWidget.tsx">
                <X size={14} className="mr-2" /><span className="editable-text" data-unique-id="03133453-667a-40bc-81dd-c55b566f0d53" data-file-name="components/DashboardWidget.tsx"> Remove Widget
              </span></button>
            </div>}
        </div>
      </div>

      <div className="flex-grow p-4 h-[calc(100%-40px)]" data-unique-id="fd8abc0c-c424-4de8-9689-1efd00870ded" data-file-name="components/DashboardWidget.tsx" data-dynamic-text="true">
        {renderWidgetContent()}
      </div>
    </div>;
}