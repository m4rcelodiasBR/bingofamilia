const channel = new BroadcastChannel('bingo_channel');

// Elementos
const elLetraGigante = document.getElementById('letraGigante');
const elNumeroGigante = document.getElementById('numeroGigante');
const elContador = document.getElementById('contadorTV');
const elGrid = document.getElementById('gridTV');
const elMsg = document.getElementById('msgUltimo');

let maxNumeros = 75;
let bloqueioAnimacao = false;
let dadosPendentes = null;
let intervaloShuffle = null;

document.addEventListener('DOMContentLoaded', () => {
    gerarColunasBingo(75);
});

channel.onmessage = (event) => {
    const dados = event.data;

    // Atualiza Max Numeros se necessário
    if(dados.maxNumeros && dados.maxNumeros !== maxNumeros) {
        maxNumeros = dados.maxNumeros;
        gerarColunasBingo(maxNumeros);
    }
    if (dados.partida) {
        const novoMax = (dados.partida.tipoJogo === 'BINGO_90') ? 90 : 75;
        if(novoMax !== maxNumeros) {
            maxNumeros = novoMax;
            gerarColunasBingo(maxNumeros);
        }
    }

    switch (dados.tipo) {
        case 'INICIO_SORTEIO':
            tratarInicioSorteio();
            break;
        case 'ATUALIZACAO':
            if (bloqueioAnimacao) {
                dadosPendentes = dados;
            } else {
                aplicarAtualizacao(dados);
            }
            break;
        case 'INICIO_DESEMPATE': prepararDesempate(dados.jogadores); break;
        case 'ATUALIZA_DESEMPATE': animarCardDuelo(dados.index, dados.numero); break;
        case 'VITORIA_FINAL': mostrarVitoria(dados.vencedor); break;
    }
};

function gerarColunasBingo(total) {
    elGrid.innerHTML = '';
    const letras = ['B', 'I', 'N', 'G', 'O'];
    const porColuna = total / 5;

    letras.forEach((letra, index) => {
        const colunaDiv = document.createElement('div');
        colunaDiv.className = `coluna-bingo col-${letra.toLowerCase()}`;

        const header = document.createElement('div');
        header.className = 'cabecalho-letra';
        header.textContent = letra;
        colunaDiv.appendChild(header);

        const corpo = document.createElement('div');
        corpo.className = 'corpo-numeros';

        const inicio = (index * porColuna) + 1;
        const fim = (index + 1) * porColuna;

        for(let i = inicio; i <= fim; i++) {
            const numDiv = document.createElement('div');
            numDiv.className = 'numero-grade';
            numDiv.id = `bola-${i}`;
            numDiv.textContent = i;
            corpo.appendChild(numDiv);
        }
        colunaDiv.appendChild(corpo);
        elGrid.appendChild(colunaDiv);
    });
}

function tratarInicioSorteio() {
    iniciarAnimacaoEmbaralhar();
    bloqueioAnimacao = true;
    dadosPendentes = null;

    // CORREÇÃO AQUI: Não remove 'marcado', remove apenas 'ultimo'
    document.querySelectorAll('.numero-grade.ultimo').forEach(el => el.classList.remove('ultimo'));

    // Opcional: Se quiser remover o "ultimo" marcado com cor diferente, mas manter ele marcado
    // Apenas garante que visualmente ele pareça um numero marcado normal agora.

    setTimeout(() => {
        bloqueioAnimacao = false;
        if (dadosPendentes) {
            aplicarAtualizacao(dadosPendentes);
            dadosPendentes = null;
        }
    }, 2500); // 2.5s de suspense
}

function aplicarAtualizacao(dados) {
    const numero = dados.ultimoNumero;
    const letra = dados.letra || calcularLetraFallback(numero);

    pararAnimacaoEmbaralhar(numero, letra);

    const lista = dados.numerosSorteados || [];
    if(elContador) elContador.innerText = lista.length;

    // Garante limpeza de 'ultimo' anterior
    document.querySelectorAll('.numero-grade.ultimo').forEach(el => el.classList.remove('ultimo'));

    // Marca todos os sorteados
    lista.forEach(n => {
        const el = document.getElementById(`bola-${n}`);
        if(el) el.classList.add('marcado');
    });

    // Destaca o novo
    const elUltimo = document.getElementById(`bola-${numero}`);
    if(elUltimo) elUltimo.classList.add('marcado', 'ultimo');
}

function calcularLetraFallback(numero) {
    if(!numero) return "";
    const colunas = maxNumeros === 90 ? 18 : 15;
    const i = Math.floor((numero - 1) / colunas);
    return ['B','I','N','G','O'][i] || "";
}

function iniciarAnimacaoEmbaralhar() {
    if (intervaloShuffle) clearInterval(intervaloShuffle);
    elMsg.textContent = "SORTEANDO...";
    elLetraGigante.textContent = "";
    elNumeroGigante.style.color = '#555';

    intervaloShuffle = setInterval(() => {
        elNumeroGigante.textContent = Math.floor(Math.random() * maxNumeros) + 1;
    }, 80);
}

function pararAnimacaoEmbaralhar(numeroFinal, letraFinal) {
    if (intervaloShuffle) {
        clearInterval(intervaloShuffle);
        intervaloShuffle = null;
    }
    elLetraGigante.textContent = letraFinal;
    elNumeroGigante.textContent = numeroFinal;
    elNumeroGigante.style.color = '';
    elMsg.textContent = `Sorteado: ${letraFinal} - ${numeroFinal}`;

    elNumeroGigante.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.5)' }, { transform: 'scale(1)' }], { duration: 500 });
}

// Funções Desempate
function prepararDesempate(jogadores) {
    const overlay = document.getElementById('overlayDesempate');
    const container = document.getElementById('containerCardsDuelo');
    container.innerHTML = '';
    overlay.style.display = 'block';
    jogadores.forEach((jog, index) => {
        const card = document.createElement('div');
        card.className = 'card-duelo-tv';
        card.innerHTML = `<h3>${jog.nome}</h3><div id="tv-duelo-num-${index}" class="duelo-numero">?</div>`;
        container.appendChild(card);
    });
}
function animarCardDuelo(index, numero) {
    const el = document.getElementById(`tv-duelo-num-${index}`);
    if (el) {
        let count = 0;
        const loop = setInterval(() => { el.textContent = Math.floor(Math.random()*99)+1; count++; if(count>15){ clearInterval(loop); el.textContent=numero; el.style.transform="scale(1.3)"; } }, 80);
    }
}
function mostrarVitoria(nome) {
    document.getElementById('overlayDesempate').style.display = 'none';
    document.getElementById('nomeVencedorFinal').textContent = nome || "VENCEDOR";
    document.getElementById('overlayVitoria').style.display = 'flex';
}