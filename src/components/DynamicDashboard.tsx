"use client";

import React, { useState, useEffect } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import DashboardWidget from './DashboardWidget';
import { PlusCircle, BarChart2, LineChart, PieChart, Table, FileBarChart2 } from 'lucide-react';

// Apply responsive capabilities to the grid layout
const ResponsiveGridLayout = WidthProvider(Responsive);

// Define widget types
const widgetTypes = [{
  id: 'bar',
  name: 'Bar Chart',
  icon: <BarChart2 size={18} />
}, {
  id: 'line',
  name: 'Line Chart',
  icon: <LineChart size={18} />
}, {
  id: 'pie',
  name: 'Pie Chart',
  icon: <PieChart size={18} />
}, {
  id: 'stats',
  name: 'Statistics',
  icon: <FileBarChart2 size={18} />
}, {
  id: 'table',
  name: 'Table',
  icon: <Table size={18} data-unique-id="343bf815-9f1f-487e-b993-7804d27649c1" data-file-name="components/DynamicDashboard.tsx" />
}];

// Sample data for different widget types
const sampleData = {
  bar: [{
    name: 'Jan',
    hadir: 100,
    sakit: 30,
    izin: 20,
    alpha: 10
  }, {
    name: 'Feb',
    hadir: 120,
    sakit: 25,
    izin: 15,
    alpha: 8
  }, {
    name: 'Mar',
    hadir: 115,
    sakit: 20,
    izin: 25,
    alpha: 12
  }, {
    name: 'Apr',
    hadir: 130,
    sakit: 15,
    izin: 10,
    alpha: 5
  }, {
    name: 'May',
    hadir: 125,
    sakit: 20,
    izin: 15,
    alpha: 7
  }],
  line: [{
    name: 'Week 1',
    hadir: 92,
    sakit: 4,
    izin: 2,
    alpha: 2
  }, {
    name: 'Week 2',
    hadir: 90,
    sakit: 5,
    izin: 3,
    alpha: 2
  }, {
    name: 'Week 3',
    hadir: 93,
    sakit: 3,
    izin: 2,
    alpha: 2
  }, {
    name: 'Week 4',
    hadir: 95,
    sakit: 3,
    izin: 1,
    alpha: 1
  }],
  pie: [{
    name: 'Hadir',
    value: 85
  }, {
    name: 'Sakit',
    value: 7
  }, {
    name: 'Izin',
    value: 5
  }, {
    name: 'Alpha',
    value: 3
  }],
  stats: [{
    label: 'Total Siswa',
    value: 350,
    percentage: 5
  }, {
    label: 'Total Kelas',
    value: 12,
    percentage: 0
  }, {
    label: 'Kehadiran',
    value: '94%',
    percentage: 2
  }, {
    label: 'Guru Aktif',
    value: 24,
    percentage: 2
  }],
  table: [{
    nama: 'Ahmad Farhan',
    kelas: 'IX-A',
    status: 'Hadir',
    waktu: '07:15'
  }, {
    nama: 'Siti Aisyah',
    kelas: 'VIII-B',
    status: 'Hadir',
    waktu: '07:20'
  }, {
    nama: 'Budi Santoso',
    kelas: 'VII-A',
    status: 'Sakit',
    waktu: '-'
  }, {
    nama: 'Dewi Anggraini',
    kelas: 'IX-B',
    status: 'Hadir',
    waktu: '07:05'
  }]
};

// Default widget layouts for different screen sizes
const defaultLayouts = {
  lg: [{
    i: 'stats-1',
    x: 0,
    y: 0,
    w: 4,
    h: 2,
    type: 'stats'
  }, {
    i: 'bar-1',
    x: 4,
    y: 0,
    w: 8,
    h: 4,
    type: 'bar'
  }, {
    i: 'pie-1',
    x: 0,
    y: 2,
    w: 4,
    h: 4,
    type: 'pie'
  }, {
    i: 'line-1',
    x: 0,
    y: 6,
    w: 6,
    h: 4,
    type: 'line'
  }, {
    i: 'table-1',
    x: 6,
    y: 6,
    w: 6,
    h: 4,
    type: 'table'
  }],
  md: [{
    i: 'stats-1',
    x: 0,
    y: 0,
    w: 4,
    h: 2,
    type: 'stats'
  }, {
    i: 'bar-1',
    x: 4,
    y: 0,
    w: 4,
    h: 4,
    type: 'bar'
  }, {
    i: 'pie-1',
    x: 0,
    y: 2,
    w: 4,
    h: 4,
    type: 'pie'
  }, {
    i: 'line-1',
    x: 0,
    y: 6,
    w: 4,
    h: 4,
    type: 'line'
  }, {
    i: 'table-1',
    x: 4,
    y: 4,
    w: 4,
    h: 4,
    type: 'table'
  }],
  sm: [{
    i: 'stats-1',
    x: 0,
    y: 0,
    w: 6,
    h: 2,
    type: 'stats'
  }, {
    i: 'bar-1',
    x: 0,
    y: 2,
    w: 6,
    h: 4,
    type: 'bar'
  }, {
    i: 'pie-1',
    x: 0,
    y: 6,
    w: 6,
    h: 4,
    type: 'pie'
  }, {
    i: 'line-1',
    x: 0,
    y: 10,
    w: 6,
    h: 4,
    type: 'line'
  }, {
    i: 'table-1',
    x: 0,
    y: 14,
    w: 6,
    h: 4,
    type: 'table'
  }]
};

// Widget titles
const defaultWidgetTitles = {
  'stats-1': 'Statistik Kehadiran',
  'bar-1': 'Kehadiran Bulanan',
  'pie-1': 'Distribusi Kehadiran',
  'line-1': 'Tren Kehadiran',
  'table-1': 'Data Kehadiran Terkini'
};
interface DynamicDashboardProps {
  userRole: string | null;
  schoolId: string | null;
}
export default function DynamicDashboard({
  userRole,
  schoolId
}: DynamicDashboardProps) {
  // State for layouts
  const [layouts, setLayouts] = useState(() => {
    // Try to load from localStorage first
    if (typeof window !== 'undefined') {
      const savedLayouts = localStorage.getItem(`dashboard-layout-${userRole}`);
      return savedLayouts ? JSON.parse(savedLayouts) : defaultLayouts;
    }
    return defaultLayouts;
  });

  // State for widgets
  const [widgets, setWidgets] = useState<any[]>(() => {
    // Initialize widgets from layouts
    return Object.values(layouts.lg || {}).map((item: any) => ({
      id: item.i,
      type: item.type,
      title: defaultWidgetTitles[item.i] || `Widget ${item.i}`,
      data: sampleData[item.type] || []
    }));
  });

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  // Widget being edited
  const [editingWidget, setEditingWidget] = useState<string | null>(null);
  // Add widget modal state
  const [showAddWidgetModal, setShowAddWidgetModal] = useState(false);
  // New widget type
  const [newWidgetType, setNewWidgetType] = useState('bar');

  // Save layouts to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`dashboard-layout-${userRole}`, JSON.stringify(layouts));
    }
  }, [layouts, userRole]);

  // Handle layout change
  const handleLayoutChange = (currentLayout: any, allLayouts: any) => {
    setLayouts(allLayouts);
  };

  // Add a new widget
  const addWidget = (type: string) => {
    const newWidgetId = `${type}-${Date.now()}`;
    const newWidget = {
      id: newWidgetId,
      type,
      title: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Chart`,
      data: sampleData[type] || []
    };

    // Add the widget to the state
    setWidgets([...widgets, newWidget]);

    // Add the widget to layouts
    const newLayouts = {
      ...layouts
    };
    Object.keys(newLayouts).forEach(breakpoint => {
      const lastWidget = [...newLayouts[breakpoint]].sort((a, b) => b.y + b.h - (a.y + a.h))[0];
      const y = lastWidget ? lastWidget.y + lastWidget.h : 0;
      let w = 6;
      let h = 4;
      if (type === 'stats') {
        h = 2;
      }
      newLayouts[breakpoint] = [...newLayouts[breakpoint], {
        i: newWidgetId,
        x: 0,
        y,
        w,
        h,
        type
      }];
    });
    setLayouts(newLayouts);
    setShowAddWidgetModal(false);
  };

  // Remove a widget
  const removeWidget = (id: string) => {
    // Remove from widgets state
    setWidgets(widgets.filter(widget => widget.id !== id));

    // Remove from layouts
    const newLayouts = {
      ...layouts
    };
    Object.keys(newLayouts).forEach(breakpoint => {
      newLayouts[breakpoint] = newLayouts[breakpoint].filter(item => item.i !== id);
    });
    setLayouts(newLayouts);
  };

  // Edit a widget
  const editWidget = (id: string) => {
    setEditingWidget(id);
  };

  // Reset to default layout
  const resetLayout = () => {
    setLayouts(defaultLayouts);
    setWidgets(Object.values(defaultLayouts.lg).map((item: any) => ({
      id: item.i,
      type: item.type,
      title: defaultWidgetTitles[item.i] || `Widget ${item.i}`,
      data: sampleData[item.type] || []
    })));
  };
  return <div className="pb-4" data-unique-id="04b16adb-b55c-4eae-b824-d10e2b8f2091" data-file-name="components/DynamicDashboard.tsx" data-dynamic-text="true">
      {/* Dashboard Controls */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex flex-wrap gap-2 justify-between items-center" data-unique-id="024ae85b-f81c-4f61-89e3-4df250c63068" data-file-name="components/DynamicDashboard.tsx">
        <h2 className="text-lg font-semibold" data-unique-id="b9077bdf-990b-47c5-a802-9a1738d48e59" data-file-name="components/DynamicDashboard.tsx"><span className="editable-text" data-unique-id="9a664839-76a2-4e49-a15b-3c4be4b62e4e" data-file-name="components/DynamicDashboard.tsx">Dashboard Kustom</span></h2>
        <div className="flex items-center gap-2" data-unique-id="ff9217c1-ef42-4808-adc4-f158d753353e" data-file-name="components/DynamicDashboard.tsx" data-dynamic-text="true">
          <button onClick={() => setIsEditMode(!isEditMode)} className={`px-4 py-2 rounded-lg text-sm font-medium ${isEditMode ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`} data-unique-id="a11f3f21-7e9b-4c7a-a0da-652eb6445819" data-file-name="components/DynamicDashboard.tsx" data-dynamic-text="true">
            {isEditMode ? 'Simpan Perubahan' : 'Edit Dashboard'}
          </button>
          
          {isEditMode && <>
              <button onClick={() => setShowAddWidgetModal(true)} className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium flex items-center gap-1" data-unique-id="b837e114-e60a-4281-92ae-640b6f2b1b8d" data-file-name="components/DynamicDashboard.tsx">
                <PlusCircle size={16} />
                <span data-unique-id="ed86ac07-2e0c-4d7e-a09c-eb14a880860e" data-file-name="components/DynamicDashboard.tsx"><span className="editable-text" data-unique-id="79d0b5aa-c08e-49f4-b2a4-f2e7aea3ea74" data-file-name="components/DynamicDashboard.tsx">Tambah Widget</span></span>
              </button>
              
              <button onClick={resetLayout} className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium" data-unique-id="50dd755a-dfd6-4104-8bf2-a1754e711156" data-file-name="components/DynamicDashboard.tsx"><span className="editable-text" data-unique-id="e2d0afb8-8e63-42b5-b4a4-eda4fc82b057" data-file-name="components/DynamicDashboard.tsx">
                Reset Layout
              </span></button>
            </>}
        </div>
      </div>

      {/* Grid Layout */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 min-h-[600px]" data-unique-id="31df94db-1d0f-463b-b8b3-5b0f3f81edf4" data-file-name="components/DynamicDashboard.tsx">
        <ResponsiveGridLayout className="layout" layouts={layouts} breakpoints={{
        lg: 1200,
        md: 996,
        sm: 768,
        xs: 480,
        xxs: 0
      }} cols={{
        lg: 12,
        md: 8,
        sm: 6,
        xs: 4,
        xxs: 2
      }} rowHeight={70} onLayoutChange={handleLayoutChange} isDraggable={isEditMode} isResizable={isEditMode} compactType="vertical" margin={[16, 16]}>
          {widgets.map(widget => <div key={widget.id} data-unique-id="058a0948-88aa-4ece-b728-03d1d68cff32" data-file-name="components/DynamicDashboard.tsx">
              <DashboardWidget id={widget.id} title={widget.title} type={widget.type} data={widget.data} onRemove={removeWidget} onEdit={editWidget} isEditing={isEditMode} />
            </div>)}
        </ResponsiveGridLayout>
      </div>

      {/* Add Widget Modal */}
      {showAddWidgetModal && <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50" data-unique-id="302b2414-d097-4f6a-8b75-8828d58ebd3c" data-file-name="components/DynamicDashboard.tsx">
          <div className="bg-white rounded-xl p-6 w-96 max-w-full mx-4" data-unique-id="db60c0f4-0df6-4019-9b60-5889f51bc684" data-file-name="components/DynamicDashboard.tsx">
            <h3 className="text-lg font-semibold mb-4" data-unique-id="b49b29a3-0817-431d-b541-3e2e18f50332" data-file-name="components/DynamicDashboard.tsx"><span className="editable-text" data-unique-id="a5a862d0-41fb-4f1a-b8cf-ea367cf0aa79" data-file-name="components/DynamicDashboard.tsx">Add New Widget</span></h3>
            
            <div className="mb-4" data-unique-id="957ad364-8914-4952-93f1-0be30e287508" data-file-name="components/DynamicDashboard.tsx">
              <label className="block text-sm font-medium mb-1" data-unique-id="20545170-209b-4c8a-9bb0-2c05e2bc1e7c" data-file-name="components/DynamicDashboard.tsx"><span className="editable-text" data-unique-id="9cce2b2c-cfcf-4309-be43-b7329285ba7f" data-file-name="components/DynamicDashboard.tsx">Widget Type</span></label>
              <div className="grid grid-cols-2 gap-2" data-unique-id="622d6ea5-bb35-4d31-bb9e-c92d4765fc72" data-file-name="components/DynamicDashboard.tsx" data-dynamic-text="true">
                {widgetTypes.map(type => <button key={type.id} className={`p-3 rounded-lg border flex items-center gap-2 transition-colors ${newWidgetType === type.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`} onClick={() => setNewWidgetType(type.id)} data-unique-id="0023b734-3847-4b91-aff3-c060fc0ec13a" data-file-name="components/DynamicDashboard.tsx">
                    <span className={`${newWidgetType === type.id ? 'text-blue-500' : 'text-gray-500'}`} data-unique-id="99f22c37-4664-474a-a67c-d9726083a309" data-file-name="components/DynamicDashboard.tsx" data-dynamic-text="true">
                      {type.icon}
                    </span>
                    <span className={`${newWidgetType === type.id ? 'font-medium' : ''}`} data-unique-id="d4a90093-44f4-4fd6-b35a-848176bedd59" data-file-name="components/DynamicDashboard.tsx" data-dynamic-text="true">
                      {type.name}
                    </span>
                  </button>)}
              </div>
            </div>
            
            <div className="flex justify-end gap-2" data-unique-id="53f5a6eb-47fd-432b-a6c5-00a708ac2f44" data-file-name="components/DynamicDashboard.tsx">
              <button onClick={() => setShowAddWidgetModal(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50" data-unique-id="0f0faafd-7d26-4365-b3f6-3a0dc446ca08" data-file-name="components/DynamicDashboard.tsx"><span className="editable-text" data-unique-id="81b141e3-3ea3-4d48-8abc-b86ddbb5a2ae" data-file-name="components/DynamicDashboard.tsx">
                Cancel
              </span></button>
              <button onClick={() => addWidget(newWidgetType)} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600" data-unique-id="f3801439-774c-4af9-8857-018e2ed78f7c" data-file-name="components/DynamicDashboard.tsx"><span className="editable-text" data-unique-id="1d2f7a62-75e1-4bd2-9f24-b7e789f1c98b" data-file-name="components/DynamicDashboard.tsx">
                Add Widget
              </span></button>
            </div>
          </div>
        </div>}
      
      {/* Edit Widget Modal */}
      {editingWidget && <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50" data-unique-id="600356ab-d7b3-4b2e-996e-68e84607edf6" data-file-name="components/DynamicDashboard.tsx">
          <div className="bg-white rounded-xl p-6 w-96 max-w-full mx-4" data-unique-id="e578cf6a-6efa-4a36-b2ea-910249a5db35" data-file-name="components/DynamicDashboard.tsx">
            <h3 className="text-lg font-semibold mb-4" data-unique-id="fc8202ab-ca0f-4ef6-a61e-ad2a6072a4bc" data-file-name="components/DynamicDashboard.tsx"><span className="editable-text" data-unique-id="930c5238-1814-4ac9-b8e3-99e1a4a04eb8" data-file-name="components/DynamicDashboard.tsx">Edit Widget</span></h3>
            
            <div className="mb-4" data-unique-id="436c25bf-438f-48dd-a738-d1e09e16e096" data-file-name="components/DynamicDashboard.tsx">
              <label htmlFor="widget-title" className="block text-sm font-medium mb-1" data-unique-id="6d770067-1dd5-49ad-9034-fa959253f2fc" data-file-name="components/DynamicDashboard.tsx"><span className="editable-text" data-unique-id="89c88e5f-001c-4f0e-8ad2-144b533122d5" data-file-name="components/DynamicDashboard.tsx">Widget Title</span></label>
              <input id="widget-title" type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" value={widgets.find(w => w.id === editingWidget)?.title || ''} onChange={e => {
            setWidgets(widgets.map(w => w.id === editingWidget ? {
              ...w,
              title: e.target.value
            } : w));
          }} data-unique-id="0b611989-c50b-45de-8bed-4f727a7b2db4" data-file-name="components/DynamicDashboard.tsx" />
            </div>
            
            <div className="flex justify-end gap-2" data-unique-id="e3ca430c-2b7a-44a8-aaaa-4ca3fffde512" data-file-name="components/DynamicDashboard.tsx">
              <button onClick={() => setEditingWidget(null)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50" data-unique-id="091ae644-c08c-4872-92ce-c8017f63c469" data-file-name="components/DynamicDashboard.tsx"><span className="editable-text" data-unique-id="ba66350a-7c21-4788-920f-3ad19e854d09" data-file-name="components/DynamicDashboard.tsx">
                Cancel
              </span></button>
              <button onClick={() => setEditingWidget(null)} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600" data-unique-id="8ec6c24f-17c2-4992-bfa3-23a8b9e27a93" data-file-name="components/DynamicDashboard.tsx"><span className="editable-text" data-unique-id="ae6c639c-e14c-400e-b78e-b3662f55e45c" data-file-name="components/DynamicDashboard.tsx">
                Save Changes
              </span></button>
            </div>
          </div>
        </div>}
    </div>;
}