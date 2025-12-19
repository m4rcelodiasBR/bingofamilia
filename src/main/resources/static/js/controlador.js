/**
 * Lógica do Painel do Controlador (Admin)
 * Gerencia Jogadores (CRUD) e Configuração da Partida
 */

const API_URL = '/api';
let jogadoresCache = []; // Cache local para facilitar seleção
let jogadorParaEditarId = null;
let jogadorParaExcluirId = null;

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    carregarJogadores();

    // Configura o formulário de cadastro para não recarregar a página
    document.getElementById('formCadastroJogador').addEventListener('submit', function(e) {
        e.preventDefault();
        cadastrarJogador();
    });
});

// ==========================================
// 1. GESTÃO DE JOGADORES (CRUD)
// ==========================================

async function carregarJogadores() {
    const tbody = document.getElementById('listaJogadoresTabela');
    const areaSelecao = document.getElementById('areaSelecaoParticipantes');

    tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Carregando...</td></tr>';

    try {
        const response = await fetch(`${API_URL}/jogadores`);
        if (!response.ok) throw new Error('Erro ao buscar jogadores');

        jogadoresCache = await response.json();

        tbody.innerHTML = '';
        areaSelecao.innerHTML = '';

        if (jogadoresCache.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Nenhum jogador cadastrado.</td></tr>';
            areaSelecao.innerHTML = '<div class="text-muted text-center p-3">Cadastre jogadores para iniciar.</div>';
            return;
        }

        jogadoresCache.forEach(jog => {
            adicionarLinhaTabela(jog, tbody);
            adicionarCheckboxSelecao(jog, areaSelecao);
        });

    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-danger">Erro ao carregar lista.</td></tr>';
    }
}

function adicionarLinhaTabela(jogador, tbody) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td class="ps-3 fw-bold text-players">${jogador.nome}</td>
        <td class="text-center"><span class="badge bg-light text-dark rounded-pill">${jogador.pontuacaoAcumulada}</span></td>
        <td class="text-end pe-3">
            <button class="btn btn-warning btn-sm btn-acao me-1" onclick="abrirModalEditar(${jogador.id}, '${jogador.nome}')" title="Editar">
                <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="btn btn-danger btn-sm btn-acao" onclick="abrirModalExcluir(${jogador.id})" title="Excluir">
                <i class="fa-regular fa-trash-can"></i>
            </button>
        </td>
    `;
    tbody.appendChild(tr);
}

function adicionarCheckboxSelecao(jogador, container) {
    const div = document.createElement('div');
    div.className = 'form-check mb-2';
    div.innerHTML = `
        <input class="form-check-input check-participante" type="checkbox" value="${jogador.id}" id="check_jog_${jogador.id}">
        <label class="form-check-label d-flex justify-content-between pe-3" for="check_jog_${jogador.id}">
            <span>${jogador.nome}</span>
            <span class="badge bg-warning text-dark">${jogador.pontuacaoAcumulada} pts</span>
        </label>
    `;
    container.appendChild(div);
}

// --- CADASTRAR ---
async function cadastrarJogador() {
    const inputNome = document.getElementById('nomeJogador');
    const nome = inputNome.value.trim();
    if (!nome) return;

    try {
        const response = await fetch(`${API_URL}/jogadores`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome: nome })
        });

        if (!response.ok) {
            const erro = await response.json();
            alert("Erro: " + (erro.message || "Falha ao cadastrar"));
            return;
        }

        // Sucesso
        inputNome.value = '';
        carregarJogadores(); // Recarrega a lista

    } catch (e) {
        console.error(e);
        alert("Erro de conexão com o servidor.");
    }
}

// --- EDITAR ---
function abrirModalEditar(id, nomeAtual) {
    jogadorParaEditarId = id;
    document.getElementById('editIdJogador').value = id;
    document.getElementById('editNomeJogador').value = nomeAtual;

    const modal = new bootstrap.Modal(document.getElementById('modalEditar'));
    modal.show();
}

async function salvarEdicaoJogador() {
    const novoNome = document.getElementById('editNomeJogador').value.trim();
    if (!novoNome) return alert("Nome não pode ser vazio");

    try {
        const response = await fetch(`${API_URL}/jogadores/${jogadorParaEditarId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome: novoNome })
        });

        if (!response.ok) {
            const erro = await response.json();
            alert("Erro: " + (erro.message || "Falha ao editar"));
            return;
        }

        const modalEl = document.getElementById('modalEditar');
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();
        carregarJogadores();

    } catch (e) {
        console.error(e);
        alert("Erro ao editar.");
    }
}

// --- EXCLUIR ---
function abrirModalExcluir(id) {
    jogadorParaExcluirId = id;
    const modal = new bootstrap.Modal(document.getElementById('modalExcluir'));
    modal.show();
}

async function confirmarExclusaoJogador() {
    if (!jogadorParaExcluirId) return;

    try {
        const response = await fetch(`${API_URL}/jogadores/${jogadorParaExcluirId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            alert("Não foi possível excluir o jogador.");
            return;
        }

        // Fecha modal e recarrega
        const modalEl = document.getElementById('modalExcluir');
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();
        carregarJogadores();

    } catch (e) {
        console.error(e);
        alert("Erro ao excluir.");
    }
}

// ==========================================
// 2. CONFIGURAÇÃO DA PARTIDA
// ==========================================

function selecionarTodos(marcar) {
    document.querySelectorAll('.check-participante').forEach(ck => ck.checked = marcar);
}

async function iniciarPartida() {
    const btn = document.getElementById('btnIniciar');
    const tipoJogo = document.querySelector('input[name="tipoJogo"]:checked').value;
    const regraVitoria = document.getElementById('selectRegra').value;
    const checkboxes = document.querySelectorAll('.check-participante:checked');
    const participantesIds = Array.from(checkboxes).map(ck => Number(ck.value));

    if (participantesIds.length < 2) {
        alert("Selecione pelo menos 2 jogadores para iniciar!");
        return;
    }

    btn.disabled = true;
    const textoOriginal = btn.textContent;
    btn.textContent = "Iniciando...";

    try {
        const payload = {
            tipo: tipoJogo,
            regraVitoria: regraVitoria,
            participantes: participantesIds
        };

        const response = await fetch(`${API_URL}/partidas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const partida = await response.json();
            window.location.href = `jogo.html?id=${partida.id}`;
        } else {
            const erro = await response.json();
            alert("Erro ao iniciar: " + (erro.message || "Desconhecido"));
            btn.disabled = false;
            btn.textContent = textoOriginal;
        }

    } catch (e) {
        console.error(e);
        alert("Erro de conexão com o servidor.");
        btn.disabled = false;
        btn.textContent = textoOriginal;
    }
}