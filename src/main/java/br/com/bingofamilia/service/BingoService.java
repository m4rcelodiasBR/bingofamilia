package br.com.bingofamilia.service;

import br.com.bingofamilia.domain.Jogador;
import br.com.bingofamilia.domain.Partida;
import br.com.bingofamilia.domain.TipoJogo;
import br.com.bingofamilia.exception.JogoException;
import br.com.bingofamilia.repository.JogadorRepository;
import br.com.bingofamilia.repository.PartidaRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class BingoService {

    private final PartidaRepository partidaRepository;
    private final JogadorRepository jogadorRepository;
    private final SecureRandom secureRandom = new SecureRandom();
    private static final int PONTOS_VITORIA = 3;

    public BingoService(PartidaRepository partidaRepository, JogadorRepository jogadorRepository) {
        this.partidaRepository = partidaRepository;
        this.jogadorRepository = jogadorRepository;
    }

    /**
     * Cria ou Reativa jogador.
     * Se o nome já existir e estiver inativo -> Reativa.
     * Se já existir e estiver ativo -> Erro.
     */
    @Transactional
    public Jogador criarJogador(String nome) {
        if (nome == null || nome.trim().isEmpty()) {
            throw new JogoException("Nome do jogador não pode ser vazio.");
        }
        String nomeLimpo = nome.trim();

        Optional<Jogador> existente = jogadorRepository.findByNomeIgnoreCase(nomeLimpo);

        if (existente.isPresent()) {
            Jogador jog = existente.get();
            if (jog.isAtivo()) {
                throw new JogoException("Já existe um jogador ativo com o nome: " + nomeLimpo);
            } else {
                jog.setAtivo(true);
                return jogadorRepository.save(jog);
            }
        }

        return jogadorRepository.save(new Jogador(nomeLimpo));
    }

    /**
     * Atualiza apenas o nome do jogador.
     */
    @Transactional
    public Jogador atualizarJogador(Long id, String novoNome) {
        if (novoNome == null || novoNome.trim().isEmpty()) throw new JogoException("Nome inválido");

        Jogador jogador = jogadorRepository.findById(id)
                .orElseThrow(() -> new JogoException("Jogador não encontrado"));

        Optional<Jogador> outro = jogadorRepository.findByNomeIgnoreCase(novoNome.trim());
        if (outro.isPresent() && !outro.get().getId().equals(id)) {
            throw new JogoException("Este nome já está em uso por outro jogador.");
        }

        jogador.setNome(novoNome.trim());
        return jogadorRepository.save(jogador);
    }

    /**
     * Realiza a Exclusão Lógica (Soft Delete).
     */
    @Transactional
    public void inativarJogador(Long id) {
        Jogador jogador = jogadorRepository.findById(id)
                .orElseThrow(() -> new JogoException("Jogador não encontrado"));
        jogador.setAtivo(false);
        jogadorRepository.save(jogador);
    }

    public List<Jogador> listarJogadoresAtivos() {
        return jogadorRepository.findByAtivoTrueOrderByPontuacaoAcumuladaDesc();
    }

    public List<Jogador> listarRanking() {
        return jogadorRepository.findAllByOrderByPontuacaoAcumuladaDesc();
    }

    @Transactional
    public Partida iniciarNovaPartida(TipoJogo tipoJogo, List<Long> idsJogadoresParticipantes) {
        Partida partida = new Partida();
        partida.setTipoJogo(tipoJogo);
        partida.setDataInicio(LocalDateTime.now());

        if (idsJogadoresParticipantes != null && !idsJogadoresParticipantes.isEmpty()) {
            List<Jogador> jogadores = jogadorRepository.findAllById(idsJogadoresParticipantes);
            if (jogadores.isEmpty()) throw new JogoException("Nenhum jogador encontrado.");
            partida.getParticipantes().addAll(jogadores);
        } else {
            throw new JogoException("Selecione participantes.");
        }
        return partidaRepository.save(partida);
    }

    @Transactional
    public Integer realizarSorteio(Long partidaId) {
        Partida partida = buscarPartidaPorId(partidaId);
        validarStatusPartida(partida);

        int maximo = (partida.getTipoJogo() == TipoJogo.BINGO_90) ? 90 : 75;
        List<Integer> sorteados = partida.getNumerosSorteados();

        if (sorteados.size() >= maximo) {
            throw new JogoException("Todos os números já foram sorteados.");
        }

        int novoNumero;
        do {
            novoNumero = secureRandom.nextInt(maximo) + 1;
        } while (sorteados.contains(novoNumero));

        partida.getNumerosSorteados().add(novoNumero);
        Partida salva = partidaRepository.save(partida);

        List<Integer> listaAtualizada = salva.getNumerosSorteados();
        return listaAtualizada.get(listaAtualizada.size() - 1);
    }

    @Transactional
    public Partida finalizarPartidaComVencedor(Long partidaId, Long idVencedor) {
        Partida partida = buscarPartidaPorId(partidaId);
        validarStatusPartida(partida);

        Jogador vencedor = jogadorRepository.findById(idVencedor)
                .orElseThrow(() -> new JogoException("Vencedor não encontrado."));

        if (!partida.getParticipantes().contains(vencedor)) {
            throw new JogoException("O vencedor não participou desta partida.");
        }

        LocalDateTime agora = LocalDateTime.now();
        partida.setDataFim(agora);
        long duracao = Duration.between(partida.getDataInicio(), agora).getSeconds();
        partida.setDuracaoEmSegundos(duracao);
        partida.setVencedor(vencedor);

        vencedor.setPontuacaoAcumulada(vencedor.getPontuacaoAcumulada() + PONTOS_VITORIA);
        jogadorRepository.save(vencedor);

        return partidaRepository.save(partida);
    }

    public List<Partida> listarHistoricoPartidas() {
        return partidaRepository.findAll(Sort.by(Sort.Direction.DESC, "dataInicio"));
    }

    @Transactional
    public void anularPartida(Long id) {
        if (partidaRepository.existsById(id)) {
            partidaRepository.deleteById(id);
        }
    }

    public Partida obterDadosPartida(Long id) {
        return buscarPartidaPorId(id);
    }

    public Integer sortearPedraMaior() {
        return secureRandom.nextInt(100) + 1;
    }

    private Partida buscarPartidaPorId(Long id) {
        return partidaRepository.findById(id).orElseThrow(() -> new JogoException("Partida não encontrada: " + id));
    }

    private void validarStatusPartida(Partida p) {
        if (!p.isEmAndamento()) throw new JogoException("Partida já finalizada.");
    }

    /**
     * Calcula letra para o Frontend e Narração.
     */
    public String calcularLetra(int numero, TipoJogo tipoJogo) {
        int tamanhoColuna = (tipoJogo == TipoJogo.BINGO_90) ? 18 : 15;
        int indice = (numero - 1) / tamanhoColuna;
        String[] letras = {"B", "I", "N", "G", "O"};
        if (indice >= 0 && indice < letras.length) {
            return letras[indice];
        }
        return "";
    }
}