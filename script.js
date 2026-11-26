const $ = s => document.querySelector(s);
const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const PASO = 360 / ABC.length;
const NOMBRES = { cifrar: "Cifrado", descifrar: "Descifrado", fuerza: "Fuerza bruta" };

let modo = "cifrar";
let paraCopiar = "";
let paraDescargar = "";
let historial = [];
try { historial = JSON.parse(localStorage.getItem("cesar-historial") || "[]"); } catch (e) {}

/* ---------- Algoritmo ---------- */
// Desplaza cada letra k posiciones (k negativo = descifrar). Respeta mayúsculas y minúsculas.
function cesar(texto, k) {
  return texto.replace(/[a-z]/gi, c => {
    const base = c < "a" ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + (k % 26) + 26) % 26) + base);
  });
}

// Prueba los 25 desplazamientos posibles, igual que el ejemplo en Python.
function fuerzaBruta(texto) {
  const lista = [];
  for (let k = 1; k < 26; k++) lista.push({ k, texto: cesar(texto, -k) });
  return lista;
}

/* ---------- Ruleta ---------- */
function dibujarRueda() {
  let fuera = "", dentro = "";
  for (let i = 0; i < 26; i++) {
    const a = i * PASO, r = (a * Math.PI) / 180;
    const pos = R => {
      const x = (150 + R * Math.sin(r)).toFixed(1), y = (150 - R * Math.cos(r)).toFixed(1);
      return `x="${x}" y="${y}" transform="rotate(${a.toFixed(2)} ${x} ${y})"`;
    };
    fuera += `<text ${pos(130)}>${ABC[i]}</text>`;
    dentro += `<text ${pos(98)}>${ABC[i]}</text>`;
  }
  $("#rueda").innerHTML =
    `<circle cx="150" cy="150" r="144" fill="none"/>` +
    `<circle cx="150" cy="150" r="114" fill="none"/>` +
    `<circle cx="150" cy="150" r="80" fill="none"/>` +
    `<line x1="150" y1="2" x2="150" y2="22" stroke-width="3"/>` +
    `<g>${fuera}</g><g id="giro" class="interior">${dentro}</g>`;
}

function actualizarRueda() {
  const k = Number($("#desp").value);
  const valido = Number.isInteger(k) && k >= 1 && k <= 25;
  $("#giro").style.transform = `rotate(${-(valido ? k : 0) * PASO}deg)`;
  $("#leyenda").textContent = valido
    ? `Desplazamiento ${k}:  A → ${ABC[k % 26]}`
    : modo === "fuerza" ? "Se probarán los 25 desplazamientos" : "Elige un desplazamiento";
}

/* ---------- Utilidades ---------- */
function avisar(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("ver");
  setTimeout(() => t.classList.remove("ver"), 1600);
}

async function copiar(texto) {
  try { await navigator.clipboard.writeText(texto); avisar("Copiado al portapapeles"); }
  catch (e) { avisar("No se pudo copiar"); }
}

function descargar(texto, nombre) {
  const url = URL.createObjectURL(new Blob([texto], { type: "text/plain;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: nombre });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function el(tag, clase, texto) {
  const e = document.createElement(tag);
  if (clase) e.className = clase;
  if (texto !== undefined) e.textContent = texto;
  return e;
}

function boton(texto, clase, fn) {
  const b = el("button", "btn " + clase, texto);
  b.type = "button";
  b.addEventListener("click", fn);
  return b;
}

function recortar(s, n = 40) { return s.length > n ? s.slice(0, n) + "…" : s; }

/* ---------- Operación principal ---------- */
function ejecutar() {
  const texto = $("#texto").value;
  const k = Number($("#desp").value);
  const error = $("#error");
  error.textContent = "";

  if (!texto.trim()) { error.textContent = "Escribe o carga un mensaje antes de continuar."; return; }
  if (modo !== "fuerza" && (!Number.isInteger(k) || k < 1 || k > 25)) {
    error.textContent = "El desplazamiento debe ser un número entero entre 1 y 25.";
    return;
  }

  const cont = $("#resultado");
  cont.replaceChildren();

  if (modo === "fuerza") {
    const lista = fuerzaBruta(texto);
    const ul = el("ul", "fuerza");
    lista.forEach(({ k, texto: t }) => {
      const li = el("li");
      li.append(el("span", "k", String(k)), el("span", "t", t), boton("Copiar", "sec mini", () => copiar(t)));
      ul.append(li);
    });
    cont.append(ul);
    paraDescargar = `Texto cifrado:\n${texto}\n\nFUERZA BRUTA (25 desplazamientos)\n` +
      lista.map(r => `Desplazamiento ${String(r.k).padStart(2)}: ${r.texto}`).join("\n");
    paraCopiar = paraDescargar;
    guardarHistorial({ modo, k: null, entrada: texto, salida: "25 posibilidades" });
  } else {
    const salida = cesar(texto, modo === "cifrar" ? k : -k);
    const o = el("div", "bloque");
    o.append(el("b", "", "Mensaje original"), el("pre", "salida", texto));
    const r = el("div", "bloque");
    r.append(el("b", "", modo === "cifrar" ? "Mensaje cifrado" : "Mensaje descifrado"), el("pre", "salida res", salida));
    cont.append(o, r);
    paraCopiar = salida;
    paraDescargar = `Operación: ${NOMBRES[modo]} (desplazamiento ${k})\n\nOriginal:\n${texto}\n\nResultado:\n${salida}\n`;
    guardarHistorial({ modo, k, entrada: texto, salida });
  }

  const acciones = el("div", "fila");
  acciones.append(
    boton("Copiar resultado", "sec", () => copiar(paraCopiar)),
    boton("Descargar .txt", "sec", () => descargar(paraDescargar, "cesar-" + modo + ".txt"))
  );
  cont.append(acciones);
  $("#resultado-box").hidden = false;
  $("#resultado-box").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/* ---------- Historial (tabla) ---------- */
function tabla(filas) {
  const cols = ["Operación", "Mensaje", "Desplazamiento", "Resultado"];
  const t = el("table", "tabla");
  const thead = el("thead"), hr = el("tr");
  cols.forEach(c => hr.append(el("th", "", c)));
  thead.append(hr);
  const tbody = el("tbody");
  filas.forEach(f => {
    const tr = el("tr", "clic");
    tr.tabIndex = 0;
    tr.title = "Volver a cargar esta operación";
    tr.addEventListener("click", f.alHacerClic);
    tr.addEventListener("keydown", e => { if (e.key === "Enter") f.alHacerClic(); });
    [f.op, f.msg, f.k, f.res].forEach((v, i) => {
      const td = el("td", "", String(v));
      td.dataset.label = cols[i];
      tr.append(td);
    });
    tbody.append(tr);
  });
  t.append(thead, tbody);
  const wrap = el("div", "tabla-wrap");
  wrap.append(t);
  return wrap;
}

function guardarHistorial(item) {
  historial.unshift(item);
  historial = historial.slice(0, 30);
  try { localStorage.setItem("cesar-historial", JSON.stringify(historial)); } catch (e) {}
  pintarHistorial();
}

function restaurar(h) {
  cambiarModo(h.modo);
  $("#texto").value = h.entrada;
  if (h.k) $("#desp").value = h.k;
  actualizarRueda();
  cerrarPaneles();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function pintarHistorial() {
  const cont = $("#historial");
  cont.replaceChildren();
  if (!historial.length) {
    cont.append(el("p", "vacio", "Aún no hay operaciones. Tus resultados aparecerán aquí."));
    return;
  }
  cont.append(tabla(historial.map(h => ({
    op: NOMBRES[h.modo],
    msg: recortar(h.entrada, 60),
    k: h.k || "1–25",
    res: recortar(h.salida, 60),
    alHacerClic: () => restaurar(h)
  }))));
}

/* ---------- Interfaz ---------- */
function cambiarModo(m) {
  modo = m;
  document.querySelectorAll(".modo").forEach(b => {
    const activo = b.dataset.modo === m;
    b.classList.toggle("activo", activo);
    b.setAttribute("aria-selected", activo);
  });
  ["#lblDesp", ".fila-accion"].forEach(s => { $(s).hidden = m === "fuerza"; });
  $("#ejecutar").textContent = m === "cifrar" ? "Cifrar" : m === "descifrar" ? "Descifrar" : "Probar los 25 desplazamientos";
  $("#error").textContent = "";
  actualizarRueda();
}

document.querySelectorAll(".modo").forEach(b => b.addEventListener("click", () => cambiarModo(b.dataset.modo)));
$("#ejecutar").addEventListener("click", ejecutar);
$("#desp").addEventListener("input", actualizarRueda);
$("#azar").addEventListener("click", () => { $("#desp").value = 1 + Math.floor(Math.random() * 25); actualizarRueda(); });
$("#limpiar").addEventListener("click", () => {
  $("#texto").value = "";
  $("#error").textContent = "";
  $("#resultado-box").hidden = true;
  $("#texto").focus();
});
$("#archivo").addEventListener("change", e => {
  const f = e.target.files[0];
  if (!f) return;
  if (f.size > 1024 * 1024) { $("#error").textContent = "El archivo es muy grande (máximo 1 MB)."; return; }
  const lector = new FileReader();
  lector.onload = () => { $("#texto").value = lector.result; $("#error").textContent = ""; };
  lector.readAsText(f);
  e.target.value = "";
});
$("#borrarHist").addEventListener("click", () => {
  historial = [];
  try { localStorage.removeItem("cesar-historial"); } catch (e) {}
  pintarHistorial();
});
$("#texto").addEventListener("keydown", e => { if (e.ctrlKey && e.key === "Enter") ejecutar(); });

/* ---------- Menú: César, Ruleta, Historial, Tema ---------- */
function cerrarMenu() {
  $("#menu").classList.remove("abierto");
  $("#burger").setAttribute("aria-expanded", "false");
  $("#burger").setAttribute("aria-label", "Abrir menú");
}

function sincronizarNav() {
  const rueda = !$("#panelRueda").hidden, hist = !$("#panelHist").hidden;
  $("#navRueda").setAttribute("aria-pressed", rueda);
  $("#navHist").setAttribute("aria-pressed", hist);
  $("#fondo").hidden = !(rueda || hist);
  if (rueda || hist) $("#navCesar").removeAttribute("aria-current");
  else $("#navCesar").setAttribute("aria-current", "page");
}

function cerrarPaneles() {
  $("#panelRueda").hidden = true;
  $("#panelHist").hidden = true;
  sincronizarNav();
}

// Presionar abre el panel sobre la página; presionar de nuevo lo oculta.
function alternarPanel(panel) {
  const abrir = panel.hidden;
  $("#panelRueda").hidden = true;
  $("#panelHist").hidden = true;
  panel.hidden = !abrir;
  sincronizarNav();
  cerrarMenu();
}

// Presionar el fondo desenfocado cierra el panel y vuelve al cifrado César.
$("#fondo").addEventListener("click", cerrarPaneles);
$("#navRueda").addEventListener("click", () => alternarPanel($("#panelRueda")));
$("#navHist").addEventListener("click", () => alternarPanel($("#panelHist")));
$("#navCesar").addEventListener("click", () => {
  cerrarPaneles();
  cerrarMenu();
  window.scrollTo({ top: 0, behavior: "smooth" });
});
$("#tema").addEventListener("click", () => {
  const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem("cesar-tema", t); } catch (e) {}
  cerrarMenu();
});
$("#burger").addEventListener("click", () => {
  const abierto = $("#menu").classList.toggle("abierto");
  $("#burger").setAttribute("aria-expanded", abierto);
  $("#burger").setAttribute("aria-label", abierto ? "Cerrar menú" : "Abrir menú");
});
document.addEventListener("keydown", e => { if (e.key === "Escape") { cerrarMenu(); cerrarPaneles(); } });

dibujarRueda();
cambiarModo("cifrar");
pintarHistorial();
sincronizarNav();