document.addEventListener('DOMContentLoaded', async () => {
    const tbody = document.getElementById('tabelaHistorico');
    try {
        const res = await fetch('/api/partidas'); // Busca do backend
        const partidas = await res.json();

        tbody.innerHTML = '';
        if(partidas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Nenhuma partida registrada.</td></tr>';
            return;
        }

        partidas.forEach(p => {
            const dataFormatada = new Date(p.dataInicio).toLocaleString('pt-BR');
            const vencedor = p.vencedor ? `<span class="badge bg-warning text-dark"><i class="fa-regular fa-trophy-star pe-1"></i> ${p.vencedor.nome}</span>` : '<span class="text-muted">-</span>';
            const duracao = p.duracaoEmSegundos ? formatarDuracao(p.duracaoEmSegundos) : '-';

            let status = '<span class="badge bg-success">Finalizada</span>';
            if (!p.dataFim) {
                status = '<span class="badge bg-danger">Abandonada</span>';
            }

            const qtdPedras = p.numerosSorteados ? p.numerosSorteados.length : 0;

            const numerosStr = (p.numerosSorteados && p.numerosSorteados.length > 0)
                ? p.numerosSorteados.join(', ')
                : '-';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                    <td class="fw-bold">${p.id}</td>
                    <td>${dataFormatada}</td>
                    <td><span class="badge bg-info text-dark">${p.tipoJogo === 'BINGO_90' ? '90 Bolas' : '75 Bolas'}</span></td>
                    <td>${vencedor}</td>
                    <td>${duracao}</td>
                    <td class="text-center fw-bold text-primary">${qtdPedras}</td>
                    <td><div class="coluna-numeros">${numerosStr}</div></td>
                    <td>${status}</td>
                `;
            tbody.appendChild(tr);
        });

    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Erro ao carregar histórico.</td></tr>';
    }
});

function formatarDuracao(segundos) {
    const m = Math.floor(segundos / 60);
    const s = segundos % 60;
    return `${m}m ${s}s`;
}