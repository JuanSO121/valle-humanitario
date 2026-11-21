/**
 * Pruebas del script de la carga de /admin (apps-script/Admin.js), con el libro simulado.
 * Ejecutar:  node --test tests/admin/backend.test.mjs
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { crearEntorno } from "./libro-simulado.mjs";

const nuevo = (op) => crearEntorno(op);
const peticion = (e, cuerpo) => JSON.stringify({ token: "t".repeat(32), ...cuerpo });

// ===================================================================== acceso
describe("Acceso al script (doPost)", () => {
  it("sin ADMIN_TOKEN configurado, la escritura queda apagada", () => {
    const e = nuevo({ token: null });
    const r = e.doPost(JSON.stringify({ token: "lo-que-sea", accion: "revisar", carga: e.base({ informacionGeneral: { toneladasRecibidas: 1 } }) }));
    assert.equal(r.status, 401);
  });
  it("un token de menos de 24 caracteres no sirve, ni siquiera si coincide", () => {
    const e = nuevo({ token: "corto-123" });
    assert.equal(e.doPost(JSON.stringify({ token: "corto-123", accion: "revisar", carga: {} })).status, 401);
  });
  it("un token incorrecto o ausente se rechaza", () => {
    const e = nuevo();
    assert.equal(e.doPost(JSON.stringify({ token: "x".repeat(32), accion: "revisar", carga: {} })).status, 401);
    assert.equal(e.doPost(JSON.stringify({ accion: "revisar", carga: {} })).status, 401);
    assert.equal(e.doPost(JSON.stringify({ token: null, accion: "revisar", carga: {} })).status, 401);
  });
  it("con el token correcto revisa", () => {
    const e = nuevo();
    const r = e.doPost(peticion(e, { accion: "revisar", carga: e.base({ informacionGeneral: { toneladasRecibidas: 5 } }) }));
    assert.equal(r.error, undefined);
    assert.equal(r.puedeCargar, true);
  });
  it("tras 20 intentos fallidos se bloquea todo, incluso el token correcto", () => {
    const e = nuevo();
    for (let i = 0; i < 20; i++) e.doPost(JSON.stringify({ token: "mal", accion: "revisar", carga: {} }));
    const r = e.doPost(peticion(e, { accion: "revisar", carga: e.base({ informacionGeneral: { toneladasRecibidas: 5 } }) }));
    assert.equal(r.status, 429);
  });
  it("cuerpo vacío, demasiado grande, JSON roto y acción desconocida dan un mensaje claro", () => {
    const e = nuevo();
    assert.equal(e.doPost("").status, 400);
    assert.equal(e.doPost("x".repeat(2_600_000)).status, 400);
    const roto = e.doPost("{esto no es json");
    assert.equal(roto.status, 500);
    assert.doesNotMatch(roto.message, /SyntaxError|Unexpected|position/i, "no debe filtrar detalles internos");
    assert.equal(e.doPost(peticion(e, { accion: "borrar_todo", carga: {} })).status, 400);
  });
  it("no revela cuál carácter del token falla (mismo mensaje en todos los casos)", () => {
    const e = nuevo();
    const a = e.doPost(JSON.stringify({ token: "t".repeat(31) + "x", accion: "revisar", carga: {} }));
    const b = e.doPost(JSON.stringify({ token: "x" + "t".repeat(31), accion: "revisar", carga: {} }));
    assert.deepEqual(a, b);
  });
});

// ===================================================================== forma de la carga
describe("Forma del archivo", () => {
  const e = nuevo();
  it("rechaza lo que no es un objeto", () => {
    for (const malo of [null, [], "texto", 12, true]) {
      const p = e.revisar(malo);
      assert.equal(p.puedeCargar, false);
      assert.match(p.errores[0], /formato esperado/);
    }
  });
  it("rechaza otro formato u otra versión", () => {
    assert.match(e.revisar({ formato: "otro", version: 1, distribucion: [] }).errores[0], /no es una carga válida/);
    assert.match(e.revisar({ formato: "ruta-solidaridad/carga", version: 2, distribucion: [] }).errores[0], /no es una carga válida/);
  });
  it("un archivo sin ninguna sección con datos no se puede cargar", () => {
    const p = e.revisar(e.base({}));
    assert.match(p.errores[0], /ninguna sección/);
    assert.equal(p.puedeCargar, false);
  });
  it("cada sección tiene que ser una lista", () => {
    for (const s of ["distribucion", "queHaceFalta", "destinosNuevos", "contratacion"]) {
      const p = e.revisar(e.base({ [s]: { no: "lista" } }));
      assert.match(p.errores.join(" "), new RegExp("«" + s + "» debe ser una lista"), s);
    }
  });
  it("más de 1.500 filas en una sección se rechaza", () => {
    const muchas = Array.from({ length: 1501 }, (_, i) => e.fila({ producto: "P" + i }));
    assert.match(e.revisar(e.base({ distribucion: muchas })).errores.join(" "), /1500/);
    const elementos = Array.from({ length: 1501 }, (_, i) => ({ categoria: "Alimentos", elemento: "E" + i, estado: "Escaso" }));
    assert.match(e.revisar(e.base({ queHaceFalta: elementos })).errores.join(" "), /demasiadas filas/);
    assert.match(e.revisar(e.base({ contratacion: Array.from({ length: 1501 }, () => ({})) })).errores.join(" "), /demasiadas filas/);
    assert.match(e.revisar(e.base({ destinosNuevos: Array.from({ length: 1501 }, () => ({})) })).errores.join(" "), /demasiadas filas/);
  });
  it("las dudas de la IA se muestran limpias y como máximo 50", () => {
    const p = e.revisar(e.base({ informacionGeneral: { toneladasRecibidas: 1 }, avisos: Array.from({ length: 80 }, (_, i) => `  Duda\n${i}  `) }));
    assert.equal(p.avisosDeLaIA.length, 50);
    assert.equal(p.avisosDeLaIA[0], "Duda 0");
  });
});

// ===================================================================== información general
describe("Información general (totales)", () => {
  it("escribe recibidas e inventario en la fila bajo los títulos", () => {
    const e = nuevo();
    const r = e.aplicar(e.base({ informacionGeneral: { toneladasRecibidas: 1234.5, toneladasInventario: 300.5 } }));
    assert.equal(r.ok, true);
    assert.equal(r.cargado.totales, 2);
    assert.equal(e.hojas.TOTALES[4][0], 1234.5);
    assert.equal(e.hojas.TOTALES[4][1], 300.5);
  });
  it("acepta texto con coma decimal y con puntos de miles", () => {
    const e = nuevo();
    e.aplicar(e.base({ informacionGeneral: { toneladasRecibidas: "1.234,5", toneladasInventario: "300,5" } }));
    assert.equal(e.hojas.TOTALES[4][0], 1234.5);
    assert.equal(e.hojas.TOTALES[4][1], 300.5);
  });
  it("rechaza números negativos y texto que no es número", () => {
    const e = nuevo();
    assert.equal(e.revisar(e.base({ informacionGeneral: { toneladasRecibidas: -3 } })).informacionGeneral.errores.length, 1);
    assert.equal(e.revisar(e.base({ informacionGeneral: { toneladasInventario: "mucho" } })).informacionGeneral.errores.length, 1);
    assert.equal(e.revisar(e.base({ informacionGeneral: { toneladasRecibidas: "12 t" } })).informacionGeneral.errores.length, 1);
  });
  it("con un error no se escribe ninguna de las dos cifras", () => {
    const e = nuevo();
    const r = e.aplicar(e.base({ informacionGeneral: { toneladasRecibidas: 50, toneladasInventario: -1 } }));
    assert.ok(r.fallo);
    assert.deepEqual(e.hojas.TOTALES[4], []);
  });
  it("lo que viene vacío (null) no toca la cifra actual", () => {
    const e = nuevo({ preparar: (h) => { h.TOTALES[4] = [100, 40]; } });
    e.aplicar(e.base({ informacionGeneral: { toneladasRecibidas: 150, toneladasInventario: null } }));
    assert.equal(e.hojas.TOTALES[4][0], 150);
    assert.equal(e.hojas.TOTALES[4][1], 40);
  });
  it("si las dos vienen vacías o iguales a las de hoy, no hay nada que cargar", () => {
    const e = nuevo({ preparar: (h) => { h.TOTALES[4] = [100, 40]; } });
    assert.match(e.aplicar(e.base({ informacionGeneral: { toneladasRecibidas: null, toneladasInventario: null } })).fallo, /nada nuevo/);
    assert.match(e.aplicar(e.base({ informacionGeneral: { toneladasRecibidas: 100, toneladasInventario: 40 } })).fallo, /nada nuevo/);
  });
  it("la revisión muestra cómo está hoy y cómo quedaría", () => {
    const e = nuevo({ preparar: (h) => { h.TOTALES[4] = [100, 40]; } });
    const g = e.revisar(e.base({ informacionGeneral: { toneladasRecibidas: 150 } })).informacionGeneral;
    assert.deepEqual(g.recibidas, { antes: 100, despues: 150, cambia: true });
    assert.equal(g.inventario.cambia, false);
  });
  it("subirlo dos veces deja lo mismo", () => {
    const e = nuevo();
    const c = e.base({ informacionGeneral: { toneladasRecibidas: 9, toneladasInventario: 3 } });
    assert.equal(e.aplicar(c).ok, true);
    assert.ok(e.aplicar(c).fallo);
    assert.deepEqual(e.hojas.TOTALES[4], [9, 3]);
  });
  it("sin la fila de títulos de TOTALES se detiene con un mensaje claro", () => {
    const e = nuevo({ preparar: (h) => { h.TOTALES[3] = ["otra cosa"]; } });
    const r = e.aplicar(e.base({ informacionGeneral: { toneladasRecibidas: 1 } }));
    assert.match(r.fallo, /fila de títulos en TOTALES/);
  });
});

// ===================================================================== qué hace falta
describe("Qué hace falta", () => {
  const lista = (e) => e.hojas.QUE_HACE_FALTA.slice(4).filter((f) => f[1]).map((f) => `${f[0]}|${f[1]}|${f[2]}`);
  it("escribe la lista nueva desde la primera fila de datos", () => {
    const e = nuevo();
    const r = e.aplicar(e.base({ queHaceFalta: [{ categoria: "Alimentos", elemento: "Arroz", estado: "Escaso" }, { categoria: "Kit de aseo", elemento: "Jabón", estado: "Agotado", observaciones: "Urgente" }] }));
    assert.equal(r.cargado.faltantes, 2);
    assert.deepEqual(lista(e), ["Alimentos|Arroz|Escaso", "Kit de aseo|Jabón|Agotado"]);
    assert.equal(e.hojas.QUE_HACE_FALTA[5][3], "Urgente");
  });
  it("entiende la categoría y el estado sin importar mayúsculas ni tildes", () => {
    const e = nuevo();
    e.aplicar(e.base({ queHaceFalta: [{ categoria: "proteccion y seguridad", elemento: "Guantes", estado: "BUENA CANTIDAD" }] }));
    assert.deepEqual(lista(e), ["Protección y seguridad|Guantes|Buena cantidad"]);
  });
  it("marca con error: categoría inválida, estado inválido, elemento vacío, repetido y texto largo", () => {
    const e = nuevo();
    const f = e.revisar(e.base({ queHaceFalta: [
      { categoria: "Cosas raras", elemento: "X", estado: "Escaso" },
      { categoria: "Alimentos", elemento: "Y", estado: "Casi" },
      { categoria: "Alimentos", elemento: "", estado: "Escaso" },
      { categoria: "Alimentos", elemento: "Arroz", estado: "Escaso" },
      { categoria: "alimentos", elemento: "ARROZ", estado: "Agotado" },
      { categoria: "Alimentos", elemento: "E".repeat(201), estado: "Escaso" },
      { categoria: "Alimentos", elemento: "Z", estado: "Escaso", observaciones: "o".repeat(501) },
    ] })).queHaceFalta.filas.map((x) => x.estadoFila);
    assert.deepEqual(f, ["error", "error", "error", "ok", "error", "error", "error"]);
  });
  it("sin ninguna fila válida NO reemplaza la lista de hoy y lo avisa", () => {
    const e = nuevo({ preparar: (h) => { h.QUE_HACE_FALTA[4] = ["Alimentos", "Agua", "Escaso", ""]; } });
    const p = e.revisar(e.base({ queHaceFalta: [{ categoria: "Nada", elemento: "X", estado: "Escaso" }] }));
    assert.equal(p.queHaceFalta.reemplaza, false);
    assert.match(p.avisos.join(" "), /no tiene ninguna fila válida/);
    assert.ok(e.aplicar(e.base({ queHaceFalta: [{ categoria: "Nada", elemento: "X", estado: "Escaso" }] })).fallo);
    assert.deepEqual(lista(e), ["Alimentos|Agua|Escaso"]);
  });
  it("muestra qué elementos de hoy desaparecerían", () => {
    const e = nuevo({ preparar: (h) => { h.QUE_HACE_FALTA[4] = ["Alimentos", "Agua", "Escaso", ""]; h.QUE_HACE_FALTA[5] = ["Kit de aseo", "Jabón", "Agotado", ""]; } });
    const q = e.revisar(e.base({ queHaceFalta: [{ categoria: "Alimentos", elemento: "Agua", estado: "Agotado" }] })).queHaceFalta;
    assert.equal(q.seQuitanTotal, 1);
    assert.equal(q.seQuitan[0].elemento, "Jabón");
  });
  it("una lista más corta limpia lo que sobraba; una más larga se escribe completa", () => {
    const e = nuevo({ preparar: (h) => { for (let i = 0; i < 4; i++) h.QUE_HACE_FALTA[4 + i] = ["Alimentos", "E" + i, "Escaso", ""]; } });
    e.aplicar(e.base({ queHaceFalta: [{ categoria: "Alimentos", elemento: "Único", estado: "Escaso" }] }));
    assert.deepEqual(lista(e), ["Alimentos|Único|Escaso"]);
    const mas = Array.from({ length: 9 }, (_, i) => ({ categoria: "Mascotas", elemento: "M" + i, estado: "Escaso" }));
    e.aplicar(e.base({ queHaceFalta: mas }));
    assert.equal(lista(e).length, 9);
  });
  it("si algo falla a la mitad, la lista nunca queda vacía (primero se escribe, luego se limpia)", () => {
    const e = nuevo({ preparar: (h) => { h.QUE_HACE_FALTA[4] = ["Alimentos", "Agua", "Escaso", ""]; } });
    e.fallarEn("clear", 1);
    const r = e.aplicar(e.base({ queHaceFalta: [{ categoria: "Alimentos", elemento: "Arroz", estado: "Escaso" }] }));
    assert.match(r.fallo, /ERROR NO CONTROLADO/);
    assert.ok(lista(e).length >= 1, "había que conservar elementos");
    assert.ok(lista(e).some((x) => x.includes("Arroz")), "la lista nueva ya estaba escrita");
  });
  it("subirla dos veces no la duplica", () => {
    const e = nuevo();
    const c = e.base({ queHaceFalta: [{ categoria: "Alimentos", elemento: "Arroz", estado: "Escaso" }] });
    e.aplicar(c); e.aplicar(c);
    assert.equal(lista(e).length, 1);
  });
  it("sin la fila de títulos se detiene con un mensaje claro", () => {
    const e = nuevo({ preparar: (h) => { h.QUE_HACE_FALTA[3] = ["otra"]; } });
    assert.match(e.aplicar(e.base({ queHaceFalta: [{ categoria: "Alimentos", elemento: "A", estado: "Escaso" }] })).fallo, /fila de títulos en QUE_HACE_FALTA/);
  });
});

// ===================================================================== distribución: validación
describe("Distribución: validación fila por fila", () => {
  const e = nuevo();
  const una = (o) => e.revisar(e.base({ distribucion: [e.fila(o)] })).distribucion.filas[0];
  it("una fila correcta se agrega sin avisos", () => {
    const f = una({});
    assert.equal(f.estado, "nueva");
    assert.deepEqual(f.errores, []);
    assert.deepEqual(f.avisos, []);
  });
  it("fecha: inválida, inexistente, de otro tipo, futura y anterior al terremoto", () => {
    assert.equal(una({ fecha: "02/11/2026" }).estado, "error", "día/mes/año se puede leer de dos maneras: no se adivina");
    assert.match(una({ fecha: "02/11/2026" }).errores[0], /formato 2026-10-31/);
    assert.equal(una({ fecha: "2026-02-31" }).estado, "error");
    assert.equal(una({ fecha: "2026-11-2" }).estado, "error");
    assert.equal(una({ fecha: 20261102 }).estado, "error");
    assert.equal(una({ fecha: null }).estado, "error");
    assert.match(una({ fecha: "2026-12-01" }).errores[0], /futura/);
    const antes = una({ fecha: "2026-07-01" });
    assert.equal(antes.estado, "nueva");
    assert.match(antes.avisos.join(" "), /anterior al terremoto/);
  });
  it("destino: falta, es muy largo, o no está en la lista (aviso, sí se carga)", () => {
    assert.match(una({ destino: null }).errores[0], /Falta el destino/);
    assert.match(una({ destino: "D".repeat(301) }).errores.join(" "), /demasiado largo/);
    const d = una({ destino: "Lugar que no existe" });
    assert.equal(d.estado, "nueva");
    assert.match(d.avisos.join(" "), /no está en la lista/);
  });
  it("destino: reconoce el existente aunque cambien tildes, mayúsculas o espacios", () => {
    assert.deepEqual(una({ destino: "  cali   ", familia: "Mercados y kits de alimentos" }).avisos, []);
    assert.deepEqual(una({ destino: "CALI – CHIMINANGOS" }).avisos, []);
  });
  it("familia: falta, no existe (error) o existe con otras mayúsculas (bien)", () => {
    assert.match(una({ familia: null }).errores[0], /Falta el tipo de ayuda/);
    assert.match(una({ familia: "Familia inventada" }).errores[0], /no está en la lista de familias/);
    assert.equal(una({ familia: "agua y bebidas" }).estado, "nueva");
  });
  it("producto y presentación: sin producto es aviso; demasiado largo es error", () => {
    assert.match(una({ producto: null }).avisos.join(" "), /No trae producto/);
    assert.equal(una({ producto: "P".repeat(301) }).estado, "error");
    assert.equal(una({ presentacion: "x".repeat(301) }).estado, "error");
    assert.equal(una({ observaciones: "o".repeat(501) }).estado, "error");
  });
  it("peso: total directo, cantidad por kilos, o texto con coma", () => {
    assert.equal(una({ kilosTotal: 320, cantidad: null, kilosUnitario: null }).kilosTotal, 320);
    assert.equal(una({ kilosTotal: null, cantidad: 10, kilosUnitario: 2.5 }).kilosTotal, 25);
    assert.equal(una({ kilosTotal: "50,5", cantidad: null, kilosUnitario: null }).kilosTotal, 50.5);
    assert.equal(una({ kilosTotal: "1.234,5", cantidad: null, kilosUnitario: null }).kilosTotal, 1234.5);
  });
  it("peso: si total y cantidad por kilos no coinciden, avisa y manda el total", () => {
    const f = una({ kilosTotal: 99, cantidad: 10, kilosUnitario: 2 });
    assert.equal(f.kilosTotal, 99);
    assert.match(f.avisos.join(" "), /no coinciden/);
  });
  it("peso: falta, negativo, texto, cero y enorme", () => {
    assert.match(una({ kilosTotal: null, cantidad: null, kilosUnitario: null }).errores.join(" "), /Falta el peso/);
    assert.match(una({ kilosTotal: -5 }).errores.join(" "), /negativo/);
    assert.match(una({ kilosTotal: "mucho" }).errores.join(" "), /no son un número/);
    assert.match(una({ kilosTotal: 0, cantidad: null, kilosUnitario: null }).avisos.join(" "), /no se envió nada/);
    assert.match(una({ kilosTotal: 250000, cantidad: null, kilosUnitario: null }).avisos.join(" "), /muy grande/);
    assert.equal(una({ cantidad: "diez", kilosTotal: 5 }).estado, "error");
  });
  it("dudas: true o «SI» marcan la fila; lo demás, no", () => {
    assert.equal(una({ dudas: true }).dudas, true);
    assert.equal(una({ dudas: "si" }).dudas, true);
    assert.equal(una({ dudas: false }).dudas, false);
    assert.equal(una({ dudas: "tal vez" }).dudas, false);
  });
  it("saltos de línea y tabuladores en el texto pasan a ser un espacio", () => {
    assert.equal(una({ observaciones: "Línea 1\nLínea 2\t(tab)" }).observaciones, "Línea 1 Línea 2 (tab)");
  });
  it("una fila que ni es un objeto no rompe la revisión", () => {
    const p = e.revisar(e.base({ distribucion: [null, "texto", 5, e.fila({})] }));
    assert.equal(p.distribucion.filas[0].estado, "error");
    assert.equal(p.distribucion.filas[3].estado, "nueva");
  });
});

// ===================================================================== distribución: contra lo que ya está
describe("Distribución: contra lo que ya está en el libro", () => {
  it("un envío idéntico a uno del libro sale «ya está»", () => {
    const e = nuevo();
    const p = e.revisar(e.base({ distribucion: [e.fila({ fecha: "2026-08-25", destino: "Cali", producto: "Mercado", cantidad: 50, kilosUnitario: 14, kilosTotal: 700 })] }));
    assert.equal(p.distribucion.filas[0].estado, "duplicada");
  });
  it("completa un despacho pendiente del 11 al 24 de agosto (misma fecha y destino) en su lugar", () => {
    const e = nuevo();
    const antes = e.filasConFecha();
    const r = e.aplicar(e.base({ distribucion: [e.fila({ fecha: "2026-08-11", destino: "el cerrito", familia: "Agua y bebidas", producto: "Agua", cantidad: 10, kilosUnitario: 20, kilosTotal: null })] }));
    assert.equal(r.cargado.completadas, 1);
    assert.equal(e.filasConFecha(), antes, "no agrega una fila nueva");
    assert.equal(e.hojas.DESPACHOS[1][2], "Agua y bebidas");
    assert.equal(e.hojas.DESPACHOS[1][7], 200);
  });
  it("los pendientes se consumen en orden; las filas que sobran entran como nuevas", () => {
    const e = nuevo();
    const tres = [1, 2, 3].map((i) => e.fila({ fecha: "2026-08-11", destino: "El Cerrito", producto: "P" + i, kilosTotal: 10 * i }));
    const p = e.revisar(e.base({ distribucion: tres }));
    assert.deepEqual(p.distribucion.filas.map((f) => f.estado), ["completa", "completa", "nueva"]);
    assert.deepEqual(p.distribucion.filas.slice(0, 2).map((f) => f.filaLibro), [2, 3]);
  });
  it("al completar un pendiente conserva la nota del Excel anterior si la nueva fila no trae observaciones", () => {
    const e = nuevo();
    e.aplicar(e.base({ distribucion: [e.fila({ fecha: "2026-08-12", destino: "Palmira", observaciones: null })] }));
    assert.match(e.hojas.DESPACHOS[3][9], /Excel anterior/);
  });
  it("si el destino no coincide con ningún pendiente del día, avisa que lo estimado seguirá contando", () => {
    const e = nuevo();
    const f = e.revisar(e.base({ distribucion: [e.fila({ fecha: "2026-08-11", destino: "Zarzal" })] })).distribucion.filas[0];
    assert.equal(f.estado, "nueva");
    assert.match(f.avisos.join(" "), /estimada seguirá contando/);
  });
  it("un día que ya tiene envíos cargados lleva aviso de posible repetición", () => {
    const e = nuevo();
    const p = e.revisar(e.base({ distribucion: [e.fila({ fecha: "2026-08-25", destino: "Zarzal", producto: "Otra cosa", kilosTotal: 77, cantidad: null, kilosUnitario: null })] }));
    assert.match(p.distribucion.filas[0].avisos.join(" "), /ya tiene 2 filas/);
    assert.equal(p.distribucion.resumen.posiblesRepetidas, 1);
  });
  it("mismo día, destino, familia y producto con OTRO peso es un conflicto", () => {
    const e = nuevo();
    const f = e.revisar(e.base({ distribucion: [e.fila({ fecha: "2026-08-25", producto: "Mercado", cantidad: null, kilosUnitario: null, kilosTotal: 999 })] })).distribucion.filas[0];
    assert.equal(f.estado, "conflicto");
    assert.equal(f.conflicto.tipo, "peso");
    assert.equal(f.conflicto.existentes[0].kilosTotal, 700);
    assert.equal(f.conflicto.existentes[0].fila, 5);
  });
  it("mismo día, destino y peso con el producto escrito distinto es un conflicto de nombre", () => {
    const e = nuevo();
    const f = e.revisar(e.base({ distribucion: [e.fila({ fecha: "2026-08-25", producto: "Mercados familiares", cantidad: null, kilosUnitario: null, kilosTotal: 700 })] })).distribucion.filas[0];
    assert.equal(f.estado, "conflicto");
    assert.equal(f.conflicto.tipo, "nombre");
  });
  it("si se parece a varias filas del libro, lo dice (total > 1)", () => {
    const e = nuevo({ preparar: (h) => { h.DESPACHOS.push(["2026-08-25", "Cali", "Mercados y kits de alimentos", "Mercado", "kit", 10, 14, 140, "NO", "", "", ""]); } });
    const f = e.revisar(e.base({ distribucion: [e.fila({ fecha: "2026-08-25", cantidad: null, kilosUnitario: null, kilosTotal: 555 })] })).distribucion.filas[0];
    assert.equal(f.estado, "conflicto");
    assert.equal(f.conflicto.total, 2);
  });
  it("dos idénticas en el archivo y una en el libro: la primera «ya está», la segunda es nueva", () => {
    const e = nuevo();
    const igual = e.fila({ fecha: "2026-08-25", producto: "Mercado", cantidad: 50, kilosUnitario: 14, kilosTotal: 700 });
    const p = e.revisar(e.base({ distribucion: [igual, igual] }));
    assert.deepEqual(p.distribucion.filas.map((f) => f.estado), ["duplicada", "nueva"]);
  });
  it("dos idénticas dentro del archivo y ninguna en el libro: entran las dos", () => {
    const e = nuevo();
    const r = e.aplicar(e.base({ distribucion: [e.fila({ kilosTotal: 500 }), e.fila({ kilosTotal: 500 })] }));
    assert.equal(r.cargado.nuevas, 2);
    assert.equal(e.revisar(e.base({ distribucion: [e.fila({ kilosTotal: 500 }), e.fila({ kilosTotal: 500 })] })).distribucion.resumen.duplicadas, 2);
  });
});

// ===================================================================== distribución: decisiones
describe("Distribución: decisiones sobre los conflictos", () => {
  const conflicto = () => {
    const e = nuevo();
    const carga = e.base({ distribucion: [e.fila({ fecha: "2026-08-25", producto: "Mercado", cantidad: null, kilosUnitario: null, kilosTotal: 999 })] });
    return { e, carga, antes: e.filasConFecha() };
  };
  it("un archivo que SOLO trae un conflicto se puede revisar y decidir (no dice «nada que cargar»)", () => {
    const { e, carga } = conflicto();
    assert.equal(e.revisar(carga).puedeCargar, true);
    const soloContrato = e.revisar(e.base({ contratacion: [{ id: "CTR0001", objeto: "Otro objeto" }] }));
    assert.equal(soloContrato.puedeCargar, true);
  });
  it("sin decidir, no se carga nada", () => {
    const { e, carga } = conflicto();
    assert.match(e.aplicar(carga, {}).fallo, /Falta decidir/);
    assert.match(e.aplicar(carga).fallo, /Falta decidir/);
    assert.match(e.aplicar(carga, []).fallo, /Falta decidir/);
    assert.match(e.aplicar(carga, null).fallo, /Falta decidir/);
  });
  it("una decisión inventada se rechaza", () => {
    const { e, carga } = conflicto();
    assert.match(e.aplicar(carga, { 1: "borrar" }).fallo, /Falta decidir/);
    assert.match(e.aplicar(carga, { 1: 5 }).fallo, /Falta decidir/);
  });
  it("«conservar» deja el libro como está", () => {
    const { e, carga, antes } = conflicto();
    assert.match(e.aplicar(carga, { 1: "conservar" }).fallo, /nada nuevo/);
    assert.equal(e.filasConFecha(), antes);
    assert.equal(e.hojas.DESPACHOS[4][7], 700);
  });
  it("«agregar» deja la del libro y suma la del archivo", () => {
    const { e, carga, antes } = conflicto();
    assert.equal(e.aplicar(carga, { 1: "agregar" }).ok, true);
    assert.equal(e.filasConFecha(), antes + 1);
    assert.equal(e.hojas.DESPACHOS[4][7], 700);
  });
  it("«reemplazar» cambia la fila del libro y guarda cómo estaba", () => {
    const { e, carga, antes } = conflicto();
    const r = e.aplicar(carga, { 1: "reemplazar" });
    assert.equal(r.cargado.reemplazadas, 1);
    assert.equal(e.filasConFecha(), antes);
    assert.equal(e.hojas.DESPACHOS[4][7], 999);
    assert.equal(e.registros.REEMPLAZOS.length, 1);
    assert.equal(e.registros.REEMPLAZOS[0][9], 700, "el peso anterior queda guardado");
  });
  it("no se puede «reemplazar» si se parece a varias filas del libro", () => {
    const e = nuevo({ preparar: (h) => { h.DESPACHOS.push(["2026-08-25", "Cali", "Mercados y kits de alimentos", "Mercado", "kit", 10, 14, 140, "NO", "", "", ""]); } });
    const carga = e.base({ distribucion: [e.fila({ fecha: "2026-08-25", cantidad: null, kilosUnitario: null, kilosTotal: 555 })] });
    assert.match(e.aplicar(carga, { 1: "reemplazar" }).fallo, /varias filas/);
    assert.equal(e.aplicar(carga, { 1: "agregar" }).ok, true);
  });
  it("dos filas del archivo no pueden reemplazar la misma fila del libro", () => {
    const e = nuevo();
    const f = (kg) => e.fila({ fecha: "2026-08-25", cantidad: null, kilosUnitario: null, kilosTotal: kg });
    const carga = e.base({ distribucion: [f(111), f(222)] });
    assert.match(e.aplicar(carga, { 1: "reemplazar", 2: "reemplazar" }).fallo, /misma fila del libro/);
    assert.equal(e.aplicar(carga, { 1: "reemplazar", 2: "agregar" }).ok, true);
  });
  it("mezcla de decisiones en una sola carga", () => {
    const e = nuevo();
    const f = (kg) => e.fila({ fecha: "2026-08-25", cantidad: null, kilosUnitario: null, kilosTotal: kg });
    const r = e.aplicar(e.base({ distribucion: [f(111), e.fila({ fecha: "2026-11-02", kilosTotal: 5, cantidad: null, kilosUnitario: null })] }), { 1: "conservar" });
    assert.equal(r.cargado.nuevas, 1);
    assert.equal(r.cargado.conservadas, 1);
  });
});

// ===================================================================== distribución: escritura y choques
describe("Distribución: escritura y choques con otras personas", () => {
  it("agrega al final, con la fecha como número de serie y en modo RAW (nada se interpreta como fórmula)", () => {
    const e = nuevo();
    const ultima = e.ultimaFila("DESPACHOS");
    e.aplicar(e.base({ distribucion: [e.fila({ observaciones: "=HYPERLINK(\"http://malo\")" })] }));
    assert.equal(e.ultimaFila("DESPACHOS"), ultima + 1);
    const f = e.hojas.DESPACHOS[ultima];
    assert.equal(f[0], "2026-11-02");
    assert.equal(f[9], "=HYPERLINK(\"http://malo\")", "se guarda como texto");
  });
  it("si la hoja se queda sin filas, agrega más antes de escribir", () => {
    const e = nuevo({ filasPorHoja: { DESPACHOS: 8 } });
    e.aplicar(e.base({ distribucion: Array.from({ length: 5 }, (_, i) => e.fila({ producto: "P" + i, kilosTotal: 10 + i })) }));
    assert.equal(e.extensiones.length, 1);
    assert.equal(e.extensiones[0].hoja, "DESPACHOS");
  });
  it("si alguien escribe una fila al final mientras se carga, no se escribe nada", () => {
    const e = nuevo();
    const antes = e.filasConFecha();
    e.alVerificar((h) => { h.DESPACHOS.push(["2026-11-19", "Tuluá"]); });
    const r = e.aplicar(e.base({ distribucion: [e.fila({})] }));
    assert.match(r.fallo, /cambió mientras/);
    assert.equal(e.filasConFecha(), antes + 1, "solo la fila de la otra persona");
  });
  it("si alguien completa el pendiente mientras se carga, no se pisa su trabajo", () => {
    const e = nuevo();
    e.alVerificar((h) => { h.DESPACHOS[1][2] = "Agua y bebidas"; h.DESPACHOS[1][7] = 99; });
    const r = e.aplicar(e.base({ distribucion: [e.fila({ fecha: "2026-08-11", destino: "El Cerrito" })] }));
    assert.match(r.fallo, /cambió mientras/);
    assert.equal(e.hojas.DESPACHOS[1][7], 99);
  });
  it("si alguien cambia el peso de la fila a reemplazar mientras se carga, se detiene", () => {
    const e = nuevo();
    e.alVerificar((h) => { h.DESPACHOS[4][7] = 800; });
    const r = e.aplicar(e.base({ distribucion: [e.fila({ fecha: "2026-08-25", cantidad: null, kilosUnitario: null, kilosTotal: 999 })] }), { 1: "reemplazar" });
    assert.match(r.fallo, /cambió mientras/);
    assert.equal(e.hojas.DESPACHOS[4][7], 800);
  });
  it("una hoja DESPACHOS con otras columnas da un mensaje claro", () => {
    const e = nuevo({ preparar: (h) => { h.DESPACHOS[0][1] = "lugar"; } });
    assert.match(e.aplicar(e.base({ distribucion: [e.fila({})] })).fallo, /columnas esperadas/);
  });
  it("subir el mismo archivo dos veces no duplica nada", () => {
    const e = nuevo();
    const c = e.base({ distribucion: [e.fila({}), e.fila({ destino: "Palmira", kilosTotal: 250 })] });
    const antes = e.filasConFecha();
    assert.equal(e.aplicar(c).ok, true);
    assert.match(e.aplicar(c).fallo, /nada nuevo/);
    assert.equal(e.filasConFecha(), antes + 2);
  });
  it("cargó, borró una fila a mano y vuelve a subir todo: la borrada vuelve, la otra «ya está»", () => {
    const e = nuevo();
    const c = e.base({ distribucion: [e.fila({}), e.fila({ destino: "Palmira", kilosTotal: 250 })] });
    e.aplicar(c);
    const i = e.hojas.DESPACHOS.findIndex((f) => f[1] === "Palmira" && f[0] === "2026-11-02");
    e.hojas.DESPACHOS.splice(i, 1);
    const p = e.revisar(c);
    assert.deepEqual(p.distribucion.filas.map((f) => f.estado).sort(), ["duplicada", "nueva"]);
  });
});

// ===================================================================== destinos nuevos
describe("Destinos nuevos", () => {
  it("agrega «otra» sin municipio ni código", () => {
    const e = nuevo();
    const u = e.ultimaFila("DESTINOS");
    const r = e.aplicar(e.base({ destinosNuevos: [{ destino: "Fundación Manos Unidas", tipo: "otra" }] }));
    assert.equal(r.cargado.destinosNuevos, 1);
    assert.deepEqual(e.hojas.DESTINOS[u].slice(0, 5), ["Fundación Manos Unidas", "otra", "", "", "carga /admin"]);
  });
  it("«municipio» se resuelve por nombre, con su código; entiende Cali, Buga y Calima", () => {
    const e = nuevo();
    const u = e.ultimaFila("DESTINOS");
    e.aplicar(e.base({ destinosNuevos: [
      { destino: "Cali – Barrio Nuevo", tipo: "Municipio", municipio: "Cali" },
      { destino: "Buga – Vereda X", tipo: "municipio", municipio: "buga" },
      { destino: "Calima – Vereda Y", tipo: "municipio", municipio: "Calima" },
      { destino: "El Águila – Centro", tipo: "municipio", municipio: "el aguila" },
    ] }));
    assert.deepEqual(e.hojas.DESTINOS.slice(u, u + 4).map((f) => f[3]), ["Santiago de Cali", "Guadalajara de Buga", "Calima - El Darién", "El Águila"]);
    assert.ok(e.hojas.DESTINOS.slice(u, u + 4).every((f) => /^76\d{3}$/.test(String(f[2]))));
  });
  it("«traslado» y «multiple» se aceptan sin municipio", () => {
    const e = nuevo();
    const r = e.aplicar(e.base({ destinosNuevos: [{ destino: "Punto de acopio X", tipo: "traslado" }, { destino: "Roldanillo – Ansermanuevo", tipo: "multiple" }] }));
    assert.equal(r.cargado.destinosNuevos, 2);
  });
  it("errores: sin nombre, tipo inventado, municipio faltante o inexistente, municipio en un tipo que no lo lleva", () => {
    const e = nuevo();
    const f = e.revisar(e.base({ destinosNuevos: [
      { tipo: "otra" }, { destino: "A", tipo: "raro" }, { destino: "B", tipo: "municipio" },
      { destino: "C", tipo: "municipio", municipio: "Macondo" }, { destino: "D", tipo: "otra", municipio: "Cali" },
    ] })).destinosNuevos.filas.map((x) => x.estadoFila);
    assert.deepEqual(f, ["error", "error", "error", "error", "error"]);
  });
  it("uno que ya existe igual se salta; con otra clasificación se rechaza (se corrige a mano)", () => {
    const e = nuevo();
    const p = e.revisar(e.base({ destinosNuevos: [
      { destino: "Palmira", tipo: "municipio", municipio: "Palmira" },
      { destino: "Palmira", tipo: "otra" },
      { destino: "Zarzal", tipo: "municipio", municipio: "Cali" },
    ] })).destinosNuevos.filas;
    assert.equal(p[0].estadoFila, "duplicada");
    assert.equal(p[1].estadoFila, "error");
    assert.match(p[1].errores[0], /corríjalo a mano/);
    assert.equal(p[2].estadoFila, "error");
  });
  it("uno casi igual a uno existente (guiones, tildes, «de») se rechaza: no es nuevo", () => {
    const e = nuevo();
    const f = e.revisar(e.base({ destinosNuevos: [{ destino: "Cali Chiminangos", tipo: "municipio", municipio: "Cali" }] })).destinosNuevos.filas[0];
    assert.equal(f.estadoFila, "error");
    assert.match(f.errores[0], /Se parece mucho a «Cali – Chiminangos»/);
  });
  it("repetido dentro del archivo: igual se salta, distinto se rechaza", () => {
    const e = nuevo();
    const f = e.revisar(e.base({ destinosNuevos: [
      { destino: "Lugar Nuevo", tipo: "otra" }, { destino: "lugar nuevo", tipo: "otra" }, { destino: "LUGAR NUEVO", tipo: "traslado" },
    ] })).destinosNuevos.filas.map((x) => x.estadoFila);
    assert.deepEqual(f, ["nueva", "duplicada", "error"]);
  });
  it("un envío del mismo archivo a ese destino ya sale clasificado (sin aviso)", () => {
    const e = nuevo();
    const con = e.revisar(e.base({ destinosNuevos: [{ destino: "Fundación Manos Unidas", tipo: "otra" }], distribucion: [e.fila({ destino: "Fundación Manos Unidas" })] }));
    assert.deepEqual(con.distribucion.filas[0].avisos, []);
    const sin = e.revisar(e.base({ distribucion: [e.fila({ destino: "Fundación Manos Unidas" })] }));
    assert.match(sin.distribucion.filas[0].avisos.join(" "), /no está en la lista/);
  });
  it("subirlos otra vez: «ya están»", () => {
    const e = nuevo();
    const c = e.base({ destinosNuevos: [{ destino: "Fundación Manos Unidas", tipo: "otra" }] });
    e.aplicar(c);
    assert.equal(e.revisar(c).destinosNuevos.resumen.duplicados, 1);
    assert.match(e.aplicar(c).fallo, /nada nuevo/);
  });
  it("si alguien escribe un destino a mano justo mientras se carga, no se pisa", () => {
    const e = nuevo();
    e.alVerificar((h) => { h.DESTINOS.push(["Otro escrito a mano", "otra", "", "", ""]); });
    const antes = e.hojas.DESTINOS.length;
    const r = e.aplicar(e.base({ destinosNuevos: [{ destino: "Fundación Manos Unidas", tipo: "otra" }] }));
    assert.match(r.fallo, /cambió mientras/);
    assert.equal(e.hojas.DESTINOS.length, antes + 1);
  });
  it("la hoja tiene un tope de filas (600): más allá, se detiene con un mensaje claro", () => {
    const e = nuevo({ preparar: (h) => { for (let i = 0; i < 595; i++) h.DESTINOS.push(["Relleno " + i, "otra", "", "", ""]); } });
    const r = e.aplicar(e.base({ destinosNuevos: Array.from({ length: 5 }, (_, i) => ({ destino: "Zona nueva " + i, tipo: "otra" })) }));
    assert.match(r.fallo, /límite de filas/);
  });
});

// ===================================================================== contratos
describe("Contratos", () => {
  it("agrega un contrato nuevo en la fila siguiente, con sus 7 campos", () => {
    const e = nuevo();
    const u = e.ultimaFila("CONTRATACION");
    const r = e.aplicar(e.base({ contratacion: [e.contrato()] }));
    assert.equal(r.cargado.contratosNuevos, 1);
    assert.equal(e.ultimaFila("CONTRATACION"), u + 1);
    assert.deepEqual(e.hojas.CONTRATACION[u].slice(0, 7), ["CTR0002", "Secretaría de Salud", "Compra de colchonetas para los albergues", 250000000, "Dotaciones SAS", "https://www.colombiacompra.gov.co/c2", "Vigente"]);
  });
  it("lo que no trae (dependencia, valor, contratista, enlace) queda vacío, no inventado", () => {
    const e = nuevo();
    const u = e.ultimaFila("CONTRATACION");
    e.aplicar(e.base({ contratacion: [{ id: "CTR0009", objeto: "Solo el objeto" }] }));
    assert.deepEqual(e.hojas.CONTRATACION[u].slice(0, 7), ["CTR0009", "", "Solo el objeto", "", "", "", "Vigente"]);
  });
  it("validaciones: código, objeto, valor, enlace y estado", () => {
    const e = nuevo();
    const estados = e.revisar(e.base({ contratacion: [
      e.contrato({ id: "CTR 9 !" }), e.contrato({ id: "" }), e.contrato({ id: "CTR0003", objeto: "" }),
      e.contrato({ id: "CTR0004", valorInicial: -1 }), e.contrato({ id: "CTR0005", valorInicial: "$1.300.000" }),
      e.contrato({ id: "CTR0006", enlaceSecop: "javascript:alert(1)" }), e.contrato({ id: "CTR0007", enlaceSecop: "ftp://x.co" }),
      e.contrato({ id: "CTR0008", estado: "Anulado" }), e.contrato({ id: "A".repeat(61) }),
      e.contrato({ id: "CTR0010", objeto: "o".repeat(2001) }), e.contrato({ id: "CTR0011", contratista: "c".repeat(301) }),
    ] })).contratacion.filas.map((f) => f.estadoFila);
    assert.ok(estados.every((s) => s === "error"), estados.join(","));
  });
  it("el valor puede venir como texto numérico sin símbolos, y el estado sin importar mayúsculas", () => {
    const e = nuevo();
    const f = e.revisar(e.base({ contratacion: [e.contrato({ id: "CTR0020", valorInicial: "1500000", estado: "  finalizado " })] })).contratacion.filas[0];
    assert.equal(f.estadoFila, "nueva");
    assert.equal(f.estado, "Finalizado");
    assert.equal(f.valorInicial, 1500000);
  });
  it("el mismo código dos veces en el archivo: la segunda es error", () => {
    const e = nuevo();
    const f = e.revisar(e.base({ contratacion: [e.contrato(), e.contrato({ id: "ctr0002" })] })).contratacion.filas.map((x) => x.estadoFila);
    assert.deepEqual(f, ["nueva", "error"]);
  });
  it("uno que ya está igual sale «ya está»; subirlo otra vez no agrega nada", () => {
    const e = nuevo();
    const c = e.base({ contratacion: [e.contrato()] });
    e.aplicar(c);
    assert.equal(e.revisar(c).contratacion.resumen.duplicadas, 1);
    assert.match(e.aplicar(c).fallo, /nada nuevo/);
  });
  it("el código se reconoce sin importar mayúsculas", () => {
    const e = nuevo();
    const f = e.revisar(e.base({ contratacion: [{ id: "ctr0001", dependencia: "Distinta", objeto: "Distinto" }] })).contratacion.filas[0];
    assert.equal(f.estadoFila, "conflicto");
  });
  it("marcar un contrato como Finalizado = conflicto; muestra qué cambia", () => {
    const e = nuevo();
    const f = e.revisar(e.base({ contratacion: [{ ...e.contrato({ id: "CTR0001" }), dependencia: "Departamento Administrativo de Desarrollo Institucional", objeto: "Prestación de servicios logísticos de los centros de acopio", valorInicial: 1300000000, contratista: "Prensa y Entretenimiento SAS", enlaceSecop: "https://community.secop.gov.co/c1", estado: "Finalizado" }] })).contratacion.filas[0];
    assert.equal(f.estadoFila, "conflicto");
    const dif = f.conflicto.campos.filter((c) => c.libro !== c.archivo).map((c) => c.campo);
    assert.deepEqual(dif, ["Estado"]);
  });
  const finalizar = (e) => e.base({ contratacion: [{ id: "CTR0001", dependencia: "Departamento Administrativo de Desarrollo Institucional", objeto: "Prestación de servicios logísticos de los centros de acopio", valorInicial: 1300000000, contratista: "Prensa y Entretenimiento SAS", enlaceSecop: "https://community.secop.gov.co/c1", estado: "Finalizado" }] });
  it("conflicto: sin decidir se rechaza, «agregar» no existe para contratos", () => {
    const e = nuevo();
    assert.match(e.aplicar(finalizar(e), {}).fallo, /Falta decidir/);
    assert.match(e.aplicar(finalizar(e), { c1: "agregar" }).fallo, /no se agrega dos veces/);
    assert.match(e.aplicar(finalizar(e), { c1: "x" }).fallo, /Falta decidir/);
  });
  it("conflicto: «conservar» no cambia nada; «reemplazar» cambia el estado y guarda el anterior", () => {
    const e = nuevo();
    assert.match(e.aplicar(finalizar(e), { c1: "conservar" }).fallo, /nada nuevo/);
    assert.equal(e.hojas.CONTRATACION[1][6], "Vigente");
    const r = e.aplicar(finalizar(e), { c1: "reemplazar" });
    assert.equal(r.cargado.contratosCambiados, 1);
    assert.equal(e.hojas.CONTRATACION[1][6], "Finalizado");
    assert.equal(e.registros.REEMPLAZOS_CONTRATOS[0][8], "Vigente");
    assert.equal(e.registros.REEMPLAZOS_CONTRATOS[0][2], "CTR0001");
  });
  it("el decisión de contratos y la de despachos no se mezclan (c1 frente a 1)", () => {
    const e = nuevo();
    const carga = { ...finalizar(e), distribucion: [e.fila({ fecha: "2026-08-25", cantidad: null, kilosUnitario: null, kilosTotal: 999 })] };
    assert.match(e.aplicar(carga, { 1: "conservar" }).fallo, /contrato CTR0001/);
    const r = e.aplicar(carga, { 1: "conservar", c1: "reemplazar" });
    assert.equal(r.cargado.contratosCambiados, 1);
    assert.equal(r.cargado.conservadas, 1);
  });
  it("si alguien cambia el contrato mientras se carga, no se pisa", () => {
    const e = nuevo();
    e.alVerificar((h) => { h.CONTRATACION[1][2] = "Otro objeto escrito por otra persona"; });
    assert.match(e.aplicar(finalizar(e), { c1: "reemplazar" }).fallo, /cambió mientras/);
    assert.equal(e.hojas.CONTRATACION[1][6], "Vigente");
  });
  it("si alguien escribe un contrato a mano en la fila donde iba el nuevo, se detiene", () => {
    const e = nuevo();
    e.alVerificar((h) => { h.CONTRATACION.push(["CTR0077", "x", "y"]); });
    assert.match(e.aplicar(e.base({ contratacion: [e.contrato()] })).fallo, /cambió mientras/);
  });
  it("un libro sin la columna «estado» se detiene con un mensaje claro", () => {
    const e = nuevo({ preparar: (h) => { h.CONTRATACION[0] = h.CONTRATACION[0].slice(0, 6); } });
    assert.match(e.aplicar(e.base({ contratacion: [e.contrato()] })).fallo, /columna «estado»/);
    assert.doesNotThrow(() => e.revisar(e.base({ informacionGeneral: { toneladasRecibidas: 1 } })), "sin contratos en el archivo, no estorba");
  });
  it("sin la hoja CONTRATACION, un archivo con contratos se detiene con un mensaje claro", () => {
    const e = nuevo({ preparar: (h) => { delete h.CONTRATACION; } });
    assert.match(e.aplicar(e.base({ contratacion: [e.contrato()] })).fallo, /hoja CONTRATACION/);
  });
});

// ===================================================================== lo que ve el público
describe("Contratos en la página pública (Contratacion.js)", () => {
  const fila = (id, estado) => [id, "Dep", "Objeto " + id, 1000, "Contratista", "https://x.co/" + id, estado];
  it("Vigente y vacío se muestran; Finalizado se muestra con su estado; Inhabilitado y lo inválido no", () => {
    const e = nuevo({ preparar: (h) => { h.CONTRATACION.push(fila("A1", "Vigente"), fila("A2", "Finalizado"), fila("A3", "Inhabilitado"), fila("A4", ""), fila("A5", "Inventado"), fila("A6", " finalizado ")); } });
    const ids = e.contratosPublicos().contratos.map((c) => `${c.id}:${c.estado}`);
    assert.deepEqual(ids, ["CTR0001:Vigente", "A1:Vigente", "A2:Finalizado", "A4:Vigente", "A6:Finalizado"]);
  });
  it("el total solo suma lo que se muestra", () => {
    const e = nuevo({ preparar: (h) => { h.CONTRATACION.push(fila("A1", "Vigente"), fila("A3", "Inhabilitado")); } });
    const p = e.contratosPublicos();
    assert.equal(p.totalContratos, 2);
    assert.equal(p.valorTotalInformado, 1300000000 + 1000);
  });
  it("un contrato inhabilitado desde /admin deja de verse", () => {
    const e = nuevo();
    e.aplicar(e.base({ contratacion: [{ id: "CTR0001", dependencia: "Departamento Administrativo de Desarrollo Institucional", objeto: "Prestación de servicios logísticos de los centros de acopio", valorInicial: 1300000000, contratista: "Prensa y Entretenimiento SAS", enlaceSecop: "https://community.secop.gov.co/c1", estado: "Inhabilitado" }] }), { c1: "reemplazar" });
    assert.equal(e.contratosPublicos().contratos.length, 0);
    assert.equal(e.hojas.CONTRATACION[1][0], "CTR0001", "sigue en la hoja");
  });
});

// ===================================================================== texto
describe("Texto: ñ, tildes y lo que no debe pasar", () => {
  it("ñ, tildes, signos de apertura, comillas angulares y guion largo se guardan tal cual", () => {
    const e = nuevo();
    const u = e.ultimaFila("DESPACHOS");
    e.aplicar(e.base({ distribucion: [e.fila({ producto: "Pañales para niños — talla 3", observaciones: "¿Cómo? ¡Sí! «Ñandú» áéíóúü ÁÉÍÓÚÜ" })] }));
    assert.equal(e.hojas.DESPACHOS[u][3], "Pañales para niños — talla 3");
    assert.equal(e.hojas.DESPACHOS[u][9], "¿Cómo? ¡Sí! «Ñandú» áéíóúü ÁÉÍÓÚÜ");
  });
  it("saltos de línea, tabuladores, caracteres de control y espacios sobrantes se limpian", () => {
    const e = nuevo();
    const u = e.ultimaFila("DESPACHOS");
    e.aplicar(e.base({ distribucion: [e.fila({ producto: "  Arroz\u0000\u0007 \t integral\r\nblanco  " })] }));
    assert.equal(e.hojas.DESPACHOS[u][3], "Arroz integral blanco");
  });
  it("un texto que empieza por «=», «+», «-» o «@» se guarda como texto", () => {
    const e = nuevo();
    const u = e.ultimaFila("DESPACHOS");
    e.aplicar(e.base({ distribucion: [e.fila({ producto: "=1+1" }), e.fila({ producto: "@SUM(A1)", kilosTotal: 9 }), e.fila({ producto: "-2+3", kilosTotal: 8 })] }));
    assert.deepEqual([e.hojas.DESPACHOS[u][3], e.hojas.DESPACHOS[u + 1][3], e.hojas.DESPACHOS[u + 2][3]], ["=1+1", "@SUM(A1)", "-2+3"]);
  });
  it("lo que se escribe nunca incluye HTML ejecutable: se guarda como texto plano", () => {
    const e = nuevo();
    const u = e.ultimaFila("DESPACHOS");
    e.aplicar(e.base({ distribucion: [e.fila({ producto: "<script>alert(1)</script>" })] }));
    assert.equal(e.hojas.DESPACHOS[u][3], "<script>alert(1)</script>");
  });
});

// ===================================================================== aplicar en general
describe("Aplicar: lo que pasa alrededor de la escritura", () => {
  it("una carga sin nada nuevo no escribe ni programa nada", () => {
    const e = nuevo();
    const antes = e.llamadas.batchUpdate;
    assert.match(e.aplicar(e.base({ distribucion: [e.fila({ fecha: "2026-08-25", producto: "Mercado", cantidad: 50, kilosUnitario: 14, kilosTotal: 700 })] })).fallo, /nada nuevo/);
    assert.equal(e.llamadas.batchUpdate, antes);
    assert.equal(e.triggers.length, 0);
  });
  it("si hay otra carga en curso, avisa con claridad", () => {
    const e = nuevo({ lockOcupado: true });
    assert.match(e.aplicar(e.base({ informacionGeneral: { toneladasRecibidas: 1 } })).fallo, /otra carga en curso/);
  });
  it("tras escribir, programa UNA publicación y marca cambios pendientes", () => {
    const e = nuevo();
    e.aplicar(e.base({ informacionGeneral: { toneladasRecibidas: 1 } }));
    e.aplicar(e.base({ informacionGeneral: { toneladasRecibidas: 2 } }));
    assert.equal(e.triggers.filter((t) => t.f === "publicarTrasCarga").length, 1, "nunca se acumulan disparadores");
    assert.ok(Number(e.props.CACHE_PENDIENTE) > 0);
  });
  it("deja un registro de cada carga con sus conteos", () => {
    const e = nuevo();
    e.aplicar(e.base({ distribucion: [e.fila({})], contratacion: [e.contrato()], destinosNuevos: [{ destino: "Lugar X", tipo: "otra" }], informacionGeneral: { toneladasRecibidas: 5 } }));
    const r = e.registros.CARGAS[0];
    assert.equal(r[1], 1, "filas nuevas");
    assert.equal(r[6], 1, "totales");
    assert.equal(r[10], 1, "contratos nuevos");
    assert.equal(r[12], 1, "destinos nuevos");
  });
  it("una carga con todo junto escribe cada cosa en su hoja", () => {
    const e = nuevo();
    const r = e.aplicar(e.base({
      informacionGeneral: { toneladasRecibidas: 900.5, toneladasInventario: 55 },
      queHaceFalta: [{ categoria: "Alimentos", elemento: "Arroz", estado: "Escaso" }],
      destinosNuevos: [{ destino: "Fundación Manos Unidas", tipo: "otra" }],
      contratacion: [e.contrato()],
      distribucion: [e.fila({ destino: "Fundación Manos Unidas" })],
    }));
    assert.equal(r.ok, true);
    assert.deepEqual(r.cargado, { ...r.cargado, nuevas: 1, totales: 2, faltantes: 1, contratosNuevos: 1, destinosNuevos: 1 });
    assert.equal(e.hojas.TOTALES[4][0], 900.5);
  });
  it("si falla a la mitad, se puede volver a subir el mismo archivo y se termina sin duplicar", () => {
    const e = nuevo();
    const c = e.base({ distribucion: [e.fila({})], queHaceFalta: [{ categoria: "Alimentos", elemento: "Arroz", estado: "Escaso" }], informacionGeneral: { toneladasRecibidas: 7 } });
    e.fallarEn("update", 1); // falla al escribir «qué hace falta», después de escribir los despachos
    const antes = e.filasConFecha();
    assert.match(e.aplicar(c).fallo, /ERROR NO CONTROLADO/);
    assert.equal(e.filasConFecha(), antes + 1, "los despachos ya se habían escrito");
    e.sinFallas();
    const r = e.aplicar(c);
    assert.equal(r.ok, true);
    assert.equal(e.filasConFecha(), antes + 1, "no se duplican");
    assert.equal(e.hojas.TOTALES[4][0], 7);
    assert.equal(e.hojas.QUE_HACE_FALTA[4][1], "Arroz");
  });
  it("la revisión NUNCA escribe", () => {
    const e = nuevo();
    const antes = JSON.stringify(e.hojas);
    e.revisar(e.base({
      informacionGeneral: { toneladasRecibidas: 1 }, queHaceFalta: [{ categoria: "Alimentos", elemento: "Arroz", estado: "Escaso" }],
      destinosNuevos: [{ destino: "X", tipo: "otra" }], contratacion: [e.contrato()], distribucion: [e.fila({})],
    }));
    assert.equal(JSON.stringify(e.hojas), antes);
    assert.equal(e.llamadas.batchUpdate + e.llamadas.update + e.llamadas.clear, 0);
  });
  it("puedeCargar es falso si todo lo del archivo tiene problemas", () => {
    const e = nuevo();
    const p = e.revisar(e.base({ distribucion: [e.fila({ familia: "Inventada" })], contratacion: [{ id: "" }], destinosNuevos: [{ tipo: "raro" }] }));
    assert.equal(p.puedeCargar, false);
  });
});
