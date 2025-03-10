import {  IBreakEvenPointData } from "./break-even-point-output.types";


export const BreakEvenPointOutput = ({ data }: { data: IBreakEvenPointData[]}) => {
  if (data.length === 0) return null;


  return (
    <div className="mt-8 bg-slate-100 p-4 rounded-lg border border-slate-200">
      <h3 className="text-lg font-semibold mb-3 text-slate-800">
        Scan Results
      </h3>
      <ul className="list-disc pl-5 space-y-2 text-slate-700">
        {data.map((stock, index) => (
            <li key={index}>
                <span className="font-medium">{stock.ticker}</span> - 
                <span className="text-gray-600">
                    {" "}
                    (EV to Revenue: <span className="font-semibold">{'test'}</span>)
                </span>
            </li>
        ))}
      </ul>
    </div>
  );
};
