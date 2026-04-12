import { useState } from "react";
import { Link } from "react-router-dom";
import { CLINIC_IMG_FALLBACK } from "@/data/clinics";
import type { Clinica } from "@/types/clinic";

export function ClinicCard({ c }: { c: Clinica }) {
  const [imgSrc, setImgSrc] = useState(c.imagem);
  const espVisiveis = c.especialidades.slice(0, 3);
  const espExtras = c.especialidades.length - 3;
  const convVisiveis = c.convenios.slice(0, 3);
  const convExtras = c.convenios.length - 3;

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      <div className="relative h-48 overflow-hidden bg-gray-100">
        <img
          src={imgSrc}
          alt={c.nome}
          className="h-full w-full object-cover"
          onError={() => setImgSrc(CLINIC_IMG_FALLBACK)}
        />
        <div className="absolute left-3 top-3">
          {c.aberto ? (
            <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-semibold text-white shadow">
              Aberto agora
            </span>
          ) : (
            <span className="rounded-full bg-red-500 px-2.5 py-1 text-xs font-semibold text-white shadow">
              Fechado
            </span>
          )}
        </div>
        <div className="absolute right-3 top-3">
          <span className="flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-gray-800 shadow">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="#fbbf24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            {c.avaliacao.toFixed(1)}
          </span>
        </div>
        <div className="absolute bottom-3 left-3">
          <span className="flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-gray-800 shadow">
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
            {c.distancia.toFixed(1)} km
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-1 flex items-center gap-1.5 text-xs text-gray-400">
          <svg
            className="h-3.5 w-3.5 shrink-0"
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
          <span className="truncate">{c.endereco}</span>
        </div>
        <h3 className="mb-3 text-lg font-bold text-gray-900">{c.nome}</h3>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {espVisiveis.map((e) => (
            <span
              key={e}
              className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700"
            >
              {e}
            </span>
          ))}
          {espExtras > 0 && (
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
              +{espExtras}
            </span>
          )}
        </div>
        <div className="mb-4 flex-1">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Convenios aceitos
          </p>
          <div className="flex flex-wrap gap-1.5">
            {convVisiveis.map((cv) => (
              <span
                key={cv}
                className="rounded-full border border-gray-200 px-2.5 py-0.5 text-xs text-gray-600"
              >
                {cv}
              </span>
            ))}
            {convExtras > 0 && (
              <span className="rounded-full border border-gray-200 px-2.5 py-0.5 text-xs text-gray-400">
                +{convExtras}
              </span>
            )}
          </div>
        </div>
        <Link
          to={`/clinica/${c.id}`}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-blue-700 active:bg-blue-800"
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
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          Agendar consulta
        </Link>
      </div>
    </div>
  );
}
