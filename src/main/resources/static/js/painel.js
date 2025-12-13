/**
 * Lógica da Tela de Exibição (TV)
 * Funciona como "Escravo" da tela de Jogo via BroadcastChannel.
 */

const channel = new BroadcastChannel('bingo_channel');
const elNumeroGigante = document.getElementById('numeroGigante');
const elContador = document.getElementById('contadorTV');
const elGrid = document.getElementById('gridTV');
const elMsg = document.getElementById('msgUltimo');

let maxNumeros = 75;
let intervaloShuffle = null; // Para controlar animação

document.addEventListener('DOMContentLoaded', () => {
    gerarGridVazio(maxNumeros);
});

// --- Central de Mensagens ---
channel.onmessage = (event) => {
    const dados = event.data;
    console.log("TV recebeu:", dados);

    switch (dados.tipo) {
        case 'INICIO_SORTEIO':
            iniciarAnimacaoEmbaralhar();
            break;

        case 'ATUALIZACAO':
            pararAnimacaoEmbaralhar(dados.ultimoNumero);
            atualizarTela(dados);
            break;

        case 'INICIO_DESEMPATE':
            prepararDesempate(dados.jogadores);
            break;

        case 'ATUALIZA_DESEMPATE':
            animarCardDuelo(dados.index, dados.numero);
            break;

        case 'VITORIA_FINAL':
            mostrarVitoria(dados.vencedor);
            break;
    }
};

// --- Funções Principais ---

function atualizarTela(dados) {
    const lista = dados.numerosSorteados || [];
    const ultimo = dados.ultimoNumero;

    elContador.textContent = lista.length;

    if (ultimo > maxNumeros) {
        maxNumeros = 90;
        gerarGridVazio(maxNumeros);
    }

    remarcarTudo(lista);
}

function gerarGridVazio(total) {
    elGrid.innerHTML = '';
    for (let i = 1; i <= total; i++) {
        const bola = document.createElement('div');
        bola.className = 'numero-bola';
        bola.id = `tv-bola-${i}`;
        bola.textContent = i;
        elGrid.appendChild(bola);
    }
}

function remarcarTudo(lista) {
    document.querySelectorAll('.numero-bola.ultimo').forEach(el => el.classList.remove('ultimo'));

    lista.forEach((num, index) => {
        const bola = document.getElementById(`tv-bola-${num}`);
        if (bola) {
            bola.classList.add('marcado');
            if (index === lista.length - 1) {
                bola.classList.add('ultimo');
            }
        }
    });
}

// --- Animações ---

function iniciarAnimacaoEmbaralhar() {
    if (intervaloShuffle) clearInterval(intervaloShuffle);

    elMsg.textContent = "Sorteando...";
    elNumeroGigante.style.color = 'var(--text-secondary)'; // Cor neutra durante sorteio

    intervaloShuffle = setInterval(() => {
        elNumeroGigante.textContent = Math.floor(Math.random() * 90) + 1;
    }, 80);
}

function pararAnimacaoEmbaralhar(numeroFinal) {
    if (intervaloShuffle) clearInterval(intervaloShuffle);
    intervaloShuffle = null;

    elNumeroGigante.textContent = numeroFinal;
    elNumeroGigante.style.color = ''; // Volta cor original
    elMsg.textContent = `Número ${numeroFinal}`;
}

// --- Desempate e Vitória ---

function prepararDesempate(jogadores) {
    // Mostra overlay de desempate
    const overlay = document.getElementById('overlayDesempate');
    const container = document.getElementById('containerCardsDuelo');

    container.innerHTML = '';
    overlay.style.display = 'block';

    jogadores.forEach((jog, index) => {
        const card = document.createElement('div');
        card.className = 'card-duelo-tv';
        // IDs únicos para atualizar depois
        card.innerHTML = `
            <h3>${jog.nome}</h3>
            <div id="tv-duelo-num-${index}" class="duelo-numero">?</div>
        `;
        container.appendChild(card);
    });
}

function animarCardDuelo(index, numero) {
    const el = document.getElementById(`tv-duelo-num-${index}`);
    if (el) {
        let count = 0;
        const loop = setInterval(() => {
            el.textContent = Math.floor(Math.random() * 99) + 1;
            count++;
            if(count > 10) {
                clearInterval(loop);
                el.textContent = numero;
                el.style.transform = "scale(1.2)";
            }
        }, 50);
    }
}

function mostrarVitoria(nome) {
    document.getElementById('overlayDesempate').style.display = 'none';
    const overlay = document.getElementById('overlayVitoria');
    const txtNome = document.getElementById('nomeVencedorFinal');
    txtNome.textContent = nome || "JOGADOR";
    overlay.style.display = 'flex';
}