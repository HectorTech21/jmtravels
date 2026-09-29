/*
 * ÚNICA FUENTE DE VERDAD con los datos de la empresa.
 *
 * - En el navegador se expone como window.JMD_CONFIG (lo usan los cotizadores,
 *   el formulario y el botón de WhatsApp).
 * - `npm run build` lo lee para regenerar el HTML estático (footer, legales,
 *   JSON-LD, canonical, sitemap…). Tras editar este archivo, ejecuta el build.
 */
window.JMD_CONFIG = {
  // TODO: dominio definitivo SIN barra final, p. ej. "https://www.tudominio.es".
  // Mientras esté vacío no se emiten canonical/og:url ni URLs en el sitemap.
  SITE_URL: "",

  legalName: "JMD Travesías por el Mundo S.L.",
  brandName: "JMD Travesías por el Mundo",
  tradeName: "JMD Travesías por el Mundo — Agencia de Viajes & Multiservicios",
  shortName: "JMD Travesías",
  cif: "B88982244",
  license: "CICMA 4321",
  slogan: "No somos virtuales. Somos reales.",

  address: {
    street: "C/ Alcalá 414, Centro Comercial Alcalá Norte, Oficina 41, Planta 1",
    streetShort: "C/ Alcalá 414",
    detail: "Centro Comercial Alcalá Norte, Oficina 41, Planta 1",
    postalCode: "28027",
    city: "Madrid",
    district: "Ciudad Lineal",
    region: "Comunidad de Madrid",
    country: "ES",
    full: "C/ Alcalá 414, Centro Comercial Alcalá Norte, Oficina 41, Planta 1, 28027 Madrid (Ciudad Lineal)",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Calle+de+Alcal%C3%A1+414+Madrid+Centro+Comercial+Alcal%C3%A1+Norte",
    mapsEmbed: "https://www.google.com/maps?q=Calle+de+Alcal%C3%A1+414+Madrid+Centro+Comercial+Alcal%C3%A1+Norte&output=embed"
  },

  phone: {
    display: "+34 687 11 11 68",
    e164: "+34687111168",
    tel: "tel:+34687111168",
    whatsapp: "34687111168",
    whatsappUrl: "https://wa.me/34687111168"
  },

  // TODO: email de contacto. Vacío = se oculta en la web y se desactiva el envío por email.
  email: "",
  // TODO: horario de atención, p. ej. "Lunes a viernes de 10:00 a 20:00". Vacío = se oculta.
  hours: "",
  // TODO (opcional pero recomendado por la LSSI): datos de inscripción en el Registro Mercantil.
  registry: "",

  specialties: [
    "Vuelos a Latinoamérica con 2 maletas de 23 kg (2PC)",
    "Paquetería puerta a puerta Madrid → Lima (Perú)"
  ],
  services: [
    "Hoteles y paquetes vacacionales",
    "Seguros de viaje",
    "Asesoría de documentación de viaje",
    "Traslados y grupos"
  ],
  keywords: [
    "agencia de viajes Madrid",
    "vuelos a Latinoamérica",
    "vuelos 2 maletas 23 kg",
    "vuelos Madrid Lima",
    "paquetería Madrid Lima",
    "envío de paquetes a Perú",
    "agencia de viajes Ciudad Lineal",
    "JMD Travesías por el Mundo"
  ],

  // Destinos destacados (orden = orden en la web). iata = aeropuerto principal.
  destinations: [
    { id: "lima", city: "Lima", country: "Perú", iata: "LIM", img: "lima" },
    { id: "bogota", city: "Bogotá", country: "Colombia", iata: "BOG", img: "bogota" },
    { id: "caracas", city: "Caracas", country: "Venezuela", iata: "CCS", img: "caracas" },
    { id: "valencia-ve", city: "Valencia", country: "Venezuela", iata: "VLN", img: "valencia" },
    { id: "medellin", city: "Medellín", country: "Colombia", iata: "MDE", img: "medellin" },
    { id: "quito", city: "Quito", country: "Ecuador", iata: "UIO", img: "quito" },
    { id: "guayaquil", city: "Guayaquil", country: "Ecuador", iata: "GYE", img: "guayaquil" },
    { id: "santo-domingo", city: "Santo Domingo", country: "República Dominicana", iata: "SDQ", img: "santodomingo" },
    { id: "cusco", city: "Cusco", country: "Perú", iata: "CUZ", img: "cusco" },
    { id: "santa-cruz", city: "Santa Cruz", country: "Bolivia", iata: "VVI", img: "santacruz" },
    { id: "asuncion", city: "Asunción", country: "Paraguay", iata: "ASU", img: "" },
    { id: "buenos-aires", city: "Buenos Aires", country: "Argentina", iata: "EZE", img: "buenosaires" }
  ],

  // Tipos de mensaje prefijados para WhatsApp
  messages: {
    flight: "Hola JMD Travesías, quiero precio de un vuelo con 2 maletas de 23 kg:",
    parcel: "Hola JMD Travesías, quiero precio para un envío de paquetería Madrid → Lima:",
    contact: "Hola JMD Travesías, os escribo desde la web:",
    generic: "Hola JMD Travesías, quiero información."
  }
};
