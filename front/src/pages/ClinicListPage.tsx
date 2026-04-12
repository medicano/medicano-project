import { useMemo, useState } from "react";
import { ClinicCard } from "@/components/ClinicCard";
import { FilterFields } from "@/components/FilterFields";
import { CLINICAS } from "@/data/clinics";
import type { Clinica, Ordenacao } from "@/types/clinic";

function filtrarEOrdenar(
  lista: Clinica[],
  busca: string,
  distancia: number,
  especialidades: Set<string>,
  convenios: Set<string>,
  ordenacao: Ordenacao,
): Clinica[] {
  const termo = busca.toLowerCase();
  const filtradas = lista.filter((c) => {
    const matchBusca =
      !termo ||
      c.nome.toLowerCase().includes(termo) ||
      c.especialidades.some((e) => e.toLowerCase().includes(termo));
    const matchDist = c.distancia <= distancia;
    const matchEsp =
      especialidades.size === 0 ||
      c.especialidades.some((e) => especialidades.has(e));
    const matchConv =
      convenios.size === 0 ||
      c.convenios.some((cv) => convenios.has(cv));
    return matchBusca && matchDist && matchEsp && matchConv;
  });

  return [...filtradas].sort((a, b) => {
    if (ordenacao === "distancia") return a.distancia - b.distancia;
    if (ordenacao === "avaliacao") return b.avaliacao - a.avaliacao;
    if (ordenacao === "convenios") return b.convenios.length - a.convenios.length;
    return 0;
  });
}

export function ClinicListPage() {
  const [busca, setBusca] = useState("");
  const [distancia, setDistancia] = useState(50);
  const [especialidades, setEspecialidades] = useState<Set<string>>(
    () => new Set(),
  );
  const [convenios, setConvenios] = useState<Set<string>>(() => new Set());
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("distancia");
  const [filtrosMobileAberto, setFiltrosMobileAberto] = useState(false);

  const filtradas = useMemo(
    () =>
      filtrarEOrdenar(
        CLINICAS,
        busca,
        distancia,
        especialidades,
        convenios,
        ordenacao,
      ),
    [busca, distancia, especialidades, convenios, ordenacao],
  );

  const contadorTexto =
    filtradas.length === 1
      ? "1 clínica encontrada"
      : `${filtradas.length} clínicas encontradas`;

  function toggleEspecialidade(esp: string, checked: boolean) {
    setEspecialidades((prev) => {
      const next = new Set(prev);
      if (checked) next.add(esp);
      else next.delete(esp);
      return next;
    });
  }

  function toggleConvenio(conv: string, checked: boolean) {
    setConvenios((prev) => {
      const next = new Set(prev);
      if (checked) next.add(conv);
      else next.delete(conv);
      return next;
    });
  }

  function limparFiltros() {
    setBusca("");
    setDistancia(50);
    setEspecialidades(new Set());
    setConvenios(new Set());
    setOrdenacao("distancia");
  }

  const filterProps = {
    distancia,
    onDistanciaChange: setDistancia,
    especialidades,
    convenios,
    onToggleEspecialidade: toggleEspecialidade,
    onToggleConvenio: toggleConvenio,
  };

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex gap-8">
          <aside className="sticky top-24 hidden w-72 shrink-0 flex-col self-start overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:flex">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="text-base font-bold text-gray-900">
                Filtrar Clínicas
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">
                Encontre o local ideal
              </p>
            </div>
            <div className="max-h-[calc(100vh-200px)] space-y-6 overflow-y-auto px-5 py-5">
              <FilterFields {...filterProps} />
            </div>
            <div className="mt-auto border-t border-gray-100 px-5 py-4">
              <button
                type="button"
                onClick={limparFiltros}
                className="w-full rounded-xl border border-gray-200 py-2 text-sm font-medium text-gray-600 transition-colors duration-200 hover:border-gray-300 hover:bg-gray-50"
              >
                Limpar filtros
              </button>
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <div className="mb-6 space-y-4">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Encontre clínicas perto de você
              </h1>

              <div className="flex gap-3">
                <div className="relative flex-1">
                  <svg
                    className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    type="text"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Buscar por nome ou especialidade..."
                    className="h-12 w-full rounded-xl border border-gray-200 bg-white py-0 pl-11 pr-4 text-sm shadow-sm transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setFiltrosMobileAberto(true)}
                  className="flex h-12 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 lg:hidden"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 4a1 1 0 011-1h16a1 1 0 010 2H4a1 1 0 01-1-1zm3 6a1 1 0 011-1h10a1 1 0 010 2H7a1 1 0 01-1-1zm4 6a1 1 0 011-1h4a1 1 0 010 2h-4a1 1 0 01-1-1z"
                    />
                  </svg>
                  Filtros
                </button>

                <select
                  value={ordenacao}
                  onChange={(e) =>
                    setOrdenacao(e.target.value as Ordenacao)
                  }
                  className="appearance-select h-12 cursor-pointer rounded-xl border border-gray-200 bg-white px-4 pr-9 text-sm font-medium text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="distancia">Mais proximas</option>
                  <option value="avaliacao">Melhor avaliacao</option>
                  <option value="convenios">Mais convenios</option>
                </select>
              </div>

              <p className="text-sm text-gray-500">
                <span className="mr-1 rounded-full bg-blue-50 px-2 py-0.5 font-semibold text-blue-600">
                  {contadorTexto}
                </span>
              </p>
            </div>

            {filtradas.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filtradas.map((c) => (
                  <ClinicCard key={c.id} c={c} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-24 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                  <svg
                    className="h-7 w-7 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <h3 className="mb-1 text-lg font-bold text-gray-800">
                  Nenhuma clínica encontrada
                </h3>
                <p className="mx-auto mb-5 max-w-sm text-sm text-gray-500">
                  Tente ajustar os filtros ou buscar por outra especialidade.
                </p>
                <button
                  type="button"
                  onClick={limparFiltros}
                  className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Limpar filtros
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <button
        type="button"
        aria-hidden={!filtrosMobileAberto}
        className={`fixed inset-0 z-40 bg-black/40 lg:hidden ${filtrosMobileAberto ? "" : "hidden"}`}
        onClick={() => setFiltrosMobileAberto(false)}
      />

      <div
        className={`fixed inset-y-0 left-0 z-50 flex w-80 flex-col bg-white shadow-xl lg:hidden ${filtrosMobileAberto ? "" : "hidden"}`}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <span className="font-bold text-gray-900">Filtros</span>
          <button
            type="button"
            onClick={() => setFiltrosMobileAberto(false)}
            className="rounded-lg p-1 transition-colors hover:bg-gray-100"
          >
            <svg
              className="h-5 w-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <FilterFields {...filterProps} />
        </div>
        <div className="border-t border-gray-100 px-5 py-4">
          <button
            type="button"
            onClick={limparFiltros}
            className="w-full rounded-xl border border-gray-200 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            Limpar filtros
          </button>
        </div>
      </div>
    </>
  );
}
