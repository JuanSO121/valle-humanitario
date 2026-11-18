/**
 * PuntosDistribucionSection.tsx — "Otros puntos de distribución"
 * -----------------------------------------------------------------------
 * Cierra el relato con los otros dos puntos de distribución de la
 * Gobernación: Cartago y Buenaventura, sin texto de introducción. Usa las mismas tarjetas azul marino con rótulo amarillo que
 * presentaban las rutas principales, para que se lea como continuación de
 * lo que ya se conocía.
 *
 * Sustituye a «¿De dónde salió?», que dibujaba rutas y porcentajes por
 * origen. El Excel oficial de despachos no registra de dónde salió cada
 * despacho, así que no hay cifra honesta que poner acá: la sección dice
 * dónde están los puntos y nada más. Las toneladas por punto se agregan el
 * día que haya fuente.
 *
 * LOS NOMBRES ESTÁN EN EL CÓDIGO, NO EN UNA BASE
 *
 * Son dos puntos fijos, definidos por la Gobernación. Una base para dos
 * nombres sería una hoja que alguien puede dañar sin ganar nada.
 * -----------------------------------------------------------------------
 */
import { Banda, SectionTitle, Resaltado } from "./storyPrimitives";
import { TarjetaPrincipal } from "./TarjetaPrincipal";

const PUNTOS = [
  { nombre: "Punto de distribución Cartago", acento: "#E36B0F" },
  { nombre: "Punto de distribución Buenaventura", acento: "#22ABE2" },
] as const;

export function PuntosDistribucionSection() {
  return (
    <section id="puntos" className="vc-seccion bg-white">
      <Banda tono="blanco" primera>
        <SectionTitle>
          Otros puntos de <Resaltado>distribución</Resaltado>
        </SectionTitle>
        <div className="mt-8 grid gap-3 md:grid-cols-2 md:gap-4">
          {PUNTOS.map((p, i) => (
            <TarjetaPrincipal
              key={p.nombre}
              indice={i}
              compacta
              rotulo="Punto de distribución"
              acento={p.acento}
              titulo={p.nombre.replace("Punto de distribución ", "")}
            />
          ))}
        </div>
      </Banda>
    </section>
  );
}
