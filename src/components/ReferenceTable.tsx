import type { ReferenceRow } from '../types';

interface Props {
  rows: ReferenceRow[];
}

export default function ReferenceTable({ rows }: Props) {
  return (
    <div className="glass-table">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left px-4 py-3 font-medium">Level</th>
            <th className="text-left px-4 py-3 font-medium">Time Range</th>
            <th className="text-left px-4 py-3 font-medium">Pace</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.level}>
              <td className="px-4 py-3 font-medium text-white">{row.level}</td>
              <td className="px-4 py-3">{row.time}</td>
              <td className="px-4 py-3">{row.pace}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
