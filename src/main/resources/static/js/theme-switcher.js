const STORAGE_KEY = 'bingo_theme_preference';

function aplicarTemaInicial() {
    const temaSalvo = localStorage.getItem(STORAGE_KEY);
    if (temaSalvo) {
        document.documentElement.setAttribute('data-theme', temaSalvo);
    }
}

function mudarTema(nomeTema) {
    if (nomeTema === 'default') {
        document.documentElement.removeAttribute('data-theme');
        localStorage.removeItem(STORAGE_KEY);
    } else {
        document.documentElement.setAttribute('data-theme', nomeTema);
        localStorage.setItem(STORAGE_KEY, nomeTema);
    }
}

aplicarTemaInicial();