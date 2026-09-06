const caminhos = {
  selecionar: 'M4 3l7 18 2-8 8-2L4 3z',
  token: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M19 8v6 M16 11h6 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  medir: 'M3 7l4-4 14 14-4 4L3 7z M7 7l2-2 M10 10l2-2 M13 13l2-2',
  efeito: 'M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3z',
  area: 'M12 3l9 17H3L12 3z M12 9v5 M12 17h.01',
  parede: 'M3 4h18v16H3z M3 9h18 M3 15h18 M9 4v5 M16 9v6 M9 15v5',
  revelar: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12 M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  esconder: 'M3 3l18 18 M9 5a12 12 0 0 1 13 7s-1 3-4 5 M6 6a17 17 0 0 0-4 6s4 7 10 7c1 0 3 0 4-1',
  ficha: 'M5 3h14v18H5z M8 7h8 M8 11h8 M8 15h5',
  chat: 'M3 4h18v13H8l-5 4V4z',
  iniciativa: 'M7 3h10 M7 21h10 M8 3v5l8 8v5 M16 3v5l-8 8v5',
  sons: 'M11 5L6 9H3v6h3l5 4V5z M15 8a6 6 0 0 1 0 8 M18 5a10 10 0 0 1 0 14',
};
export default function MesaIcone({ nome }) {
  return <svg className="mesa-svg-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={caminhos[nome] || caminhos.efeito} /></svg>;
}
