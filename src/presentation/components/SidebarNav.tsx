import { useEffect, useState, type ComponentType } from "react";
import { ChevronLeft, Map, Menu, X } from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

interface Props {
  items: NavItem[];
  /** Contenedor con scroll donde viven las secciones. */
  scrollRootId: string;
  /** Sección a la que vuelve el logo. Por defecto, la primera de la lista. */
  homeId?: string | undefined;
}

export function SidebarNav({ items, scrollRootId, homeId }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const root = document.getElementById(scrollRootId);
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActivo(visible.target.id);
      },
      { root, threshold: [0.25, 0.5, 0.75], rootMargin: "-20% 0px -60% 0px" },
    );

    items.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [items, scrollRootId]);

  const inicioId = homeId ?? items[0]?.id ?? "";

  const irA = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setAbierto(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label="Abrir menú"
        className="fixed left-4 top-4 z-50 flex size-12 items-center justify-center rounded-full bg-white text-[#00578C] shadow-lg ring-1 ring-[#00578C]/15 transition hover:bg-[#E8F6FC] md:hidden"
      >
        <Menu className="size-6" aria-hidden />
      </button>

      {abierto && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setAbierto(false)}
          className="fixed inset-0 z-40 bg-[#0B2233]/50 backdrop-blur-sm md:hidden"
        />
      )}

      <nav
        aria-label="Secciones"
        className={`fixed left-0 top-0 z-50 flex h-dvh flex-col border-r border-[#00578C]/12 bg-white py-5 transition-[width,transform] duration-300 ease-out motion-reduce:transition-none ${
          abierto
            ? "w-72 translate-x-0 px-4"
            : "w-72 -translate-x-full px-4 md:w-20 md:translate-x-0 md:px-3"
        }`}
      >
        <div className="mb-5 flex items-center gap-3 px-1">
          <button
            type="button"
            onClick={() => irA(inicioId)}
            aria-label="Volver al inicio"
            title="Volver al inicio"
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#00578C] text-white transition hover:bg-[#00456F]"
          >
            <Map className="size-6" aria-hidden />
          </button>

          {abierto ? (
            <>
              <button
                type="button"
                onClick={() => irA(inicioId)}
                className="min-w-0 flex-1 text-left"
              >
                <b className="block truncate font-serif text-lg leading-tight text-[#00578C]">
                  Mapa de Ayudas
                </b>
                <span className="block text-sm text-[#5E7789]">Valle del Cauca</span>
              </button>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar menú"
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-[#4E6B7C] transition hover:bg-[#F4F9FC]"
              >
                <X className="size-5 md:hidden" aria-hidden />
                <ChevronLeft className="hidden size-5 md:block" aria-hidden />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setAbierto(true)}
              aria-label="Abrir menú"
              className="hidden size-11 shrink-0 items-center justify-center rounded-xl text-[#4E6B7C] transition hover:bg-[#F4F9FC] md:flex"
            >
              <Menu className="size-6" aria-hidden />
            </button>
          )}
        </div>

        <ul className="flex flex-1 flex-col gap-1">
          {items.map(({ id, label, icon: Icon }) => {
            const esActivo = activo === id;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => irA(id)}
                  aria-current={esActivo ? "true" : undefined}
                  title={abierto ? undefined : label}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-base font-semibold transition ${
                    esActivo
                      ? "bg-[#E8F6FC] text-[#00578C]"
                      : "text-[#4E6B7C] hover:bg-[#F4F9FC] hover:text-[#00578C]"
                  } ${abierto ? "" : "md:justify-center md:px-0"}`}
                >
                  <Icon className="size-6 shrink-0" aria-hidden />
                  <span className={abierto ? "truncate" : "truncate md:hidden"}>{label}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <p className={`px-2 pt-4 text-sm text-[#6E8B9E] ${abierto ? "" : "md:hidden"}`}>
          Información al 25 de agosto de 2026
        </p>
      </nav>
    </>
  );
}