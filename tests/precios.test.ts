import { describe, it, expect } from 'vitest';
import { leerCotizacion, leerPapeles, simboloValido } from '@/lib/precios';

// Lo que se prueba acá no es el endpoint —eso es de Yahoo y puede cambiar
// mañana—, sino las dos reglas que Matías puso al aprobar esto:
//   §0.13 · que sea un BUSCADOR y no un recomendador → solo acciones.
//   03/08 · la moneda viaja pegada al número → no se suman USD con EUR.

// La forma real de una respuesta del buscador, verificada con curl el 04/08.
const BUSQUEDA = {
  quotes: [
    {
      symbol: 'AAPL',
      quoteType: 'EQUITY',
      longname: 'Apple Inc.',
      shortname: 'Apple Inc',
      exchDisp: 'NASDAQ',
      sectorDisp: 'Technology',
    },
    // Un fondo, un cripto y un futuro: la fuente los devuelve mezclados con las
    // acciones. Dejarlos entrar convertiría una lista de papeles en un catálogo
    // de productos financieros, que es justo lo que no queremos ofrecer.
    { symbol: 'VWCE.DE', quoteType: 'ETF', longname: 'Vanguard FTSE All-World' },
    { symbol: 'BTC-EUR', quoteType: 'CRYPTOCURRENCY', shortname: 'Bitcoin EUR' },
    { symbol: 'ES=F', quoteType: 'FUTURE', shortname: 'E-Mini S&P 500' },
  ],
};

describe('leerPapeles', () => {
  it('⚠️ deja pasar SOLO acciones', () => {
    const r = leerPapeles(BUSQUEDA);
    expect(r.map((p) => p.simbolo)).toEqual(['AAPL']);
  });

  it('sin símbolo no entra, aunque sea una acción', () => {
    // El símbolo es la identidad: sin él no se le puede pedir el precio después.
    expect(leerPapeles({ quotes: [{ quoteType: 'EQUITY', longname: 'Sin símbolo' }] })).toEqual([]);
  });

  it('cae al nombre corto, y al símbolo, cuando falta el largo', () => {
    const soloCorto = leerPapeles({ quotes: [{ symbol: 'SAP.DE', quoteType: 'EQUITY', shortname: 'SAP SE' }] });
    expect(soloCorto[0].nombre).toBe('SAP SE');
    const sinNombre = leerPapeles({ quotes: [{ symbol: 'SAP.DE', quoteType: 'EQUITY' }] });
    expect(sinNombre[0].nombre).toBe('SAP.DE');
  });

  it('mercado y sector quedan en null cuando no vienen, no en string vacío', () => {
    // La pantalla decide con `if (papel.sector)`: un '' se vería como un renglón
    // vacío en vez de no verse.
    const r = leerPapeles({ quotes: [{ symbol: 'AAPL', quoteType: 'EQUITY', exchDisp: '  ', sectorDisp: '' }] });
    expect(r[0]).toMatchObject({ mercado: null, sector: null });
  });

  it('con una respuesta rota devuelve lista vacía en vez de tirar', () => {
    // La pantalla ya sabe vivir sin precio: un error acá no es un error de la app.
    expect(leerPapeles(null)).toEqual([]);
    expect(leerPapeles({})).toEqual([]);
    expect(leerPapeles({ quotes: 'nada' })).toEqual([]);
  });
});

describe('simboloValido', () => {
  it('normaliza a mayúsculas y acepta los símbolos reales', () => {
    expect(simboloValido(' aapl ')).toBe('AAPL');
    expect(simboloValido('sap.de')).toBe('SAP.DE');
    expect(simboloValido('BRK-B')).toBe('BRK-B');
    expect(simboloValido('^GSPC')).toBe('^GSPC');
  });

  it('rechaza lo que no tiene forma de símbolo', () => {
    // Lo que él escriba va pegado a una URL. Vacío, con espacios en el medio o
    // con una barra no se pregunta.
    expect(simboloValido('')).toBeNull();
    expect(simboloValido('apple inc')).toBeNull();
    expect(simboloValido('../etc/passwd')).toBeNull();
    expect(simboloValido('A'.repeat(21))).toBeNull();
  });
});

describe('leerCotizacion', () => {
  const respuesta = (meta: unknown) => ({ chart: { result: [{ meta }] } });

  it('⚠️ devuelve la moneda junto con el número', () => {
    // Sin la moneda al lado, el total de la cartera sumaría USD con EUR sin
    // avisar — que es el bug exacto que hubo que arreglar en el gráfico de
    // gastos el 03/08.
    expect(leerCotizacion(respuesta({ regularMarketPrice: 227.52, currency: 'USD' }))).toEqual({
      precio: 227.52,
      moneda: 'USD',
    });
  });

  it('sin moneda devuelve el precio con moneda null, no lo inventa', () => {
    expect(leerCotizacion(respuesta({ regularMarketPrice: 227.52 }))).toEqual({ precio: 227.52, moneda: null });
  });

  it('un precio que no es un número usable es null, no un cero', () => {
    // Un 0 se vería en la pantalla como "vale nada", que es una afirmación. null
    // es "no sé", que es la verdad.
    expect(leerCotizacion(respuesta({ regularMarketPrice: 0 }))).toBeNull();
    expect(leerCotizacion(respuesta({ regularMarketPrice: -3 }))).toBeNull();
    expect(leerCotizacion(respuesta({ regularMarketPrice: '227.52' }))).toBeNull();
    expect(leerCotizacion(respuesta({ regularMarketPrice: null }))).toBeNull();
    expect(leerCotizacion(respuesta({}))).toBeNull();
  });

  it('con la respuesta vacía o rota devuelve null en vez de tirar', () => {
    expect(leerCotizacion(null)).toBeNull();
    expect(leerCotizacion({})).toBeNull();
    expect(leerCotizacion({ chart: { result: [] } })).toBeNull();
    expect(leerCotizacion({ chart: { error: 'Not Found' } })).toBeNull();
  });
});
