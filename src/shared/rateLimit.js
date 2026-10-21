export function criarLimitadorJanela({ maximo, janelaMs, agora = () => Date.now() }) {
  const tentativas = [];

  return {
    tentar() {
      const limite = agora() - janelaMs;
      while (tentativas[0] <= limite) tentativas.shift();
      if (tentativas.length >= maximo) {
        return {
          permitido: false,
          aguardeMs: Math.max(0, tentativas[0] + janelaMs - agora()),
        };
      }
      tentativas.push(agora());
      return { permitido: true, aguardeMs: 0 };
    },
    limpar() {
      tentativas.length = 0;
    },
  };
}
