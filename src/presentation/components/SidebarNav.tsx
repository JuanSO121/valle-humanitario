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
  homeId?: string;
}

export function SidebarNav({
  items,
  scrollRootId,
  homeId,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(items[0]?.id ?? "");

  const visiblesRef = useRef(new Set<string>());

  useEffect(() => {
    const root = document.getElementById(scrollRootId);

    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visiblesRef.current.add(entry.target.id);
          } else {
            visiblesRef.current.delete(entry.target.id);
          }
        }

        /*
         * Busca la primera sección visible según el orden
         * definido en el menú.
         *
         * Si ninguna sección está dentro de la banda central,
         * mantiene la sección activa anterior.
         */
        const actual = items.find((item) =>
          visiblesRef.current.has(item.id),
        );

        if (actual) {
          setActivo(actual.id);
        }
      },
      {
        root,

        /*
         * Banda de detección situada aproximadamente en el
         * centro de la pantalla.
         */
        rootMargin: "-45% 0px -50% 0px",

        /*
         * Se utiliza 0 porque las secciones pueden ser mucho
         * más grandes que la banda de observación.
         */
        threshold: 0,
      },
    );

    items.forEach((item) => {
      const elemento = document.getElementById(item.id);

      if (elemento) {
        observer.observe(elemento);
      }
    });

    return () => {
      observer.disconnect();
      visiblesRef.current.clear();
    };
  }, [items, scrollRootId]);

  const inicioId = homeId ?? items[0]?.id ?? "";

  const irA = (id: string) => {
    const elemento = document.getElementById(id);

    if (!elemento) return;

    elemento.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    setAbierto(false);
  };

  return (
    <>
      {/* Botón móvil */}
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label="Abrir menú"
        className="fixed left-4 top-4 z-50 flex size-12 items-center justify-center rounded-full bg-white text-[#00578C] shadow-lg ring-1 ring-[#00578C]/15 transition hover:bg-[#E8F6FC] md:hidden"
      >
        <Menu className="size-6" aria-hidden />
      </button>

      {/* Overlay móvil */}
      {abierto && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setAbierto(false)}
          className="fixed inset-0 z-40 bg-[#0B2233]/50 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Sidebar */}
      <nav
        aria-label="Secciones"
        className={`
          fixed left-0 top-0 z-50 flex h-dvh flex-col
          border-r border-[#00578C]/12
          bg-white
          py-5
          transition-[width,transform]
          duration-300
          ease-out
          motion-reduce:transition-none

          ${
            abierto
              ? "w-72 translate-x-0 px-4"
              : "w-72 -translate-x-full px-4 md:w-20 md:translate-x-0 md:px-3"
          }
        `}
      >
        {/* Cabecera */}
        <div className="mb-5 flex items-center gap-3 px-1">
          {/* Logo */}
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
              {/* Nombre */}
              <button
                type="button"
                onClick={() => irA(inicioId)}
                className="min-w-0 flex-1 text-left"
              >
                <b className="block truncate font-serif text-lg leading-tight text-[#00578C]">
                  Mapa de Ayudas
                </b>

                <span className="block text-sm text-[#5E7789]">
                  Valle del Cauca
                </span>
              </button>

              {/* Cerrar */}
              <button
                type="button"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar menú"
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-[#4E6B7C] transition hover:bg-[#F4F9FC]"
              >
                <X
                  className="size-5 md:hidden"
                  aria-hidden
                />

                <ChevronLeft
                  className="hidden size-5 md:block"
                  aria-hidden
                />
              </button>
            </>
          ) : (
            /* Botón expandir escritorio */
            <button
              type="button"
              onClick={() => setAbierto(true)}
              aria-label="Abrir menú"
              title="Abrir menú"
              className="hidden size-11 shrink-0 items-center justify-center rounded-xl text-[#4E6B7C] transition hover:bg-[#F4F9FC] md:flex"
            >
              <Menu
                className="size-6"
                aria-hidden
              />
            </button>
          )}
        </div>

        {/* Navegación */}
        <ul className="flex flex-1 flex-col gap-1">
          {items.map(({ id, label, icon: Icon }) => {
            const esActivo = activo === id;

            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => irA(id)}
                  aria-current={
                    esActivo ? "page" : undefined
                  }
                  title={!abierto ? label : undefined}
                  className={`
                    flex w-full items-center gap-3
                    rounded-xl px-3 py-3
                    text-left text-base font-semibold
                    transition

                    ${
                      esActivo
                        ? "bg-[#E8F6FC] text-[#00578C]"
                        : "text-[#4E6B7C] hover:bg-[#F4F9FC] hover:text-[#00578C]"
                    }

                    ${
                      abierto
                        ? ""
                        : "md:justify-center md:px-0"
                    }
                  `}
                >
                  <Icon
                    className="size-6 shrink-0"
                    aria-hidden
                  />

                  <span
                    className={
                      abierto
                        ? "truncate"
                        : "truncate md:hidden"
                    }
                  >
                    {label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Información */}
        <p
          className={`
            px-2 pt-4 text-sm text-[#6E8B9E]
            ${abierto ? "" : "md:hidden"}
          `}
        >
          Información al 25 de agosto de 2026
        </p>
      </nav>
    </>
  );
}