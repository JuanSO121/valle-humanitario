import { useEffect, useRef, useState, type ComponentType } from "react";
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
  /** Fecha del último registro, ya formateada. Viene de la API. */
  fechaCorte?: string | undefined;
}

export function SidebarNav({ items, scrollRootId, homeId, fechaCorte }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(items[0]?.id ?? "");

  const visiblesRef = useRef(new Set<string>());

  useEffect(() => {
    const root = document.getElementById(scrollRootId);
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visiblesRef.current.add(entry.target.id);
          else visiblesRef.current.delete(entry.target.id);
        }
        // La primera sección en orden del menú que cruce la banda. Si
        // ninguna la cruza, se conserva la última marcada en vez de
        // dejar el menú sin sección activa.
        const actual = items.find((i) => visiblesRef.current.has(i.id));
        if (actual) setActivo(actual.id);
      },
      {
        root,
        // Banda delgada a la altura del centro de la pantalla. El
        // threshold va en 0 a propósito: con thresholds altos, una
        // sección más alta que la banda nunca alcanza ese ratio y el
        // callback no dispara, así que el menú se quedaba clavado en la
        // primera sección.
        rootMargin: "-45% 0px -50% 0px",
        threshold: 0,
      },
    );

    items.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });
    return () => {
      observer.disconnect();
      visiblesRef.current.clear();
    };
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
        className="fixed left-4 top-4 z-50 flex size-12 items-center justify-center rounded-full bg-white text-[#0079C1] shadow-lg ring-1 ring-[#0079C1]/15 transition hover:bg-[#EAF7FC] md:hidden"
      >
        <Menu className="size-6" aria-hidden />
      </button>

      {abierto && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setAbierto(false)}
          className="fixed inset-0 z-40 bg-[#123E5C]/50 backdrop-blur-sm md:hidden"
        />
      )}

      <nav
        aria-label="Secciones"
        className={`fixed left-0 top-0 z-50 flex h-dvh flex-col border-r border-[#0079C1]/12 bg-white py-5 transition-[width,transform] duration-300 ease-out motion-reduce:transition-none ${
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
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#0079C1] text-white transition hover:bg-[#00639F]"
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
                <b className="block font-serif text-lg leading-tight text-[#0079C1]">
                  Ruta de la Solidaridad
                </b>
                <span className="block text-sm text-[#35708F]">Valle del Cauca</span>
              </button>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar menú"
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-[#35708F] transition hover:bg-[#F2FAFD]"
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
              className="hidden size-11 shrink-0 items-center justify-center rounded-xl text-[#35708F] transition hover:bg-[#F2FAFD] md:flex"
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
                      ? "bg-[#EAF7FC] text-[#0079C1]"
                      : "text-[#35708F] hover:bg-[#F2FAFD] hover:text-[#0079C1]"
                  } ${abierto ? "" : "md:justify-center md:px-0"}`}
                >
                  <Icon className="size-6 shrink-0" aria-hidden />
                  <span className={abierto ? "truncate" : "truncate md:hidden"}>{label}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {fechaCorte && (
          <p className={`px-2 pt-4 text-sm text-[#6B93AA] ${abierto ? "" : "md:hidden"}`}>
            Información al {fechaCorte}
          </p>
        )}
      </nav>
    </>
  );
}