import { BASE } from './supabase.js';
const M = f => `${BASE}/motion/${f}`;
/** motion graphics renderizados a partir da geometria real (eng/anim). Os passos sincronizam a legenda em HTML. */
export const LOCK_VIDEO = {
  src: M('lock.mp4'), poster: M('lock.jpg'),
  label: 'Animação em corte do DÍGITO Lock: a pega alinha, desce, roda 60 graus e fica presa por três patilhas debaixo do lábio do insert azul.',
  legend: [['#4A4F55', 'Capa · TPU 95A'], ['#1A73E8', 'Insert · PETG'], ['#DADCE0', 'Pega · PETG']],
  steps: [
    [0, '1', 'Alinhar', 'A seta da pega encontra a marca da capa. Só há uma posição em que as três patilhas entram.'],
    [3.2, '2', 'Empurrar', 'As patilhas passam o lábio e o pilar de TPU comprime 0,55 mm.'],
    [4.6, '3', 'Rodar 60°', 'As patilhas deslizam por baixo do lábio até ao batente.'],
    [6.5, '4', 'Soltar: clique', 'O pilar empurra as patilhas para dentro dos entalhes de 0,4 mm.'],
    [7.6, '✓', 'Bloqueada', 'Puxar ou rodar não a solta. Só empurrar e rodar ao contrário.'],
  ],
};
export const PRINT_VIDEO = {
  src: M('print2.mp4'), poster: M('print2.jpg'),
  label: 'Impressão com dois bicos: o fundo da capa em TPU cinzento, depois o insert azul em PETG e a capa à volta na mesma camada, e por fim a tampa de TPU.',
  legend: [['#4A4F55', 'Capa · TPU 95A (bico 1)'], ['#1A73E8', 'Insert · PETG (bico 2)']],
  steps: [
    [0, '1', 'Uma impressão, dois bicos', 'A capa e o insert saem da mesma placa, sem pausas.'],
    [1.6, '2', 'Fundo da capa em TPU', 'Bico 1, até z = 0,6 mm.'],
    [3.0, '3', 'TPU e PETG na mesma camada', 'Em cada camada, o bico 2 desenha o insert e o bico 1 a capa à volta.'],
    [7.4, '4', 'Tampa de TPU por cima', 'O insert fica preso pela forma hexagonal, sem cola.'],
    [8.6, '✓', 'Pronta a usar', 'A pega encaixa logo que a peça arrefece.'],
  ],
};
