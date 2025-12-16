async function carregarRanking() {
    try {
        const response = await fetch('/api/ranking');
        const jogadores = await response.json();

        const container = document.getElementById('lista');
        container.innerHTML = '';

        if (jogadores.length === 0) {
            container.innerHTML = '<div class="text-center text-muted" style="grid-column: span 2; padding: 2rem; font-size: 2rem;">Nenhum jogador pontuou ainda.</div>';
            return;
        }

        const top10 = jogadores.slice(0, 10);

        top10.forEach((jog, index) => {
            const div = document.createElement('div');
            let classePos = '';
            let icone = `#${index + 1}`;

            // Ícones para o pódio
            if (index === 0) { classePos = 'pos-1'; icone = '🥇 1º'; }
            else if (index === 1) { classePos = 'pos-2'; icone = '🥈 2º'; }
            else if (index === 2) { classePos = 'pos-3'; icone = '🥉 3º'; }
            else { icone = `${index + 1}º`; }

            div.className = `item-ranking ${classePos} animar-entrada`;
            // Delay escalonado para animação bonita (0.1s, 0.2s, etc)
            div.style.animationDelay = `${index * 0.05}s`;

            div.innerHTML = `
                        <div class="nome-container">
                            <span class="posicao">${icone}</span>
                            <span class="nome" title="${jog.nome}">${jog.nome}</span>
                        </div>
                        <div class="pontos">${jog.pontuacaoAcumulada} pts</div>
                    `;
            container.appendChild(div);
        });
    } catch (error) {
        console.error("Erro ao buscar ranking:", error);
    }
}

carregarRanking();
setInterval(carregarRanking, 5000);