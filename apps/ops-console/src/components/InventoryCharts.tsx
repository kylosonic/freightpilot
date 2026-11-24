import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Panel } from './ui/Panel';
import type { InventoryOverviewRow } from '../types/api';

const axisStyle = { fill: '#73736e', fontSize: 11 };
const tooltipStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e4e0',
  borderRadius: '6px',
  color: '#252522',
};

type Props = {
  data: InventoryOverviewRow[];
};

export function InventoryCharts({ data }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Panel
        eyebrow="Inventory"
        title="Stock by warehouse"
        description="Compare the stock you have with the minimum you want to keep."
      >
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barCategoryGap="18%">
              <CartesianGrid stroke="#efeeea" strokeDasharray="2 3" />
              <XAxis dataKey="warehouse_code" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f7f7f5' }} />
              <Legend wrapperStyle={{ color: '#454540', fontSize: 11 }} />
              <Bar
                dataKey="total_quantity_on_hand"
                name="Quantity On Hand"
                fill="#087f72"
                radius={[2, 2, 0, 0]}
                animationDuration={1000}
              />
              <Bar
                dataKey="total_safety_stock"
                name="Safety Stock"
                fill="#c7a04c"
                radius={[2, 2, 0, 0]}
                animationDuration={1200}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel
        eyebrow="Capacity"
        title="Warehouse space used"
        description="See how much warehouse capacity is in use."
      >
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid stroke="#efeeea" strokeDasharray="2 3" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} unit="%" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="warehouse_code" width={72} tick={axisStyle} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f7f7f5' }} />
              <Bar
                dataKey="utilization_percent"
                name="Utilization percent"
                fill="#087f72"
                radius={[0, 2, 2, 0]}
                animationDuration={800}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </div>
  );
}
