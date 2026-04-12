import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CLINIC_IMG_FALLBACK } from "@/data/clinics";
import { getClinicaCompletaPorId } from "@/data/mockClinicDatabase";

export function ClinicDetailPage() {
  const { id: idParam } = useParams();
  const id = idParam ? Number.parseInt(idParam, 10) : Number.NaN;
  const clinica =
    Number.isFinite(id) && id > 0 ? getClinicaCompletaPorId(id) : null;

  const [imgSrc, setImgSrc] = useState(clinica?.imagem ?? CLINIC_IMG_FALLBACK);

  useEffect(() => {
    if (clinica) setImgSrc(clinica.imagem);
  }, [clinica]);

  useEffect(() => {
    if (clinica) {
      document.title = `${clinica.nome} — Fatal Consulta`;
    } else {
      document.title = "Clínica não encontrada — Fatal Consulta";
    }
    return () => {
      document.title = "Fatal Consulta — Encontre clínicas perto de você";
    };
  }, [clinica]);

  if (!clinica) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="rounded-2xl border border-gray-200 bg-white p-10 shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">
            Clínica não encontrada
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            O identificador informado não existe no nosso catálogo de exemplo.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Voltar para a busca
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800"
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
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Voltar para a busca
      </Link>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="relative h-56 bg-gray-100 sm:h-72">
          <img
            src={imgSrc}
            alt={clinica.nome}
            className="h-full w-full object-cover"
            onError={() => setImgSrc(CLINIC_IMG_FALLBACK)}
          />
          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            {clinica.aberto ? (
              <span className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white shadow">
                Aberto agora
              </span>
            ) : (
              <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white shadow">
                Fechado
              </span>
            )}
            <span className="flex items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-gray-800 shadow">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="#fbbf24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              {clinica.avaliacao.toFixed(1)}
            </span>
            <span className="flex items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-gray-800 shadow">
              <svg
                className="h-3.5 w-3.5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {clinica.distancia.toFixed(1)} km
            </span>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            {clinica.nome}
          </h1>
          <p className="mt-2 flex items-start gap-2 text-sm text-gray-500">
            <svg
              className="mt-0.5 h-4 w-4 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            {clinica.endereco}
          </p>

          <div className="mt-6 grid gap-8 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <section>
                <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400">
                  Sobre
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-gray-700">
                  {clinica.descricao}
                </p>
              </section>

              <section>
                <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400">
                  Horários de funcionamento
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  Resumo: <span className="font-medium">{clinica.horario}</span>{" "}
                  (conforme cadastro da listagem)
                </p>
                <ul className="mt-3 divide-y divide-gray-100 rounded-xl border border-gray-100">
                  {clinica.horariosSemana.map((h) => (
                    <li
                      key={h.dia}
                      className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="text-sm font-medium text-gray-800">
                        {h.dia}
                      </span>
                      {h.fechado || h.intervalos.length === 0 ? (
                        <span className="text-sm text-gray-400">Fechado</span>
                      ) : (
                        <span className="text-sm text-gray-600">
                          {h.intervalos.join(" · ")}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400">
                  Corpo clínico
                </h2>
                <ul className="mt-3 grid gap-4 sm:grid-cols-2">
                  {clinica.medicos.map((m) => (
                    <li
                      key={m.id}
                      className="rounded-xl border border-gray-100 bg-gray-50/80 p-4"
                    >
                      <p className="font-semibold text-gray-900">{m.nome}</p>
                      <p className="text-xs text-blue-600">{m.especialidade}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        Registro: {m.crm}
                      </p>
                      <p className="mt-2 text-sm text-gray-600">{m.bio}</p>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <div className="space-y-6">
              <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400">
                  Contato
                </h2>
                <ul className="mt-3 space-y-3 text-sm">
                  <li className="flex gap-2 text-gray-700">
                    <span className="shrink-0 font-medium text-gray-500">
                      Tel.
                    </span>
                    <a
                      href={`tel:${clinica.telefone.replace(/\D/g, "")}`}
                      className="text-blue-600 hover:underline"
                    >
                      {clinica.telefone}
                    </a>
                  </li>
                  <li className="flex gap-2 text-gray-700">
                    <span className="shrink-0 font-medium text-gray-500">
                      E-mail
                    </span>
                    <a
                      href={`mailto:${clinica.email}`}
                      className="break-all text-blue-600 hover:underline"
                    >
                      {clinica.email}
                    </a>
                  </li>
                </ul>
                <button
                  type="button"
                  className="mt-5 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  Solicitar agendamento
                </button>
                <p className="mt-2 text-center text-xs text-gray-400">
                  Fluxo de agendamento em desenvolvimento (mock).
                </p>
              </section>

              <section>
                <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400">
                  Convênios aceitos
                </h2>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {clinica.convenios.map((cv) => (
                    <span
                      key={cv}
                      className="rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-xs text-gray-600"
                    >
                      {cv}
                    </span>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400">
                  Especialidades
                </h2>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {clinica.especialidades.map((e) => (
                    <span
                      key={e}
                      className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700"
                    >
                      {e}
                    </span>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400">
                  Serviços e diferenciais
                </h2>
                <ul className="mt-2 list-inside list-disc text-sm text-gray-600">
                  {clinica.servicos.map((s) => (
                    <li key={s} className="py-0.5">
                      {s}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
