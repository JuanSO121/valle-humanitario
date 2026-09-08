/**
 * ControlesMovil.tsx
 * -----------------------------------------------------------------------
 * Los controles del mapa en celular, en una barra de una línea.
 *
 * EL PROBLEMA
 *
 * En un teléfono había seis capas flotando sobre el mapa a la vez: la
 * barra superior, el botón de reiniciar, la leyenda de orígenes, el
 * marcador de cifras, el panel de territorio con sus nueve botones, y la
 * línea de tiempo. Al mapa le quedaba menos de un tercio de la pantalla,
 * repartido en dos franjas sueltas.
 *
 * Y no era solo espacio. El marcador decía "142 entregas" y el panel de
 * abajo "215 entregas", las dos con la misma palabra y a un dedo de
 * distancia. Son cosas distintas —una cuenta arcos dibujados y la otra
 * enlaces a municipio— pero nadie que lea un mapa tiene por qué saber
 * eso. Dos números con la misma etiqueta es peor que ninguno.
 *
 * LA REGLA QUE SE APLICÓ
 *
 * En un mapa, el mapa manda. Todo lo demás justifica su sitio o se
 * guarda detrás de un gesto. Acá quedaron dos cosas visibles:
 *
 * · UNA línea de resumen. La misma que antes encabezaba el panel de
 *   territorio, ahora sin competencia. El marcador flotante deja de
 *   dibujarse en celular.
 * · UN botón de filtros. Los nueve controles pasan detrás de él, en una
 *   hoja que se abre y se cierra.
 *
 * Con eso el mapa recupera cerca de dos tercios de la pantalla.
 *
 * POR QUÉ EL BOTÓN MUESTRA LO QUE HAY ACTIVO
 *
 * Esconder un filtro no puede esconder su efecto. Si alguien filtró por
 * Norte y cerró la hoja, el mapa muestra ocho municipios y nada explica
 * por qué: se lee como que el resto no recibió ayuda. Por eso el botón
 * lleva los filtros activos escritos al lado —"Norte · Solo ese día"— y
 * un punto amarillo. Es la diferencia entre ocultar un control y ocultar
 * un estado.
 *
 * La leyenda de orígenes se muda adentro de la hoja. Solo hace falta
 * cuando hay arcos dibujados, y quien esté mirando arcos es exactamente
 * quien va a abrir los filtros.
 *
 * POR QUÉ SON DOS COMPONENTES Y NO UNO
 *
 * La barra vive dentro del bloque inferior de DashboardPage, que lleva
 * `pointer-events-none` para no comerse los toques del mapa en toda esa
 * franja; cada hijo reactiva los suyos.
 *
 * La hoja NO puede vivir ahí. Heredaría ese "no me toques" y se abriría
 * sin responder a nada, que es exactamente lo que pasaba. Y además
 * quedaría anclada a ese bloque en vez de al mapa, y atrapada en su
 * contexto de apilamiento, así que ni siquiera podría subir por encima
 * de los paneles.
 *
 * Por eso `HojaFiltros` se exporta aparte y DashboardPage la monta a la
 * altura de los paneles de destino y origen, que es donde le
 * corresponde. El estado de abierto/cerrado también vive allá: es lo que
 * permite que la barra sepa que hay filtros abiertos sin tener que
 * consultar hacia arriba.
 * -----------------------------------------------------------------------
 */
import { type ReactNode } from "react";
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { HojaInferior } from "./HojaInferior";
import { describeLens } from "@/presentation/data/territoryTime";
import type {
  TerritoryMapMode,
  TerritoryRoutesMode,
  TerritoryZone,
} from "@/presentation/data/territoryData";

const TODAS = "todas";

/** Los mismos colores con los que MapCanvas pinta los arcos. */
const ORIGENES_LEYENDA = [
  { nombre: "Salió de Cali", color: "#2f6fed" },
  { nombre: "Salió de Cartago", color: "#e6883c" },
] as const;

interface BarraProps {
  entregas: number;
  municipios: number;
  lens: TerritoryMapMode;
  day: string | null;
  iso: string | null;
  zone: TerritoryZone | "todas";
  routesMode: TerritoryRoutesMode;
  filtrosAbiertos: boolean;
  onAbrirFiltros: () => void;
  onReiniciar: () => void;
}

/**
 * Qué filtros se apartan del estado de reposo.
 *
 * Se listan solo esos. Poner siempre los tres —"Todas · Todo lo
 * entregado · Ver rutas"— sería ruido constante y volvería invisible
 * justo lo que hay que notar.
 */
function filtrosActivos(
  zone: TerritoryZone | "todas",
  lens: TerritoryMapMode,
  routesMode: TerritoryRoutesMode,
): string[] {
  const activos: string[] = [];
  if (zone !== TODAS) activos.push(zone);
  if (lens === "jornada") activos.push("Solo ese día");
  if (routesMode === "solo") activos.push("Solo lo elegido");
  if (routesMode === "color") activos.push("Sin rutas");
  return activos;
}

/** La barra de una línea que queda sobre el mapa. */
export function BarraMovil({
  entregas,
  municipios,
  lens,
  day,
  iso,
  zone,
  routesMode,
  filtrosAbiertos,
  onAbrirFiltros,
  onReiniciar,
}: BarraProps) {
  const activos = filtrosActivos(zone, lens, routesMode);

  return (
    <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-border bg-surface/95 p-2 shadow-lg backdrop-blur">
      {/* El resumen. Es la única cifra del mapa en celular: el marcador
          flotante no se dibuja, así que acá no compite con nada y no
          hay dos números diciéndose "entregas" a la vez. */}
      <div className="min-w-0 flex-1 px-1">
        <p className="truncate text-[15px] leading-tight text-foreground">
          <b className="font-semibold">{entregas.toLocaleString("es-CO")}</b>{" "}
          {entregas === 1 ? "entrega" : "entregas"} en {municipios}{" "}
          {municipios === 1 ? "municipio" : "municipios"}
        </p>
        <p className="truncate text-[13px] leading-tight text-muted-foreground">
          {describeLens(lens, day, iso)}
        </p>
      </div>

      {/* Reiniciar, solo icono. Con etiqueta ocupaba media barra para
          una acción que se usa una vez cada muchas. El `aria-label`
          sostiene el significado para quien no ve el icono. */}
      <button
        type="button"
        onClick={onReiniciar}
        aria-label="Reiniciar vista"
        className="grid size-11 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-surface-raised hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <RotateCcw className="size-5" aria-hidden />
      </button>

      <button
        type="button"
        onClick={onAbrirFiltros}
        aria-expanded={filtrosAbiertos}
        className={`relative flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-[14px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
          activos.length > 0
            ? "bg-primary text-primary-foreground"
            : "bg-surface-raised text-foreground"
        }`}
      >
        <SlidersHorizontal className="size-4 shrink-0" aria-hidden />
        {/* Con filtros activos, el botón los nombra en vez de decir
            "Filtros". Un control escondido no puede esconder su efecto:
            si alguien filtró por Norte y cerró la hoja, el mapa muestra
            ocho municipios y sin esto nada explica por qué. */}
        <span className="max-w-[9rem] truncate">
          {activos.length > 0 ? activos.join(" · ") : "Filtros"}
        </span>
        {activos.length > 0 && (
          <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-[#FFD400]" />
        )}
      </button>
    </div>
  );
}

interface HojaProps {
  abierta: boolean;
  onCerrar: () => void;
  zonasDisponibles: string[];
  lens: TerritoryMapMode;
  day: string | null;
  iso: string | null;
  zone: TerritoryZone | "todas";
  routesMode: TerritoryRoutesMode;
  onLensChange: (lens: TerritoryMapMode) => void;
  onZoneChange: (zone: TerritoryZone | "todas") => void;
  onRoutesModeChange: (mode: TerritoryRoutesMode) => void;
  onReiniciar: () => void;
}

/**
 * Los nueve controles, en una hoja.
 *
 * Se monta al mismo nivel que los paneles de destino y origen, NO dentro
 * de la barra: ver la nota de cabecera.
 */
export function HojaFiltros({
  abierta,
  onCerrar,
  zonasDisponibles,
  lens,
  day,
  iso,
  zone,
  routesMode,
  onLensChange,
  onZoneChange,
  onRoutesModeChange,
  onReiniciar,
}: HojaProps) {
  return (
    <HojaInferior
      abierta={abierta}
      onCerrar={onCerrar}
      titulo="Filtros del mapa"
      resumen={describeLens(lens, day, iso)}
      /* Abre en el anclaje medio y no en el bajo: acá la persona ya
         declaró que quiere ver los controles al tocar el botón, y
         dejarla asomada la obligaría a un segundo gesto para lo que
         acaba de pedir. */
      anclajeInicial={1}
    >
      <div className="flex flex-col gap-5 pt-1">
        <Grupo titulo="Cómo se lee el día">
          <div className="grid grid-cols-2 gap-1 rounded-md bg-background/70 p-1">
            <Toggle active={lens === "acumulado"} onClick={() => onLensChange("acumulado")}>
              Todo lo entregado
            </Toggle>
            <Toggle
              active={lens === "jornada"}
              onClick={() => onLensChange("jornada")}
              disabled={day === null}
            >
              Solo ese día
            </Toggle>
          </div>
          {day === null && (
            <p className="mt-2 text-[13px] leading-5 text-muted-foreground">
              Mueva la línea de tiempo para ver cómo se entregaron las ayudas día por día.
            </p>
          )}
        </Grupo>

        <Grupo titulo="Zona del Valle">
          <div className="flex flex-wrap gap-1.5">
            {[TODAS, ...zonasDisponibles].map((item) => (
              <Toggle
                key={item}
                active={zone === item}
                onClick={() => onZoneChange(item as TerritoryZone | "todas")}
              >
                {item === TODAS ? "Todas" : item}
              </Toggle>
            ))}
          </div>
        </Grupo>

        <Grupo titulo="Rutas">
          <div className="grid grid-cols-3 gap-1 rounded-md bg-background/70 p-1">
            <Toggle
              active={routesMode === "visibles"}
              onClick={() => onRoutesModeChange("visibles")}
            >
              Ver rutas
            </Toggle>
            <Toggle active={routesMode === "solo"} onClick={() => onRoutesModeChange("solo")}>
              Solo lo elegido
            </Toggle>
            <Toggle active={routesMode === "color"} onClick={() => onRoutesModeChange("color")}>
              Sin rutas
            </Toggle>
          </div>

          {/* La leyenda vive acá y no flotando sobre el mapa: solo hace
              falta cuando hay arcos dibujados, y quien esté mirando
              arcos es justamente quien abre esta hoja. */}
          <ul className="mt-3 flex flex-col gap-2">
            {ORIGENES_LEYENDA.map((o) => (
              <li key={o.nombre} className="flex items-center gap-2 text-[14px] text-foreground">
                <span
                  aria-hidden
                  className="block size-3 shrink-0 rounded-full"
                  style={{ background: o.color }}
                />
                {o.nombre}
              </li>
            ))}
          </ul>
        </Grupo>

        <button
          type="button"
          onClick={() => {
            onReiniciar();
            onCerrar();
          }}
          className="min-h-11 rounded-lg border border-border text-[15px] font-semibold text-foreground transition hover:bg-surface-raised"
        >
          Reiniciar la vista del mapa
        </button>
      </div>
    </HojaInferior>
  );
}

/**
 * Un bloque con su rótulo.
 *
 * En la barra anterior los nueve botones iban seguidos sin nada que los
 * separara, así que había que deducir qué hacía cada trío por el texto
 * de sus etiquetas. En una hoja hay sitio para decirlo.
 */
function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section>
      <span className="label-caps text-xs">{titulo}</span>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Toggle({
  active,
  onClick,
  children,
  disabled = false,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      /* 44 px de alto. Los de la barra anterior medían 32 y estaban en el
         borde inferior de la pantalla, que es donde peor acierta el
         pulgar. */
      className={`min-h-11 rounded px-3 text-[14px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-surface-raised hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}