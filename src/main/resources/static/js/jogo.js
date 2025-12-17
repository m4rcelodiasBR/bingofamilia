/**
 * Lógica da Tela de Jogo (Operador)
 */

const API_URL = '/api';
const params = new URLSearchParams(window.location.search);
const ID_PARTIDA = params.get('id');
const channel = new BroadcastChannel('bingo_channel');

let dadosPartida = null;
let maxNumeros = 75;
let empatados = [];
let ultimaLetra = "";
let ultimoNumero = "";
let intervaloCronometroAdmin = null;

let vozesDisponiveis = [];
if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => {
        vozesDisponiveis = window.speechSynthesis.getVoices();
    };
}

function obterMelhorVoz() {
    if (vozesDisponiveis.length === 0) {
        vozesDisponiveis = window.speechSynthesis.getVoices();
    }

    let voz = vozesDisponiveis.find(v => v.name === 'Google português do Brasil');

    if (!voz) {
        voz = vozesDisponiveis.find(v => v.name.includes("Natural") && v.lang.includes("pt-BR"));
    }

    if (!voz) {
        voz = vozesDisponiveis.find(v => v.lang.includes("pt-BR"));
    }

    return voz;
}

//Ação de sortear pelo teclado (Barra de espaço ou Enter)
document.addEventListener('keydown', function(event) {
    if (event.code === 'Space' || event.code === 'Enter') {
        event.preventDefault();
        const btnSortear = document.getElementById('btnSortear');

        if (btnSortear && !btnSortear.disabled) {
            btnSortear.click();
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    if (!ID_PARTIDA) return alert('ID inválido');
    document.getElementById('partidaIdDisplay').textContent = ID_PARTIDA.padStart(4, '0');
    carregarDadosIniciais();
});

function abrirTelaRanking() {
    window.open('ranking.html', 'RankingBingo', 'width=1000,height=800,menubar=no,toolbar=no,location=no');
}

channel.onmessage = (event) => {
    if (event.data.tipo === 'TV_CONECTADA') {
        console.log("📡 TV conectou. Enviando dados de sincronia...");
        enviarSyncParaTV();
    }
};

async function carregarDadosIniciais() {
    try {
        const response = await fetch(`${API_URL}/partidas/${ID_PARTIDA}`);
        if (!response.ok) throw new Error('Erro api');
        dadosPartida = await response.json();

        console.log("📊 Dados da Partida carregados:", dadosPartida);

        maxNumeros = (dadosPartida.tipoJogo === 'BINGO_90') ? 90 : 75;
        gerarTabuleiroColunas(maxNumeros);

        const lista = dadosPartida.numerosSorteados || [];
        atualizarTabuleiro(lista);

        // Cronômetro
        if (dadosPartida.dataInicio) {
            console.log("⏱ Iniciando cronômetro com data:", dadosPartida.dataInicio);
            iniciarCronometroAdmin(dadosPartida.dataInicio);
        } else {
            console.warn("⚠️ Partida sem dataInicio! Cronômetro não vai rodar.");
        }

        enviarSyncParaTV();

    } catch (e) { console.error(e); }
}

function enviarSyncParaTV() {
    if (!dadosPartida) return;
    const ultimo = dadosPartida.numerosSorteados && dadosPartida.numerosSorteados.length > 0
        ? dadosPartida.numerosSorteados[dadosPartida.numerosSorteados.length - 1]
        : null;

    channel.postMessage({
        tipo: 'SYNC_INICIAL',
        partida: dadosPartida, // Aqui vai a dataInicio para a TV
        maxNumeros: maxNumeros,
        ultimoNumero: ultimo,
        letra: ultimo ? calcularLetraFallback(ultimo) : null
    });
}

function gerarTabuleiroColunas(total) {
    const grid = document.getElementById('tabuleiroGrid');
    grid.innerHTML = '';
    const letras = ['B', 'I', 'N', 'G', 'O'];
    const porColuna = total / 5;

    letras.forEach((letra, index) => {
        const colDiv = document.createElement('div');
        colDiv.className = `coluna-admin col-${letra.toLowerCase()}`;
        colDiv.innerHTML = `<div class="cabecalho-admin">${letra}</div><div class="corpo-admin"></div>`;
        const corpo = colDiv.querySelector('.corpo-admin');

        const inicio = (index * porColuna) + 1;
        const fim = (index + 1) * porColuna;

        for (let i = inicio; i <= fim; i++) {
            const bola = document.createElement('div');
            bola.className = 'bola-admin';
            bola.id = `bola-${i}`;
            bola.textContent = i;
            corpo.appendChild(bola);
        }
        grid.appendChild(colDiv);
    });
}

async function realizarSorteio() {
    const btn = document.getElementById('btnSortear');
    btn.disabled = true;

    try {
        enviarParaTV({ tipo: 'INICIO_SORTEIO', maxNumeros: maxNumeros });

        const response = await fetch(`${API_URL}/partidas/${ID_PARTIDA}/sortear`, { method: 'POST' });
        if (response.ok) {
            const data = await response.json();
            const numeroFinal = data.ultimoNumero;
            const letra = data.letra || calcularLetraFallback(numeroFinal);

            animarDisplayAdmin(document.getElementById('numeroSorteado'), () => {
                if(data.partida) dadosPartida = data.partida;
                else {
                    if(!dadosPartida.numerosSorteados) dadosPartida.numerosSorteados = [];
                    dadosPartida.numerosSorteados.push(numeroFinal);
                }

                atualizarTabuleiro(dadosPartida.numerosSorteados);
                atualizarDisplayDestaque(numeroFinal, letra);

                enviarParaTV({
                    tipo: 'ATUALIZACAO',
                    ultimoNumero: numeroFinal,
                    numerosSorteados: dadosPartida.numerosSorteados,
                    letra: letra,
                    partida: dadosPartida
                });

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

function iniciarCronometroAdmin(dataInicioRaw) {
    if (intervaloCronometroAdmin) clearInterval(intervaloCronometroAdmin);
    const elTempo = document.getElementById('tempoDecorridoAdmin');

    // Log para depurar o que está vindo do backend
    console.log("Recebido dataInicio para cronômetro:", dataInicioRaw);

    const start = tratarData(dataInicioRaw);
    if (!start) {
        console.warn("Data inválida ou nula. Cronômetro parado.");
        return;
    }

    intervaloCronometroAdmin = setInterval(() => {
        const now = new Date().getTime();
        const diff = now - start;

        if (diff < 0) { elTempo.innerText = "00:00"; return; }

        const totalSeconds = Math.floor(diff / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        elTempo.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

// --- UTILITÁRIOS ---
function tratarData(dataRaw) {
    if (!dataRaw) return null;
    if (Array.isArray(dataRaw)) {
        const ano = dataRaw[0];
        const mes = dataRaw[1] - 1;
        const dia = dataRaw[2];
        const hora = dataRaw[3] || 0;
        const min = dataRaw[4] || 0;
        const seg = dataRaw[5] || 0;
        return new Date(ano, mes, dia, hora, min, seg).getTime();
    }
    return new Date(dataRaw).getTime();
}

function animarDisplayAdmin(elemento, callback) {
    let count = 0;
    const loop = setInterval(() => {
        elemento.textContent = Math.floor(Math.random() * maxNumeros) + 1;
        count++;
        if(count >= 50) {
            clearInterval(loop);
            if(callback) callback();
        }
    }, 50);
}

function falarComPausa(letra, numero) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        ultimaLetra = letra;
        ultimoNumero = numero;

        const vozEscolhida = obterMelhorVoz();

        const msgLetra = new SpeechSynthesisUtterance(`Letra... ${letra}`);
        msgLetra.lang = 'pt-BR';
        if (vozEscolhida) msgLetra.voice = vozEscolhida;

        // --- ANIMAÇÃO DA VOZ ---
        msgLetra.pitch = 1.0; // 1.0 é o normal. 1.2 é um pouco mais agudo (mais "alegre")
        msgLetra.rate = 1.2;  // 1.0 é o normal. 1.1 é um pouquinho mais rápido e dinâmico

        msgLetra.onend = () => {
            setTimeout(() => {
                // Configuração da narração do Número
                const msgNum = new SpeechSynthesisUtterance(`Número... ${numero}!`);
                msgNum.lang = 'pt-BR';
                if (vozEscolhida) msgNum.voice = vozEscolhida;

                msgNum.pitch = 1.0;
                msgNum.rate = 1.2;

                window.speechSynthesis.speak(msgNum);
            }, 600);
        };

        window.speechSynthesis.speak(msgLetra);
    }
}

function repetirUltimaFala() {
    if(ultimaLetra && ultimoNumero) falarComPausa(ultimaLetra, ultimoNumero);
}

function calcularLetraFallback(numero) {
    if(!numero) return "";
    const i = Math.floor((numero - 1) / (maxNumeros === 90 ? 18 : 15));
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

function abrirTelaTV() {
    window.open('painel.html', 'BingoTV', 'width=1280,height=720,menubar=no,toolbar=no');
}

function enviarParaTV(payload) {
    channel.postMessage(payload);
}

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

async function anularPartidaAtual() {
    if (!confirm("⚠️ ATENÇÃO!\n\nIsso irá EXCLUIR esta partida permanentemente.\nNenhum vencedor será salvo.\n\nDeseja continuar?")) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/partidas/${ID_PARTIDA}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert("Partida anulada e removida do histórico.");
            window.location.href = 'controlador.html';
        } else {
            alert("Erro ao anular partida.");
        }
    } catch (e) {
        console.error(e);
        alert("Erro de conexão.");
    }
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
    const msg = new SpeechSynthesisUtterance(`Número ${data.numero}`);
    window.speechSynthesis.speak(msg);
    atualizarSelectFinal();
}

function atualizarSelectFinal() {
    const sel = document.getElementById('selectVencedorFinal');
    sel.innerHTML = '';
    empatados.forEach(p => { const o = document.createElement('option'); o.value=p.id; o.text=`${p.nome} (${p.pedra})`; sel.appendChild(o); });
}

function confirmarVitoriaFinal() {
    finalizarNoBackend(document.getElementById('selectVencedorFinal').value);
}

async function finalizarNoBackend(id) {
    const nome = dadosPartida.participantes.find(p=>p.id==id)?.nome;
    await fetch(`${API_URL}/partidas/${ID_PARTIDA}/finalizar`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
            vencedorId:Number(id)}
        )});
    enviarParaTV({
        tipo:'VITORIA_FINAL',
        vencedor:nome
    });
    alert('Fim de Jogo!');
    window.location.href = 'controlador.html';
}

// Expor funções para o HTML (onclick)
window.realizarSorteio = realizarSorteio;
window.repetirUltimaFala = repetirUltimaFala;
window.abrirTelaTV = abrirTelaTV;
window.abrirTelaRanking = abrirTelaRanking;
window.encerrarPartida = encerrarPartida;
window.verificarEmpate = verificarEmpate;
window.confirmarVitoriaFinal = confirmarVitoriaFinal;
window.sortearPedraDuelo = sortearPedraDuelo;
window.anularPartidaAtual = anularPartidaAtual;