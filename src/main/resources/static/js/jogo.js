const API_URL = '/api';
const params = new URLSearchParams(window.location.search);
const ID_PARTIDA = params.get('id');
const channel = new BroadcastChannel('bingo_channel');

let dadosPartida = null;
let maxNumeros = 75;
let empatados = [];
let ultimaLetra = "";
let ultimoNumero = "";

document.addEventListener('DOMContentLoaded', () => {
    if (!ID_PARTIDA) return alert('ID inválido');
    document.getElementById('partidaIdDisplay').textContent = ID_PARTIDA.padStart(4, '0');
    carregarDadosIniciais();
});

async function carregarDadosIniciais() {
    try {
        const response = await fetch(`${API_URL}/partidas/${ID_PARTIDA}`);
        if (!response.ok) throw new Error('Erro api');
        dadosPartida = await response.json();

        maxNumeros = (dadosPartida.tipoJogo === 'BINGO_90') ? 90 : 75;
        gerarTabuleiroColunas(maxNumeros);

        const lista = dadosPartida.numerosSorteados || [];
        atualizarTabuleiro(lista);
    } catch (e) { console.error(e); }
}

function gerarTabuleiroColunas(total) {
    const grid = document.getElementById('tabuleiroGrid');
    grid.innerHTML = '';
    const letras = ['B', 'I', 'N', 'G', 'O'];
    const porColuna = total / 5;

    letras.forEach((letra, index) => {
        const colDiv = document.createElement('div');
        colDiv.className = `coluna-admin col-${letra.toLowerCase()}`;

        const header = document.createElement('div');
        header.className = 'cabecalho-admin';
        header.textContent = letra;
        colDiv.appendChild(header);

        const corpo = document.createElement('div');
        corpo.className = 'corpo-admin';

        const inicio = (index * porColuna) + 1;
        const fim = (index + 1) * porColuna;

        for (let i = inicio; i <= fim; i++) {
            const bola = document.createElement('div');
            bola.className = 'bola-admin';
            bola.id = `bola-${i}`;
            bola.textContent = i;
            corpo.appendChild(bola);
        }
        colDiv.appendChild(corpo);
        grid.appendChild(colDiv);
    });
}

async function realizarSorteio() {
    const btn = document.getElementById('btnSortear');
    btn.disabled = true;

    try {
        // Dispara animação na TV (2.5s)
        enviarParaTV({ tipo: 'INICIO_SORTEIO', maxNumeros: maxNumeros });

        const response = await fetch(`${API_URL}/partidas/${ID_PARTIDA}/sortear`, { method: 'POST' });
        if (response.ok) {
            const data = await response.json();
            const numeroFinal = data.ultimoNumero;
            const letra = data.letra || calcularLetraFallback(numeroFinal);

            // Inicia animação local sincronizada
            animarDisplayAdmin(document.getElementById('numeroSorteado'), () => {

                // --- PÓS ANIMAÇÃO (aprox 2.5s depois) ---

                // Atualiza dados e tabuleiro
                if(data.partida) dadosPartida = data.partida;
                else {
                    if(!dadosPartida.numerosSorteados) dadosPartida.numerosSorteados = [];
                    dadosPartida.numerosSorteados.push(numeroFinal);
                }

                atualizarTabuleiro(dadosPartida.numerosSorteados);
                atualizarDisplayDestaque(numeroFinal, letra);

                // Envia dados finais para TV (revela o número)
                enviarParaTV({
                    tipo: 'ATUALIZACAO',
                    ultimoNumero: numeroFinal,
                    numerosSorteados: dadosPartida.numerosSorteados,
                    letra: letra,
                    partida: dadosPartida
                });

                // Narração com pausa dramática
                falarComPausa(letra, numeroFinal);

                btn.disabled = false;
            });

        } else {
            const erro = await response.json();
            if (erro.message && erro.message.toLowerCase().includes("todos")) {
                alert("🚨 FIM DE JOGO! Globo vazio.");
            }
            btn.disabled = false;
        }
    } catch (e) { console.error(e); btn.disabled = false; }
}

// Animação ajustada para durar ~2.5 segundos (igual TV)
function animarDisplayAdmin(elemento, callback) {
    let count = 0;
    const maxLoops = 50; // 50 * 50ms = 2500ms
    const loop = setInterval(() => {
        elemento.textContent = Math.floor(Math.random() * maxNumeros) + 1;
        count++;
        if(count >= maxLoops) {
            clearInterval(loop);
            if(callback) callback();
        }
    }, 50);
}

// Nova função de voz com pausa
function falarComPausa(letra, numero) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();

        ultimaLetra = letra;
        ultimoNumero = numero;

        // 1. Fala a Letra
        const msgLetra = new SpeechSynthesisUtterance(`Letra... ${letra}`);
        msgLetra.lang = 'pt-BR';
        msgLetra.rate = 1.0;

        // 2. Quando terminar a letra, espera um pouco e fala o número
        msgLetra.onend = () => {
            setTimeout(() => {
                const msgNum = new SpeechSynthesisUtterance(`Número... ${numero}`);
                msgNum.lang = 'pt-BR';
                msgNum.rate = 1.0;
                window.speechSynthesis.speak(msgNum);
            }, 800); // 800ms de silêncio
        };

        window.speechSynthesis.speak(msgLetra);
    }
}

function repetirUltimaFala() {
    if (ultimaLetra && ultimoNumero) falarComPausa(ultimaLetra, ultimoNumero);
}

function calcularLetraFallback(numero) {
    if(!numero) return "";
    const colunas = maxNumeros === 90 ? 18 : 15;
    const i = Math.floor((numero - 1) / colunas);
    return ['B','I','N','G','O'][i] || "";
}

function atualizarTabuleiro(lista) {
    document.getElementById('contadorSorteados').textContent = lista.length;
    document.querySelectorAll('.bola-admin.ultimo').forEach(el => el.classList.remove('ultimo'));
    lista.forEach(num => {
        const el = document.getElementById(`bola-${num}`);
        if(el) {
            el.classList.add('marcado');
            if(num === lista[lista.length-1]) el.classList.add('ultimo');
        }
    });
}

function atualizarDisplayDestaque(numero, letra) {
    document.getElementById('numeroSorteado').textContent = numero;
    document.getElementById('letraSorteada').textContent = letra;
    document.getElementById('legendaNumero').textContent = `Sorteado: ${letra} - ${numero}`;
}

// Funções de Utilitários e Desempate (Mantidas do original)
function abrirTelaTV() { window.open('painel.html', 'BingoTV', 'width=1280,height=720,menubar=no,toolbar=no'); }
function enviarParaTV(payload) { channel.postMessage(payload); }

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
            label.innerHTML = `<input class="form-check-input check-vencedor" type="checkbox" value="${p.id}" data-nome="${p.nome}"><span>${p.nome}</span>`;
            lista.appendChild(label);
        });
    }
    modal.show();
}

function verificarEmpate() {
    const checks = document.querySelectorAll('.check-vencedor:checked');
    if (checks.length === 0) return alert("Selecione um jogador.");
    empatados = Array.from(checks).map(ck => ({ id: ck.value, nome: ck.getAttribute('data-nome'), pedra: 0 }));
    if (empatados.length === 1) finalizarNoBackend(empatados[0].id);
    else iniciarModoDesempate();
}

function iniciarModoDesempate() {
    document.getElementById('faseSelecao').classList.add('d-none');
    document.getElementById('faseDesempate').classList.remove('d-none');
    const area = document.getElementById('areaDuelo');
    area.innerHTML = '';
    enviarParaTV({ tipo: 'INICIO_DESEMPATE', jogadores: empatados });
    empatados.forEach((p, i) => {
        area.innerHTML += `<div class="col-4"><div class="card p-3"><h5>${p.nome}</h5><h2 id="res-${i}">--</h2><button class="btn btn-danger btn-sm" onclick="sortearPedraDuelo(${i}, '${p.nome}')">Sortear</button></div></div>`;
    });
    atualizarSelectFinal();
}
async function sortearPedraDuelo(idx, nome) {
    const resp = await fetch(`${API_URL}/sorteio-extra`);
    const data = await resp.json();
    empatados[idx].pedra = data.numero;
    document.getElementById(`res-${idx}`).textContent = data.numero;
    enviarParaTV({tipo: 'ATUALIZA_DESEMPATE', index: idx, numero: data.numero});
    // Voz no duelo pode ser direta
    const msg = new SpeechSynthesisUtterance(`Número ${data.numero}`);
    window.speechSynthesis.speak(msg);
    atualizarSelectFinal();
}
function atualizarSelectFinal() {
    const sel = document.getElementById('selectVencedorFinal');
    sel.innerHTML = '';
    empatados.forEach(p => { const o = document.createElement('option'); o.value=p.id; o.text=`${p.nome} (${p.pedra})`; sel.appendChild(o); });
}
function confirmarVitoriaFinal() { finalizarNoBackend(document.getElementById('selectVencedorFinal').value); }
async function finalizarNoBackend(id) {
    const nome = dadosPartida.participantes.find(p=>p.id==id)?.nome;
    await fetch(`${API_URL}/partidas/${ID_PARTIDA}/finalizar`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({vencedorId:Number(id)})});
    enviarParaTV({tipo:'VITORIA_FINAL', vencedor:nome});
    alert('Fim de Jogo!'); window.location.href='../index.html';
}