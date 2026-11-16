/**
 * Flujos.gs
 * -----------------------------------------------------------------------
 * Reemplaza a buildFlujos_ de Transforms.gs.
 *
 * BORRAR buildFlujos_ DE Transforms.gs ANTES DE PEGAR ESTE ARCHIVO. Apps
 * Script no avisa cuando dos archivos declaran la misma función: gana la
 * última que carga, y terminás ejecutando una versión distinta de la que
 * estás leyendo.
 *
 * QUÉ CAMBIA
 *
 * La versión anterior tomaba un solo destino por despacho:
 *
 *     var destinoPrincipal = d.destinos.filter(esPrincipal)[0] || d.destinos[0];
 *
 * Con eso, un formato que reparte a seis municipios contaba como una
 * entrega, no seis. DESPACHO_DESTINO es N:N justamente para poder
 * contarlos todos, así que el modelo ya lo permitía; era el código el
 * que descartaba los secundarios.
 *
 * Ahora se recorren todos los destinos del puente. Cada par origen a
 * destino suma una entrega por cada despacho que lo nombra.
 *
 * QUÉ IMPLICA, PARA QUE NADIE SE SORPRENDA DESPUÉS
 *
 * El total de entregas deja de ser igual al número de filas de
 * DESPACHOS. Antes eran lo mismo y ahora no: 422 despachos producen 432
 * enlaces, así que el total sube en esa diferencia. No es doble conteo,
 * es el criterio que ya usaba el tablero anterior en su cuenta de
 * soportes documentales, donde los 7 formatos conjuntos aportaban 15
 * entregas.
 *
 * Lo que NO cambia: las unidades de ENVIOS_CATEGORIA. Esa tabla ya viene
 * agregada por destino y sigue siendo la única fuente de cantidades. No
 * se reparte ni se divide entre municipios, porque hacerlo sería inventar
 * datos que la transcripción nunca tuvo.
 * -----------------------------------------------------------------------
 */

/**
 * GET /flujos
 *
 * Una fila por par (origen, destino) con al menos una entrega real.
 * `despachosCount` es la ÚNICA métrica que debe alimentar el grosor o la
 * intensidad del arco animado en el frontend, nunca las unidades de
 * ENVIOS_CATEGORIA, que no están desagregadas por origen.
 *
 * Los destinos sin coordenada (precision "SIN_UBICAR") y el origen no
 * animable (ORI-EXTERNO) se excluyen del layer de arcos pero quedan
 * trazables vía `excluidos`.
 *
 * Shape de retorno (contrato con domain/entities.ts, FlujosResponse):
 *   { flujos: Flujo[], excluidos: FlujoExcluido[] }
 */
function buildFlujos_(catalogs, facts) {
  var pares = {}; // key: origenId + '::' + destinoId
  var excluidos = [];

  facts.despachos.forEach(function (d) {
    if (!d.destinos || d.destinos.length === 0) return; // ya reportado como DESPACHO_SIN_DESTINO

    var origen = getOrigenById_(d.origenId);

    d.destinos.forEach(function (relacion) {
      var destino = catalogs.destinosById[relacion.destinoId];

      var puedeAnimarse =
        !!origen && origen.animable && destino && destino.precision === 'MUNICIPIO';

      if (!puedeAnimarse) {
        excluidos.push({
          despachoId: d.id,
          origenId: d.origenId,
          destinoId: relacion.destinoId,
          motivo: !origen || !origen.animable ? 'ORIGEN_SIN_COORDENADA' : 'DESTINO_SIN_COORDENADA',
        });
        return;
      }

      var key = d.origenId + '::' + relacion.destinoId;

      if (!pares[key]) {
        pares[key] = {
          origenId: d.origenId,
          destino: {
            id: destino.id,
            nombre: destino.nombre,
            tipo: destino.tipo,
            latitud: destino.latitud,
            longitud: destino.longitud,
          },
          despachosCount: 0,
          primeraFecha: d.fecha,
          ultimaFecha: d.fecha,
          porFecha: {},
        };
      }

      pares[key].despachosCount += 1;

      if (d.fecha) {
        if (!pares[key].primeraFecha || d.fecha < pares[key].primeraFecha) {
          pares[key].primeraFecha = d.fecha;
        }
        if (!pares[key].ultimaFecha || d.fecha > pares[key].ultimaFecha) {
          pares[key].ultimaFecha = d.fecha;
        }
        pares[key].porFecha[d.fecha] = (pares[key].porFecha[d.fecha] || 0) + 1;
      }
    });
  });

  return {
    flujos: Object.keys(pares).map(function (k) {
      var par = pares[k];
      return {
        origenId: par.origenId,
        destino: par.destino,
        despachosCount: par.despachosCount,
        primeraFecha: par.primeraFecha,
        ultimaFecha: par.ultimaFecha,
        porFecha: Object.keys(par.porFecha)
          .sort()
          .map(function (f) {
            return { fecha: f, despachosCount: par.porFecha[f] };
          }),
      };
    }),
    excluidos: excluidos,
  };
}