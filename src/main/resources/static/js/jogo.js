/**
 * Lógica da Tela de Jogo (Operador)
 * Versão Consolidada: Animações + Desempate + CamelCase
 */

const API_URL = '/api';
const params = new URLSearchParams(window.location.search);
const ID_PARTIDA = params.get('id');
const channel = new BroadcastChannel('bingo_channel');

let dadosPartida = null;
let maxNumeros = 75;
let empatados = []; // Controle para desempate

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    if (!ID_PARTIDA) {
        alert('ID da partida não encontrado! Redirecionando...');
        window.location.href = '../index.html';
        return;
    }

    document.getElementById('partidaIdDisplay').textContent = ID_PARTIDA.padStart(4, '0');
    carregarDadosIniciais();
});

async function carregarDadosIniciais() {
    try {
        const response = await fetch(`${API_URL}/partidas/${ID_PARTIDA}`);
        if (!response.ok) throw new Error('Falha ao buscar partida');

        dadosPartida = await response.json();

        maxNumeros = (dadosPartida.tipoJogo === 'BINGO_90') ? 90 : 75;
        const listaSorteados = dadosPartida.numerosSorteados || [];

        gerarTabuleiro(maxNumeros);
        atualizarTabuleiro(listaSorteados);

    } catch (error) {
        console.error('Erro ao carregar partida:', error);
        alert('Erro ao carregar dados da partida.');
    }
}

/**
 * Ação Principal: Realizar Sorteio com Animação
 */
async function realizarSorteio() {
    const btn = document.getElementById('btnSortear');
    const elementoDisplay = document.getElementById('numeroSorteado');
    btn.disabled = true;

    try {
        const response = await fetch(`${API_URL}/partidas/${ID_PARTIDA}/sortear`, {
            method: 'POST'
        });

        if (response.ok) {
            const data = await response.json();
            const numeroFinal = data.ultimoNumero;

            enviarParaTV({ tipo: 'INICIO_SORTEIO' });

            animarNumeros(elementoDisplay, numeroFinal, () => {

                let listaAtualizada = [];
                if (data.partida && data.partida.numerosSorteados) {
                    listaAtualizada = data.partida.numerosSorteados;
                    dadosPartida = data.partida;
                } else {
                    if(!dadosPartida.numerosSorteados) dadosPartida.numerosSorteados = [];
                    dadosPartida.numerosSorteados.push(numeroFinal);
                    listaAtualizada = dadosPartida.numerosSorteados;
                }

                atualizarTabuleiro(listaAtualizada); // Envia update final pra TV aqui dentro
                falarNumero(numeroFinal);
                btn.disabled = false;
            });

        } else {
            const erro = await response.json();
            if (erro.message && erro.message.toLowerCase().includes("todos")) {
                alert("🚨 BINGO ENCERRADO! Todos os números já saíram.");
            } else {
                console.error("Erro backend:", erro);
            }
            btn.disabled = false;
        }
    } catch (e) {
        console.error("Erro técnico no JS:", e);
        btn.disabled = false;
    }
}

// --- Funções Auxiliares de Tabuleiro e Voz ---

function gerarTabuleiro(max) {
    const grid = document.getElementById('tabuleiroGrid');
    grid.innerHTML = '';
    for (let i = 1; i <= max; i++) {
        const bola = document.createElement('div');
        bola.className = 'numero-bola';
        bola.id = `bola-${i}`;
        bola.textContent = i;
        grid.appendChild(bola);
    }
}

function atualizarTabuleiro(listaSorteados) {
    const contador = document.getElementById('contadorSorteados');
    if(contador) contador.textContent = listaSorteados.length;

    document.querySelectorAll('.numero-bola.ultimo').forEach(el => el.classList.remove('ultimo'));

    listaSorteados.forEach((num, index) => {
        const bola = document.getElementById(`bola-${num}`);
        if (bola) {
            bola.classList.add('marcado');
            if (index === listaSorteados.length - 1) {
                bola.classList.add('ultimo');
                atualizarDisplayPrincipal(num);
            }
        }
    });

    enviarParaTV({
        tipo: 'ATUALIZACAO',
        ultimoNumero: listaSorteados[listaSorteados.length - 1],
        numerosSorteados: listaSorteados
    });
}

function atualizarDisplayPrincipal(numero) {
    const display = document.getElementById('numeroSorteado');
    const legenda = document.getElementById('legendaNumero');
    if(display) display.textContent = numero;
    if(legenda) legenda.textContent = `Número ${numero}`;
}

function falarNumero(numero) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const msg = new SpeechSynthesisUtterance();
        msg.lang = 'pt-BR';
        msg.text = `Número ${numero}`;
        msg.rate = 1.1;
        window.speechSynthesis.speak(msg);
    }
}

function repetirUltimaFala() {
    const display = document.getElementById('numeroSorteado');
    const num = display ? display.textContent : '--';
    if (num && num !== '--') falarNumero(num);
}

// --- Lógica de Encerramento e Desempate ---

function encerrarPartida() {
    const modal = new bootstrap.Modal(document.getElementById('modalVencedor'));
    const lista = document.getElementById('listaPossiveisVencedores');
    lista.innerHTML = '';
    document.getElementById('faseSelecao').classList.remove('d-none');
    document.getElementById('faseDesempate').classList.add('d-none');

    if (dadosPartida && dadosPartida.participantes) {
        dadosPartida.participantes.forEach(p => {
            const label = document.createElement('label');
            label.className = 'list-group-item d-flex gap-3 pointer';
            label.innerHTML = `
                <input class="form-check-input flex-shrink-0 check-vencedor" type="checkbox" value="${p.id}" data-nome="${p.nome}">
                <span>${p.nome}</span>
            `;
            lista.appendChild(label);
        });
    }

    modal.show();
}

function verificarEmpate() {
    const checks = document.querySelectorAll('.check-vencedor:checked');
    if (checks.length === 0) {
        alert("Selecione pelo menos um jogador.");
        return;
    }

    empatados = Array.from(checks).map(ck => ({
        id: ck.value,
        nome: ck.getAttribute('data-nome'),
        pedra: 0
    }));

    if (empatados.length === 1) {
        finalizarNoBackend(empatados[0].id);
    } else {
        iniciarModoDesempate();
    }
}

function iniciarModoDesempate() {
    document.getElementById('faseSelecao').classList.add('d-none');
    document.getElementById('faseDesempate').classList.remove('d-none');

    const area = document.getElementById('areaDuelo');
    area.innerHTML = '';

    enviarParaTV({ tipo: 'INICIO_DESEMPATE', jogadores: empatados });

    empatados.forEach((jogador, index) => {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4';
        col.innerHTML = `
            <div class="card h-100 shadow-sm border-danger">
                <div class="card-body">
                    <h5 class="card-title text-danger">${jogador.nome}</h5>
                    <div id="resultado-duelo-${index}" class="display-4 my-3 fw-bold">--</div>
                    <button class="btn btn-outline-danger btn-sm w-100" 
                        onclick="sortearPedraDuelo(${index}, '${jogador.nome}')">
                        Sortear Pedra
                    </button>
                </div>
            </div>
        `;
        area.appendChild(col);
    });

    atualizarSelectFinal();
}

async function sortearPedraDuelo(index, nomeJogador) {
    try {
        const resp = await fetch(`${API_URL}/sorteio-extra`);
        const data = await resp.json();
        const numero = data.numero;

        empatados[index].pedra = numero;
        document.getElementById(`resultado-duelo-${index}`).textContent = numero;

        enviarParaTV({
            tipo: 'ATUALIZA_DESEMPATE',
            index: index,
            nome: nomeJogador,
            numero: numero
        });

        atualizarSelectFinal(); // Atualiza dropdown com o novo valor
        falarNumero(numero);

    } catch (e) { console.error(e); }
}

function atualizarSelectFinal() {
    const sel = document.getElementById('selectVencedorFinal');
    sel.innerHTML = '';
    empatados.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.text = p.nome + (p.pedra > 0 ? ` (Tirou ${p.pedra})` : '');
        sel.appendChild(opt);
    });
}

function confirmarVitoriaFinal() {
    const id = document.getElementById('selectVencedorFinal').value;
    finalizarNoBackend(id);
}

async function finalizarNoBackend(idVencedor) {
    try {
        const nomeVencedor = dadosPartida.participantes.find(p => p.id == idVencedor)?.nome;

        await fetch(`${API_URL}/partidas/${ID_PARTIDA}/finalizar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vencedorId: Number(idVencedor) })
        });

        enviarParaTV({ tipo: 'VITORIA_FINAL', vencedor: nomeVencedor });

        alert('Partida Finalizada com Sucesso!');
        window.location.href = '../index.html';
    } catch (e) {
        console.error(e);
        alert('Erro ao finalizar.');
    }
}

// --- Utilitários ---

function animarNumeros(elemento, numeroFinal, callback) {
    let interacoes = 0;
    const maxInteracoes = 15;
    const velocidade = 80;

    const loop = setInterval(() => {
        elemento.textContent = Math.floor(Math.random() * 90) + 1;
        interacoes++;
        if (interacoes >= maxInteracoes) {
            clearInterval(loop);
            elemento.textContent = numeroFinal;
            if (callback) callback();
        }
    }, velocidade);
}

function abrirTelaTV() {
    window.open('painel.html', 'BingoTV', 'width=1280,height=720,menubar=no,toolbar=no');
}

function enviarParaTV(payload) {
    channel.postMessage(payload);
}
