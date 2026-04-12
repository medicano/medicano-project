import { TODAS_ESPECIALIDADES, TODOS_CONVENIOS } from "@/data/clinics";

type Props = {
  distancia: number;
  onDistanciaChange: (v: number) => void;
  especialidades: Set<string>;
  convenios: Set<string>;
  onToggleEspecialidade: (esp: string, checked: boolean) => void;
  onToggleConvenio: (conv: string, checked: boolean) => void;
};

export function FilterFields({
  distancia,
  onDistanciaChange,
  especialidades,
  convenios,
  onToggleEspecialidade,
  onToggleConvenio,
}: Props) {
  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-800">Distância</span>
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600">
            Até {distancia} km
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={50}
          value={distancia}
          onChange={(e) => onDistanciaChange(Number(e.target.value))}
          className="w-full cursor-pointer"
        />
        <div className="mt-2 flex justify-between text-xs text-gray-400">
          <span>1 km</span>
          <span>50 km</span>
        </div>
      </div>

      <hr className="border-gray-100" />

      <div>
        <p className="mb-3 text-sm font-semibold text-gray-800">Especialidade</p>
        <div className="space-y-2.5">
          {TODAS_ESPECIALIDADES.map((item) => (
            <label
              key={item}
              className="group flex cursor-pointer items-center gap-2"
            >
              <input
                type="checkbox"
                className="h-4 w-4 cursor-pointer rounded accent-blue-600"
                checked={especialidades.has(item)}
                onChange={(e) =>
                  onToggleEspecialidade(item, e.target.checked)
                }
              />
              <span className="text-sm text-gray-600 transition-colors group-hover:text-gray-900">
                {item}
              </span>
            </label>
          ))}
        </div>
      </div>

      <hr className="border-gray-100" />

      <div>
        <p className="mb-3 text-sm font-semibold text-gray-800">Convênios</p>
        <div className="space-y-2.5">
          {TODOS_CONVENIOS.map((item) => (
            <label
              key={item}
              className="group flex cursor-pointer items-center gap-2"
            >
              <input
                type="checkbox"
                className="h-4 w-4 cursor-pointer rounded accent-blue-600"
                checked={convenios.has(item)}
                onChange={(e) => onToggleConvenio(item, e.target.checked)}
              />
              <span className="text-sm text-gray-600 transition-colors group-hover:text-gray-900">
                {item}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
