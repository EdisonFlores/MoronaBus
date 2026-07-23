// js/app/i18n.js

const LS_LANG = "tm_lang";

const I18N = {
  es: {
    "app.name": "MoronaBus",
    "weather.title": "Pronóstico del tiempo",
    "btn.close": "Cerrar"
  },
  en: {
    "app.name": "MoronaBus",
    "weather.title": "Weather forecast",
    "btn.close": "Close"
  }
};

const PHRASES = [
  ["MoronaBus | Rutas de bus y guía turística de Morona Santiago", "MoronaBus | Bus routes and tourism guide for Morona Santiago"],
  ["Inicio MoronaBus", "MoronaBus home"],
  ["Mapa interactivo de lugares y rutas", "Interactive map of places and routes"],
  ["Acciones y enlaces del footer", "Footer actions and links"],
  ["Panel de búsqueda", "Search panel"],
  ["Seleccione provincia", "Select province"],
  ["Seleccione cantón", "Select canton"],
  ["Seleccione parroquia", "Select parish"],
  ["Seleccione categoría", "Select category"],
  ["Seleccione lugar", "Select place"],
  ["Seleccione evento", "Select event"],
  ["Seleccione línea", "Select route"],
  ["Seleccione parada", "Select stop"],
  ["Lugar más cercano", "Nearest place"],
  ["Evento más cercano", "Nearest event"],
  ["Estamos ubicándote", "Finding your location"],
  ["Esto puede tardar unos segundos.", "This may take a few seconds."],
  ["Sin cobertura por ahora", "No coverage yet"],
  ["De momento no hay datos registrados en la zona, pronto habrá cobertura.", "There is no registered data in this area yet. Coverage will be added soon."],
  ["Mientras tanto, puedes explorar Morona:", "Meanwhile, you can explore Morona:"],
  ["Explorar Morona", "Explore Morona"],
  ["Usted se encuentra en:", "You are located in:"],
  ["Provincia:", "Province:"],
  ["Cantón:", "Canton:"],
  ["Parroquia:", "Parish:"],
  ["Entorno detectado:", "Detected area:"],
  ["Cobertura compartida Sevilla + Morona activa", "Shared Sevilla + Morona coverage active"],
  ["Transporte Público", "Public transport"],
  ["Transporte Privado y Automotriz", "Private transport and automotive"],
  ["Alimentación", "Food"],
  ["Turismo y Naturaleza", "Tourism and nature"],
  ["Ocio", "Leisure"],
  ["Bienestar y Belleza", "Wellness and beauty"],
  ["Salud", "Health"],
  ["Servicios", "Services"],
  ["Comercio", "Commerce"],
  ["Instituciones Públicas", "Public institutions"],
  ["Instituciones Financieras", "Financial institutions"],
  ["Educación", "Education"],
  ["Religión", "Religion"],
  ["Territorio", "Territory"],
  ["Barrios", "Neighborhoods"],
  ["Barrio", "Neighborhood"],
  ["Parroquias", "Parishes"],
  ["Cargando barrios", "Loading neighborhoods"],
  ["Cargando parroquias", "Loading parishes"],
  ["Consultando capa territorial del Geoportal Morona.", "Consulting territorial layer from Geoportal Morona."],
  ["Seleccione barrio", "Select neighborhood"],
  ["Barrio más cercano", "Nearest neighborhood"],
  ["Parroquia más cercana", "Nearest parish"],
  ["Capa no disponible", "Layer unavailable"],
  ["Sin datos territoriales", "No territorial data"],
  ["Capa territorial del Geoportal Morona", "Territorial layer from Geoportal Morona"],
  ["Terminal Terrestre", "Bus terminal"],
  ["Líneas de transporte", "Transport routes"],
  ["Transporte interprovincial", "Interprovincial transport"],
  ["Taxis", "Taxis"],
  ["Ir a otra provincia (vía Terminal)", "Go to another province (via terminal)"],
  ["Ir a otro cantón (vía Terminal)", "Go to another canton (via terminal)"],
  ["Gasolineras", "Gas stations"],
  ["Mecánicas", "Mechanic shops"],
  ["Mecanicas", "Mechanic shops"],
  ["Autolujos", "Car accessories"],
  ["Concesionarias", "Dealerships"],
  ["Renta de Autos", "Car rental"],
  ["Parqueaderos", "Parking lots"],
  ["Restaurantes", "Restaurants"],
  ["Cafeterías", "Coffee shops"],
  ["Bares", "Bars"],
  ["Heladerías", "Ice cream shops"],
  ["Panaderías", "Bakeries"],
  ["Hospedaje", "Lodging"],
  ["Hosterías", "Inns"],
  ["Piscinas", "Pools"],
  ["Glamping", "Glamping"],
  ["Airbnb", "Airbnb"],
  ["Parques", "Parks"],
  ["Miradores", "Viewpoints"],
  ["Museos", "Museums"],
  ["Naturaleza", "Nature"],
  ["Eventos", "Events"],
  ["Discotecas", "Nightclubs"],
  ["Centros recreativos", "Recreation centers"],
  ["Canchas deportivas", "Sports fields"],
  ["Barberías", "Barbershops"],
  ["Peluquerías", "Hair salons"],
  ["Centros de belleza", "Beauty centers"],
  ["Belleza", "Beauty"],
  ["Spa", "Spa"],
  ["Gimnasios", "Gyms"],
  ["Hospitales", "Hospitals"],
  ["SubCentros", "Health subcenters"],
  ["Clínicas", "Clinics"],
  ["Farmacias", "Pharmacies"],
  ["Odontólogos", "Dentists"],
  ["Servicio técnico", "Technical service"],
  ["Lavanderías", "Laundries"],
  ["Tiendas de abarrotes", "Grocery stores"],
  ["Supermercados", "Supermarkets"],
  ["Mercados", "Markets"],
  ["Vestimenta", "Clothing"],
  ["Tecnología", "Technology"],
  ["Tecnología (ventas)", "Technology sales"],
  ["Ferreterías", "Hardware stores"],
  ["Policía", "Police"],
  ["Organismos de Socorro", "Emergency services"],
  ["Bancos", "Banks"],
  ["Cooperativas de Ahorro y Crédito", "Credit unions"],
  ["Cajeros Automáticos", "ATMs"],
  ["Guarderías", "Daycare centers"],
  ["Jardín de Infantes", "Kindergarten"],
  ["Escuelas", "Schools"],
  ["Colegios", "High schools"],
  ["Universidades", "Universities"],
  ["Iglesias", "Churches"],
  ["Contáctame", "Contact me"],
  ["Formularios", "Forms"],
  ["Registrar lugar", "Register place"],
  ["Reportar bugs o sugerencias", "Report bugs or suggestions"],
  ["Proyectos relacionados", "Related projects"],
  ["Información del proyecto", "Project information"],
  ["Plataforma turística y de servicios", "Tourism and services platform"],
  ["Descargar para android", "Download for Android"],
  ["Esta plataforma tiene como objetivo facilitar la consulta de", "This platform aims to make it easier to consult"],
  ["información turística y de servicios mediante un mapa interactivo.", "tourism and services information through an interactive map."],
  ["Parte de la información consultada pertenece al siguiente documento", "Part of the consulted information belongs to the following"],
  ["público:", "public document:"],
  ["Ver documento oficial", "View official document"],
  ["Esta es información pública.", "This is public information."],
  ["Próximamente se añadirá una guía de uso", "A user guide will be added soon"],
  ["de la plataforma.", "for the platform."],
  ["Se requiere internet", "Internet required"],
  ["MoronaBus necesita conexión para cargar el mapa, rutas, paradas, clima y datos actualizados.", "MoronaBus needs an internet connection to load the map, routes, stops, weather, and updated data."],
  ["Reintentar", "Retry"],
  ["Funcionamiento interrumpido", "Operation interrupted"],
  ["Lamentablemente ocurrió un problema con el servicio de datos externo. No es culpa de la app; intenta nuevamente en unos minutos.", "Unfortunately, there was a problem with the external data service. It is not the app's fault; please try again in a few minutes."],
  ["Cambiar idioma", "Change language"],
  ["Cambiar tema", "Change theme"],
  ["Clima", "Weather"],
  ["Aviso", "Notice"],
  ["Cerrar", "Close"],
  ["Ubicación no disponible", "Location unavailable"],
  ["Tu navegador no permite seguimiento de ubicación.", "Your browser does not allow location tracking."],
  ["No se pudo actualizar tu ubicación para seguir el trayecto.", "Your location could not be updated to track the trip."],
  ["Iniciar trayecto", "Start trip"],
  ["Detener trayecto", "Stop trip"],
  ["Trayecto activo: tu ubicación avanzará sobre la ruta calculada.", "Active trip: your location will move along the calculated route."],
  ["Seguimiento activo", "Tracking active"],
  ["Se mantiene la ruta de bus calculada arriba.", "The bus route calculated above is kept."],
  ["Distancia directa al destino:", "Direct distance to destination:"],
  ["Tiempo aprox. según modo:", "Approx. time by mode:"],
  ["Trayecto finalizado.", "Trip completed."],
  ["Llegaste al destino.", "You arrived at the destination."],
  ["Ruta", "Route"],
  ["Ruta (bus)", "Bus route"],
  ["Línea:", "Line:"],
  ["Sentido:", "Direction:"],
  ["Camina a subir:", "Walk to board:"],
  ["Tramo bus (aprox):", "Bus segment (approx.):"],
  ["Paradas aprox.:", "Approx. stops:"],
  ["Camina al destino:", "Walk to destination:"],
  ["Distancia:", "Distance:"],
  ["Tiempo estimado:", "Estimated time:"],
  ["Distancia restante aprox.:", "Approx. remaining distance:"],
  ["Tiempo restante aprox.:", "Approx. remaining time:"],
  ["Buscando ruta en bus (urbano/rural)", "Searching bus route (urban/rural)"],
  ["No se encontró una ruta en bus para este destino.", "No bus route was found for this destination."],
  ["Ocurrió un error al planificar la ruta en bus.", "An error occurred while planning the bus route."],
  ["No hay datos cercanos al origen seleccionado para planificar bus.", "There is no nearby data for the selected origin to plan a bus route."],
  ["No hay datos cercanos al destino seleccionado para planificar bus.", "There is no nearby data for the selected destination to plan a bus route."],
  ["Destino seleccionado", "Selected destination"],
  ["Origen seleccionado", "Selected origin"],
  ["Tu ubicación", "Your location"],
  ["Lugar", "Place"],
  ["Evento", "Event"],
  ["No hay eventos futuros registrados en esta zona.", "There are no upcoming events registered in this area."],
  ["Sin eventos futuros", "No upcoming events"],
  ["Revisa que tus documentos tengan", "Check that your documents have"],
  ["fecha_inicio/fecha_fin", "start_date/end_date"],
  ["en formato", "in format"],
  ["Tipo no soportado", "Unsupported type"],
  ["No hay líneas disponibles", "No routes available"],
  ["No hay líneas urbanas disponibles.", "No urban routes available."],
  ["No hay líneas rurales disponibles.", "No rural routes available."],
  ["No se encontró una línea adecuada", "No suitable route was found"],
  ["paradas cercanas", "nearby stops"],
  ["Ver próximas salidas de líneas", "View next route departures"],
  ["Próxima hora", "Next hour"],
  ["Salidas", "Departures"],
  ["Retornos", "Returns"],
  ["Ruta aproximada", "Approximate route"],
  ["OSRM no respondió correctamente o tardó demasiado.", "OSRM did not respond correctly or took too long."],
  ["Se muestra una línea recta referencial.", "A reference straight line is shown."],
  ["Se muestra una ruta aproximada con línea recta.", "An approximate straight-line route is shown."],
  ["Distancia referencial:", "Reference distance:"],
  ["Pronóstico del tiempo", "Weather forecast"],
  ["Cargando pronóstico", "Loading forecast"],
  ["Hoy", "Today"],
  ["Mañana", "Tomorrow"],
  ["Hora", "Time"],
  ["Temperatura", "Temperature"],
  ["Lluvia", "Rain"],
  ["Viento", "Wind"],
  ["Humedad", "Humidity"],
  ["Soleado", "Sunny"],
  ["Nublado", "Cloudy"],
  ["Lluvia ligera", "Light rain"],
  ["Lluvia moderada", "Moderate rain"],
  ["No detectada", "Not detected"],
  ["no detectada", "not detected"],
  ["no disponible", "not available"],
  ["urbano", "urban"],
  ["rural", "rural"]
];

const EXTRA_PHRASES = [
  ["Ruta en bus urbano", "Urban bus route"],
  ["Ruta en bus rural", "Rural bus route"],
  ["Route en bus urban", "Urban bus route"],
  ["Route en bus rural", "Rural bus route"],
  ["Caminar", "Walk"],
  ["Bicicleta", "Bike"],
  ["Bici", "Bike"],
  ["Moto", "Motorcycle"],
  ["Auto", "Car"],
  ["Camina a subir", "Walk to board"],
  ["Bajar en", "Get off at"],
  ["Punto más cercano de la vía", "Nearest road point"],
  ["Tramo bus", "Bus segment"],
  ["Paradas approx.", "Approx. stops"],
  ["Paradas aprox.", "Approx. stops"],
  ["Camina al destino", "Walk to destination"],
  ["Tramo final", "Final segment"],
  ["Próxima salida", "Next departure"],
  ["Sin más salidas hoy", "No more departures today"],
  ["Sale ahora", "Departing now"],
  ["Dirección", "Direction"],
  ["Pronóstico", "Forecast"],
  ["Por hora", "Hourly"],
  ["Por días", "Daily"],
  ["Ruta vía Terminal", "Route via terminal"],
  ["Ruta parcialmente aproximada por fallo de OSRM", "Partly approximate route due to OSRM failure"],
  ["Ruta aproximada por fallo de OSRM", "Approximate route due to OSRM failure"],
  ["Información de la línea", "Route information"],
  ["No opera en este momento.", "Not operating at this time."],
  ["Opera en este momento.", "Operating now."],
  ["Operativa ahora", "Operating now"],
  ["operativas ahora", "operating now"],
  ["No hay líneas urbanas marcadas como", "There are no urban routes marked as"],
  ["No hay líneas rurales marcadas como", "There are no rural routes marked as"],
  ["Sentido", "Direction"],
  ["CIRCULAR", "LOOP"],
  ["IDA", "OUTBOUND"],
  ["RETORNO", "RETURN"],
  ["Subir aquí", "Board here"],
  ["Bajar aquí", "Get off here"],
  ["Paradas (bus)", "Bus stops"],
  ["Accesos (bus)", "Bus access"],
  ["Lugares", "Places"],
  ["Interprov", "Interprovincial"],
  ["Transporte no disponible", "Transport unavailable"],
  ["En esta zona no hay datos registrados para transporte en bus.", "There is no registered bus transport data in this area."],
  ["De momento no hay datos registrados en la zona para planificar", "There is no registered data in this area yet to plan"],
  ["Pronto habrá cobertura.", "Coverage will be available soon."],
  ["Pronto habrá cobertura. Puedes probar otra categoría.", "Coverage will be available soon. You can try another category."],
  ["Indicaciones desde aquí", "Directions from here"],
  ["Indicaciones hasta aquí", "Directions to here"],
  ["Quitar indicaciones", "Clear directions"],
  ["Limpiar mapa", "Clear map"],
  ["Centrar mapa aquí", "Center map here"],
  ["eventos futuros", "upcoming events"],
  ["Ver próximas salidas", "View next departures"],
  ["próximas salidas", "next departures"],
  ["Horario", "Schedule"],
  ["Teléfono", "Phone"],
  ["No disponible", "Not available"],
  ["No especificado", "Not specified"],
  ["Sin ubicación", "No location"],
  ["La provincia seleccionada no tiene ubicación válida.", "The selected province does not have a valid location."],
  ["El cantón seleccionado no tiene ubicación válida.", "The selected canton does not have a valid location."],
  ["Seleccione provincia destino", "Select destination province"],
  ["Seleccione cantón destino", "Select destination canton"],
  ["No hay restaurantes con", "There are no restaurants with"],
  ["registrados en esta zona.", "registered in this area."],
  ["No hay datos registrados para esta categoría en tu ubicación actual.", "There is no registered data for this category at your current location."],
  ["Tramo aproximado", "Approximate segment"],
  ["OSRM falló en el tramo hacia el terminal.", "OSRM failed on the segment to the terminal."],
  ["OSRM falló en el tramo desde el terminal hacia el destino.", "OSRM failed on the segment from the terminal to the destination."],
  ["No hay datos horarios disponibles para hoy.", "No hourly data is available for today."],
  ["No hay datos diarios disponibles.", "No daily data is available."],
  ["No se pudo cargar el pronóstico.", "The forecast could not be loaded."],
  ["Prob. lluvia", "Rain chance"],
  ["Asistente de voz", "Voice assistant"],
  ["Activar lectura de voz", "Enable voice reading"],
  ["Desactivar lectura de voz", "Disable voice reading"],
  ["Lectura de voz activada", "Voice reading enabled"],
  ["Tutorial", "Tutorial"],
  ["Abrir tutorial", "Open tutorial"],
  ["Cerrar tutorial", "Close tutorial"],
  ["Anterior", "Previous"],
  ["Siguiente", "Next"],
  ["Finalizar", "Finish"],
  ["Paso", "Step"],
  ["Bienvenido a MoronaBus", "Welcome to MoronaBus"],
  ["Detección de ubicación", "Location detection"],
  ["Categorías", "Categories"],
  ["Resultados y filtros", "Results and filters"],
  ["Mapa interactivo", "Interactive map"],
  ["Indicaciones", "Directions"],
  ["Iniciar trayecto", "Start trip"],
  ["Footer y enlaces", "Footer and links"],
  ["Botón", "Button"],
  ["Enlace", "Link"],
  ["Selector", "Selector"],
  ["Campo", "Field"],
  ["Opción", "Option"],
  ["Título", "Heading"],
  ["Control del mapa", "Map control"],
  ["Presiona el micrófono y di: ayuda.", "Press the microphone and say: help."],
  ["Leer página", "Read page"],
  ["Puedes hablarle al asistente con estos comandos:", "You can speak to the assistant with these commands:"],
  ["Te escucho.", "I am listening."],
  ["Escuchando...", "Listening..."],
  ["Escuché:", "I heard:"],
  ["No entendí el comando.", "I did not understand the command."],
  ["Di ayuda para escuchar las opciones.", "Say help to hear the options."],
  ["No encontré ese botón o enlace.", "I did not find that button or link."],
  ["No encontré esa opción.", "I did not find that option."],
  ["Controles disponibles:", "Available controls:"],
  ["No encontré controles visibles.", "I did not find visible controls."],
  ["No encontré contenido para leer.", "I did not find content to read."],
  ["No encontré el panel.", "I did not find the panel."],
  ["No hay ruta visible por ahora.", "There is no visible route right now."],
  ["No hay avisos visibles.", "There are no visible alerts."],
  ["Popup del mapa:", "Map popup:"],
  ["Capas:", "Layers:"],
  ["El mapa está visible, sin popup abierto.", "The map is visible, with no open popup."],
  ["No hay nada abierto para cerrar.", "There is nothing open to close."],
  ["Cerrado.", "Closed."],
  ["Seleccionado:", "Selected:"],
  ["Listo:", "Done:"],
  ["Tu navegador no permite reconocimiento de voz.", "Your browser does not support speech recognition."],
  ["Aún puedo leer la página con los botones del asistente.", "I can still read the page with the assistant buttons."],
  ["La lectura por voz no está disponible en este navegador.", "Voice reading is not available in this browser."],
  ["referenciales", "reference"],
  ["referencial", "reference"],
  ["aprox.", "approx."],
  ["aprox", "approx."]
];

PHRASES.push(...EXTRA_PHRASES);

const ATTRS = ["title", "aria-label", "placeholder", "alt", "label"];
let observer = null;
let applying = false;

/**
 * Normaliza o formatea normalize lang para usarlo de forma consistente.
 */
function normalizeLang(lang) {
  return String(lang || "es").toLowerCase().startsWith("en") ? "en" : "es";
}

/**
 * Gestiona phrase pairs for dentro del flujo principal del modulo.
 */
function phrasePairsFor(lang) {
  const pairs = lang === "en"
    ? PHRASES
    : PHRASES.map(([es, en]) => [en, es]);

  return [...pairs].sort((a, b) => b[0].length - a[0].length);
}

/**
 * Gestiona replace all text dentro del flujo principal del modulo.
 */
function replaceAllText(text, lang) {
  if (!text || !String(text).trim()) return text;
  let out = text;
  for (const [from, to] of phrasePairsFor(lang)) {
    out = out.split(from).join(to);
  }
  return out;
}

/**
 * Evalua si should skip node para decidir el flujo de la interfaz.
 */
function shouldSkipNode(node) {
  const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
  if (!el) return true;
  return !!el.closest("script, style, noscript, code, pre, textarea, input, [data-no-i18n]");
}

/**
 * Gestiona translate element attributes dentro del flujo principal del modulo.
 */
function translateElementAttributes(el, lang) {
  for (const attr of ATTRS) {
    if (!el.hasAttribute(attr)) continue;
    const current = el.getAttribute(attr);
    const next = replaceAllText(current, lang);
    if (next !== current) el.setAttribute(attr, next);
  }
}

/**
 * Obtiene get lang desde el estado local, la API o los datos cacheados.
 */
export function getLang() {
  return normalizeLang(localStorage.getItem(LS_LANG) || "es");
}

/**
 * Actualiza set lang y sincroniza la interfaz con el estado actual.
 */
export function setLang(lang) {
  localStorage.setItem(LS_LANG, normalizeLang(lang));
}

/**
 * Gestiona t dentro del flujo principal del modulo.
 */
export function t(key) {
  const lang = getLang();
  return (I18N[lang] && I18N[lang][key]) || I18N.es[key] || key;
}

/**
 * Gestiona translate text dentro del flujo principal del modulo.
 */
export function translateText(text) {
  return replaceAllText(text, getLang());
}

/**
 * Gestiona translate html dentro del flujo principal del modulo.
 */
export function translateHTML(html) {
  return replaceAllText(html, getLang());
}

/**
 * Gestiona translate node dentro del flujo principal del modulo.
 */
export function translateNode(root = document.body) {
  if (!root || getLang() === "es" && !document.documentElement.dataset.i18nTranslated) {
    return;
  }

  const lang = getLang();
  applying = true;

  try {
    const start = root.nodeType === Node.DOCUMENT_NODE ? root.body : root;
    if (!start) return;

    if (start.nodeType === Node.ELEMENT_NODE) translateElementAttributes(start, lang);

    const walker = document.createTreeWalker(
      start,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      {
        acceptNode(node) {
          if (shouldSkipNode(node)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.nodeType === Node.TEXT_NODE) {
        const next = replaceAllText(node.nodeValue, lang);
        if (next !== node.nodeValue) node.nodeValue = next;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        translateElementAttributes(node, lang);
      }
    }

    if (lang === "en") document.documentElement.dataset.i18nTranslated = "en";
    else delete document.documentElement.dataset.i18nTranslated;
  } finally {
    applying = false;
  }
}

/**
 * Actualiza apply language ui y sincroniza la interfaz con el estado actual.
 */
export function applyLanguageUI() {
  const lang = getLang();
  document.documentElement.lang = lang;
  document.title = replaceAllText(document.title, lang);

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = t(key);
  });

  const langES = document.getElementById("langES");
  const langEN = document.getElementById("langEN");

  if (langES && langEN) {
    langES.classList.toggle("active", lang === "es");
    langEN.classList.toggle("active", lang === "en");
  }

  translateNode(document.body);
}

/**
 * Inicializa init language observer y deja sus eventos o elementos listos para usarse.
 */
export function initLanguageObserver() {
  if (observer || !document.body) return;

  observer = new MutationObserver(mutations => {
    if (applying || getLang() !== "en") return;
    for (const mutation of mutations) {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
          translateNode(node);
        }
      });

      if (mutation.type === "attributes" && mutation.target) {
        translateNode(mutation.target);
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ATTRS
  });
}

/**
 * Gestiona toggle language dentro del flujo principal del modulo.
 */
export function toggleLanguage() {
  const lang = getLang();
  setLang(lang === "es" ? "en" : "es");
  applyLanguageUI();
}
