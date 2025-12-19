const channel = new BroadcastChannel('bingo_channel');

// Elementos
const elLetraGigante = document.getElementById('letraGigante');
const elNumeroGigante = document.getElementById('numeroGigante');
const elContador = document.getElementById('contadorTV');
const elGrid = document.getElementById('gridTV');
const elMsg = document.getElementById('msgUltimo');
const elRegraTV = document.getElementById('txtRegraTV');
const MAPA_REGRAS = {
    'CARTELA_CHEIA': 'CARTELA CHEIA',
    'LINHA': 'LINHA (5 NÚMEROS)',
    'COLUNA': 'COLUNA (5 NÚMEROS)',
    'LINHA_OU_COLUNA': 'LINHA OU COLUNA (5 NÚMEROS)'
};

let maxNumeros = 75;
let bloqueioAnimacao = false;
let dadosPendentes = null;
let intervaloShuffle = null;

// Cronômetro
let dataInicioPartida = null;
let intervaloCronometro = null;

document.addEventListener('DOMContentLoaded', () => {
    gerarColunasBingo(75);
    console.log("📺 TV Aberta. Pedindo sync...");
    channel.postMessage({ tipo: 'TV_CONECTADA' });
});

channel.onmessage = (event) => {
    const dados = event.data;
    //console.log("📩 TV recebeu:", dados.tipo, dados);

    if (dados.partida && dados.partida.regraVitoria) {
        const textoRegra = MAPA_REGRAS[dados.partida.regraVitoria] || dados.partida.regraVitoria;
        if (elRegraTV) elRegraTV.textContent = textoRegra;
    }

    if(dados.maxNumeros && dados.maxNumeros !== maxNumeros) {
        maxNumeros = dados.maxNumeros;
        gerarColunasBingo(maxNumeros);
    }

    if (dados.partida && dados.partida.dataInicio) {
        if (dados.partida.dataInicio !== dataInicioPartida) {
            console.log("⏱ Data inicio recebida na TV:", dados.partida.dataInicio);
            dataInicioPartida = dados.partida.dataInicio;
            iniciarCronometro();
        }
    }

    switch (dados.tipo) {
        case 'SYNC_INICIAL':
            if(dados.partida) {
                aplicarAtualizacao(dados);
                if (dados.ultimoNumero) {
                    const letra = dados.letra || calcularLetraFallback(dados.ultimoNumero);
                    elLetraGigante.textContent = letra;
                    elNumeroGigante.textContent = dados.ultimoNumero;
                    elMsg.textContent = `Último: ${letra} - ${dados.ultimoNumero}`;
                }
            }
            break;

        case 'INICIO_SORTEIO': tratarInicioSorteio(); break;
        case 'ATUALIZACAO':
            if (bloqueioAnimacao) dadosPendentes = dados;
            else aplicarAtualizacao(dados);
            break;
        case 'INICIO_DESEMPATE': prepararDesempate(dados.jogadores); break;
        case 'ATUALIZA_DESEMPATE': animarCardDuelo(dados.index, dados.numero); break;
        case 'VITORIA_FINAL': mostrarVitoria(dados.vencedor); break;
    }
};

function iniciarCronometro() {
    if (intervaloCronometro) clearInterval(intervaloCronometro);
    const elTempo = document.getElementById('tempoDecorrido');

    const start = tratarData(dataInicioPartida);
    if (!start) {
        console.warn("⚠️ Data inválida para cronômetro TV");
        return;
    }

    intervaloCronometro = setInterval(() => {
        const now = new Date().getTime();
        const diff = now - start;

        if (diff < 0) {
            if(elTempo) elTempo.innerText = "00:00";
            return;
        }

        const totalSeconds = Math.floor(diff / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        if(elTempo) elTempo.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

function tratarData(dataRaw) {
    if(!dataRaw) return null;
    if (Array.isArray(dataRaw)) {
        return new Date(dataRaw[0], dataRaw[1]-1, dataRaw[2], dataRaw[3], dataRaw[4], dataRaw[5] || 0).getTime();
    }
    return new Date(dataRaw).getTime();
}

// --- CORE ---
function gerarColunasBingo(total) {
    elGrid.innerHTML = '';
    const letras = ['B', 'I', 'N', 'G', 'O'];
    const porColuna = total / 5;
    letras.forEach((letra, index) => {
        const colDiv = document.createElement('div');
        colDiv.className = `coluna-bingo col-${letra.toLowerCase()}`;
        colDiv.innerHTML = `<div class="cabecalho-letra">${letra}</div><div class="corpo-numeros"></div>`;
        const corpo = colDiv.querySelector('.corpo-numeros');
        const inicio = (index * porColuna) + 1;
        const fim = (index + 1) * porColuna;
        for(let i = inicio; i <= fim; i++) {
            const numDiv = document.createElement('div');
            numDiv.className = 'numero-grade';
            numDiv.id = `bola-${i}`;
            numDiv.textContent = i;
            corpo.appendChild(numDiv);
        }
        elGrid.appendChild(colDiv);
    });
}

function tratarInicioSorteio() {
    iniciarAnimacaoEmbaralhar();
    bloqueioAnimacao = true;
    dadosPendentes = null;
    document.querySelectorAll('.numero-grade.ultimo').forEach(el => el.classList.remove('ultimo'));
    setTimeout(() => {
        bloqueioAnimacao = false;
        if (dadosPendentes) {
            aplicarAtualizacao(dadosPendentes);
            dadosPendentes = null;
        }
    }, 2500);
}

function aplicarAtualizacao(dados) {
    const numero = dados.ultimoNumero;
    if(!numero) return;
    const letra = dados.letra || calcularLetraFallback(numero);

    if(bloqueioAnimacao || dados.tipo === 'ATUALIZACAO') {
        pararAnimacaoEmbaralhar(numero, letra);
    }

    const lista = dados.numerosSorteados || [];
    if(elContador) elContador.innerText = lista.length;
    document.querySelectorAll('.numero-grade.ultimo').forEach(el => el.classList.remove('ultimo'));
    lista.forEach(n => {
        const el = document.getElementById(`bola-${n}`);
        if(el) el.classList.add('marcado');
    });
    const elUltimo = document.getElementById(`bola-${numero}`);
    if(elUltimo) elUltimo.classList.add('marcado', 'ultimo');
}

function calcularLetraFallback(numero) {
    if(!numero) return "";
    const i = Math.floor((numero - 1) / (maxNumeros === 90 ? 18 : 15));
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
    reproduzirVideoAleatorio();
    document.getElementById('overlayVitoria').style.display = 'flex';
}

const videosDeVitoria = [
    '../img/vencedor_bingo0.mp4',
    '../img/vencedor_bingo1.mp4',
    '../img/vencedor_bingo2.mp4',
    '../img/vencedor_bingo3.mp4',
    '../img/vencedor_bingo4.mp4',
    '../img/vencedor_bingo5.mp4'
];

function reproduzirVideoAleatorio() {
    const videoEl = document.getElementById('videoBackground');
    const indiceSorteado = Math.floor(Math.random() * videosDeVitoria.length);
    const videoEscolhido = videosDeVitoria[indiceSorteado];

    console.log("Reproduzindo vídeo de vitória:", videoEscolhido);

    videoEl.src = videoEscolhido;
    videoEl.load();
    videoEl.play().catch(erro => {
        console.error("Erro ao tentar reproduzir vídeo automaticamente:", erro);
    });
}