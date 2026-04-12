import { Link } from "react-router-dom";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-lg outline-none ring-blue-500 focus-visible:ring-2"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <svg
              className="h-4 w-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </div>
          <span className="text-xl font-bold text-gray-900">
            Fatal<span className="text-blue-600"> Consulta</span>
          </span>
        </Link>
        <div className="flex items-center gap-3 text-sm font-medium">
          <span className="hidden cursor-pointer text-gray-500 transition-colors hover:text-gray-800 sm:block">
            Para Pacientes
          </span>
          <span className="hidden cursor-pointer text-gray-500 transition-colors hover:text-gray-800 sm:block">
            Para Clínicas
          </span>
          <button
            type="button"
            className="hidden rounded-lg border border-gray-200 px-4 py-1.5 text-gray-700 transition-colors hover:bg-gray-50 sm:block"
          >
            Entrar
          </button>
          <button
            type="button"
            className="rounded-lg bg-blue-600 px-4 py-1.5 font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Cadastrar
          </button>
        </div>
      </div>
    </header>
  );
}
