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
let intervaloShuffle = null; // Para controlar o loop visual

// --- CONTROLE DE ESTADO DE ANIMAÇÃO ---
let bloqueioAnimacao = false; // Impede que o resultado apareça instantaneamente
let dadosPendentes = null;    // Guarda o resultado se ele chegar muito rápido

document.addEventListener('DOMContentLoaded', () => {
    gerarGridVazio(maxNumeros);
});

// --- Central de Mensagens ---
channel.onmessage = (event) => {
    const dados = event.data;
    console.log("TV recebeu:", dados);

    switch (dados.tipo) {
        case 'INICIO_SORTEIO':
            // Ao receber o comando de sortear, iniciamos a trava de tempo
            tratarInicioSorteio();
            break;

        case 'ATUALIZACAO':
            // Se estivermos no meio da animação obrigatória, guardamos para depois
            if (bloqueioAnimacao) {
                console.log("Segurando resultado para suspense...");
                dadosPendentes = dados;
            } else {
                aplicarAtualizacao(dados);
            }
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

function tratarInicioSorteio() {
    // 1. Inicia o visual
    iniciarAnimacaoEmbaralhar();

    // 2. Ativa o bloqueio para garantir o suspense
    bloqueioAnimacao = true;
    dadosPendentes = null; // Limpa dados antigos

    // 3. Define o tempo mínimo de animação (ex: 2.5 segundos)
    setTimeout(() => {
        bloqueioAnimacao = false;

        // Se o resultado chegou enquanto esperávamos, exibe agora
        if (dadosPendentes) {
            aplicarAtualizacao(dadosPendentes);
            dadosPendentes = null;
        }
    }, 2500); // <-- AJUSTE AQUI O TEMPO DE SUSPENSE
}

function aplicarAtualizacao(dados) {
    pararAnimacaoEmbaralhar(dados.ultimoNumero);
    atualizarTela(dados);
}

function atualizarTela(dados) {
    const lista = dados.numerosSorteados || [];
    const ultimo = dados.ultimoNumero;

    if(elContador) elContador.textContent = lista.length;

    // Ajuste dinâmico para bingo de 90 bolas se necessário
    if (ultimo > maxNumeros && maxNumeros === 75) {
        maxNumeros = 90;
        gerarGridVazio(maxNumeros);
        // Remarca tudo pois o grid foi recriado
        remarcarTudo(lista);
    } else {
        remarcarTudo(lista);
    }
}

function gerarGridVazio(total) {
    if(!elGrid) return;
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
    // Remove classe 'ultimo' anterior
    document.querySelectorAll('.numero-bola.ultimo').forEach(el => el.classList.remove('ultimo'));
    // Remove classe 'marcado' para garantir consistência (opcional, mas seguro)
    // document.querySelectorAll('.numero-bola.marcado').forEach(el => el.classList.remove('marcado'));

    lista.forEach((num, index) => {
        const bola = document.getElementById(`tv-bola-${num}`);
        if (bola) {
            bola.classList.add('marcado');
            // Se for o último da lista, destaca
            if (num === lista[lista.length-1]) { // Verifica se é realmente o último sorteado
                bola.classList.add('ultimo');
            }
        }
    });
}

// --- Animações ---

function iniciarAnimacaoEmbaralhar() {
    if (intervaloShuffle) clearInterval(intervaloShuffle);

    if(elMsg) elMsg.textContent = "Sorteando...";
    if(elNumeroGigante) {
        elNumeroGigante.style.color = '#7f8c8d'; // Var ou cor fixa
        elNumeroGigante.classList.add('embaralhando'); // Sugestão para CSS (blur)
    }

    intervaloShuffle = setInterval(() => {
        if(elNumeroGigante) elNumeroGigante.textContent = Math.floor(Math.random() * maxNumeros) + 1;
    }, 80);
}

function pararAnimacaoEmbaralhar(numeroFinal) {
    if (intervaloShuffle) {
        clearInterval(intervaloShuffle);
        intervaloShuffle = null;
    }

    if(elNumeroGigante) {
        elNumeroGigante.textContent = numeroFinal;
        elNumeroGigante.style.color = ''; // Volta cor original
        elNumeroGigante.classList.remove('embaralhando');

        // Efeito visual de "POP"
        elNumeroGigante.style.transform = "scale(1.5)";
        setTimeout(() => elNumeroGigante.style.transform = "scale(1)", 300);
    }

    if(elMsg) elMsg.textContent = `Número ${numeroFinal}`;
}

// --- Desempate e Vitória ---

function prepararDesempate(jogadores) {
    const overlay = document.getElementById('overlayDesempate');
    const container = document.getElementById('containerCardsDuelo');

    if(!overlay || !container) return;

    container.innerHTML = '';
    overlay.style.display = 'block'; // Garante que a div apareça

    // Forçar reflow/repaint se necessário, ou garantir z-index no CSS

    jogadores.forEach((jog, index) => {
        const card = document.createElement('div');
        card.className = 'card-duelo-tv';
        // Aumentei o tamanho da fonte no HTML injetado
        card.innerHTML = `
            <h3 style="font-size: 2rem;">${jog.nome}</h3> 
            <div id="tv-duelo-num-${index}" class="duelo-numero" style="font-size: 4rem;">?</div>
        `;
        container.appendChild(card);
    });
}

function animarCardDuelo(index, numero) {
    const el = document.getElementById(`tv-duelo-num-${index}`);
    console.log(`Animando duelo para index ${index}, numero ${numero}, elemento encontrado:`, el); // Debug

    if (el) {
        let count = 0;
        // Limpa intervalo anterior se existir (segurança)
        if(el.dataset.intervalo) clearInterval(el.dataset.intervalo);

        const loop = setInterval(() => {
            el.textContent = Math.floor(Math.random() * 99) + 1;
            el.style.color = '#999';
            count++;
            if(count > 15) { // Aumentei um pouco o tempo da animação do duelo
                clearInterval(loop);
                el.textContent = numero;
                el.style.color = '#000'; // Cor destaque
                el.style.transform = "scale(1.3)";
                el.style.transition = "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
            }
        }, 80);

        // Guarda o ID do intervalo no elemento para poder limpar se necessário
        el.dataset.intervalo = loop;
    }
}

function mostrarVitoria(nome) {
    const ovDesempate = document.getElementById('overlayDesempate');
    const ovVitoria = document.getElementById('overlayVitoria');
    const txtNome = document.getElementById('nomeVencedorFinal');

    if(ovDesempate) ovDesempate.style.display = 'none';
    if(ovVitoria && txtNome) {
        txtNome.textContent = nome || "VENCEDOR";
        ovVitoria.style.display = 'flex';
    }
}