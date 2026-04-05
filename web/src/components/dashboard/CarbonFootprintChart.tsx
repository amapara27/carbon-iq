import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

interface DataPoint {
  month: string;
  co2: number;
  offset: number;
}

interface CarbonFootprintChartProps {
  data?: DataPoint[];
}

const defaultData: DataPoint[] = [
  { month: "Jan", co2: 320, offset: 80 },
  { month: "Feb", co2: 290, offset: 120 },
  { month: "Mar", co2: 340, offset: 150 },
  { month: "Apr", co2: 280, offset: 200 },
  { month: "May", co2: 250, offset: 220 },
  { month: "Jun", co2: 210, offset: 260 },
];

export default function CarbonFootprintChart({
  data = defaultData,
}: CarbonFootprintChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Carbon Footprint vs. Offset</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="co2Gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="offsetGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#243029" />
              <XAxis
                dataKey="month"
                stroke="#6b7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#6b7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) => `${value}kg`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#111916",
                  border: "1px solid #243029",
                  borderRadius: "0.75rem",
                  color: "#fff",
                  fontSize: "0.875rem",
                }}
              />
              <Area
                type="monotone"
                dataKey="co2"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#co2Gradient)"
                name="CO₂ Emitted (kg)"
              />
              <Area
                type="monotone"
                dataKey="offset"
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#offsetGradient)"
                name="CO₂ Offset (kg)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
