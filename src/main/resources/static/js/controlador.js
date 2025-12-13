/**
 * Script do Controlador
 * Gerencia cadastro de jogadores e início de partidas.
 */
const API_URL = '/api';

document.addEventListener('DOMContentLoaded', () => {
    carregarJogadores();

    document.getElementById('formCadastroJogador').addEventListener('submit', async (e) => {
        e.preventDefault();
        await cadastrarJogador();
    });
});

/**
 * Busca jogadores no backend e atualiza as duas listas na tela
 * (Lista de visualização e Lista de seleção para partida)
 */
async function carregarJogadores() {
    try {
        const response = await fetch(`${API_URL}/jogadores`);
        const jogadores = await response.json();

        atualizarInterface(jogadores);
    } catch (error) {
        console.error('Erro ao carregar jogadores:', error);
        alert('Erro ao conectar com o servidor. Verifique se o backend está rodando.');
    }
}

/**
 * Renderiza o HTML com base nos dados recebidos
 */
function atualizarInterface(jogadores) {
    const displayList = document.getElementById('listaJogadoresDisplay');
    const selecaoArea = document.getElementById('areaSelecaoParticipantes');

    // Limpa conteúdo atual
    displayList.innerHTML = '';
    selecaoArea.innerHTML = '';

    if (jogadores.length === 0) {
        displayList.innerHTML = '<div class="list-group-item text-muted">Nenhum jogador cadastrado.</div>';
        selecaoArea.innerHTML = '<span class="text-muted">Nenhum jogador disponível.</span>';
        return;
    }

    // Preenche as listas
    jogadores.forEach(jogador => {
        // 1. Lista lateral (apenas visualização)
        const itemDisplay = document.createElement('div');
        itemDisplay.className = 'list-group-item d-flex justify-content-between align-items-center';
        itemDisplay.innerHTML = `
            <span>${jogador.nome}</span>
            <span class="badge bg-secondary rounded-pill">${jogador.pontuacaoAcumulada} pts</span>
        `;
        displayList.appendChild(itemDisplay);

        // 2. Área de Checkboxes (para criar partida)
        const labelCheck = document.createElement('label');
        labelCheck.className = 'd-block mb-2 pointer';
        labelCheck.innerHTML = `
            <input type="checkbox" class="form-check-input me-2 participante-check" value="${jogador.id}">
            ${jogador.nome}
        `;
        selecaoArea.appendChild(labelCheck);
    });
}

/**
 * Envia novo jogador para o Backend
 */
async function cadastrarJogador() {
    const inputNome = document.getElementById('nomeJogador');
    const nome = inputNome.value;

    try {
        const response = await fetch(`${API_URL}/jogadores`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome: nome })
        });

        if (response.ok) {
            inputNome.value = ''; // Limpa campo
            carregarJogadores(); // Recarrega lista
        } else {
            alert('Erro ao cadastrar. Talvez o nome já exista?');
        }
    } catch (error) {
        console.error('Erro:', error);
    }
}

/**
 * Coleta dados e inicia a partida
 */
async function iniciarPartida() {

    const tipoJogo = document.querySelector('input[name="tipoJogo"]:checked').value;
    const checkboxes = document.querySelectorAll('.participante-check:checked');
    const participantesIds = Array.from(checkboxes).map(cb => Number(cb.value));

    if (participantesIds.length === 0) {
        alert("Selecione pelo menos um jogador para iniciar!");
        return;
    }

    const payload = {
        tipo: tipoJogo,
        participantes: participantesIds
    };

    try {
        const response = await fetch(`${API_URL}/partidas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const partida = await response.json();
            window.location.href = `jogo.html?id=${partida.id}`;
        } else {
            const erro = await response.json(); // Tenta pegar msg de erro do backend
            alert('Erro ao criar partida: ' + (erro.message || 'Erro desconhecido'));
        }
    } catch (error) {
        console.error('Erro de requisição:', error);
        alert('Falha ao iniciar partida.');
    }
}

function selecionarTodos(marcar) {
    document.querySelectorAll('.participante-check')
        .forEach(ck => ck.checked = marcar);
}