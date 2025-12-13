package br.com.bingofamilia.service;

import br.com.bingofamilia.domain.Jogador;
import br.com.bingofamilia.domain.Partida;
import br.com.bingofamilia.domain.TipoJogo;
import br.com.bingofamilia.exception.JogoException;
import br.com.bingofamilia.repository.JogadorRepository;
import br.com.bingofamilia.repository.PartidaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

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

    @Transactional
    public Jogador criarJogador(String nome) {
        if (nome == null || nome.trim().isEmpty()) {
            throw new JogoException("Nome do jogador não pode ser vazio.");
        }
        return jogadorRepository.save(new Jogador(nome.trim()));
    }

    public List<Jogador> listarRanking() {
        return jogadorRepository.findAllByOrderByPontuacaoAcumuladaDesc();
    }

    public List<Jogador> listarTodosJogadores() {
        return jogadorRepository.findAll();
    }

    /**
     * Inicia uma nova partida gravando o timestamp inicial.
     */
    @Transactional
    public Partida iniciarNovaPartida(TipoJogo tipoJogo, List<Long> idsJogadoresParticipantes) {
        Partida partida = new Partida();
        partida.setTipoJogo(tipoJogo);
        partida.setDataInicio(LocalDateTime.now());

        if (idsJogadoresParticipantes != null && !idsJogadoresParticipantes.isEmpty()) {
            List<Jogador> jogadores = jogadorRepository.findAllById(idsJogadoresParticipantes);

            if (jogadores.isEmpty()) {
                throw new JogoException("Nenhum jogador válido encontrado com os IDs fornecidos.");
            }
            partida.getParticipantes().addAll(jogadores);
        } else {
            throw new JogoException("É necessário selecionar pelo menos um jogador.");
        }
        return partidaRepository.save(partida);
    }

    /**
     * Realiza o sorteio de um único número para uma partida específica.
     * Garante que o número não seja repetido.
     */
    @Transactional
    public Integer realizarSorteio(Long partidaId) {
        Partida partida = buscarPartidaPorId(partidaId);

        validarStatusPartida(partida);

        int maximo = (partida.getTipoJogo() == TipoJogo.BINGO_90) ? 90 : 75;
        List<Integer> sorteados = partida.getNumerosSorteados();

        if (sorteados.size() > maximo) {
            throw new JogoException("Todos os números já foram sorteados para este jogo");
        }

        int novoNumero;
        do {
            novoNumero = secureRandom.nextInt(maximo) + 1;
        } while (sorteados.contains(novoNumero));

        partida.getNumerosSorteados().add(novoNumero);
        partidaRepository.save(partida);

        return novoNumero;
    }

    /**
     * Finaliza a partida, define o vencedor e atribui pontuação.
     */
    @Transactional
    public Partida finalizarPartidaComVencedor(Long partidaId, Long idVencedor) {
        Partida partida = buscarPartidaPorId(partidaId);
        validarStatusPartida(partida);

        Jogador vencedor = jogadorRepository.findById(idVencedor)
                .orElseThrow(() -> new JogoException("Vencedor não encontrado."));

        if (!partida.getParticipantes().contains(vencedor)) {
            throw new JogoException("O jogador selecionado não é um participante desta partida.");
        }

        LocalDateTime agora = LocalDateTime.now();
        partida.setDataFim(agora);

        long duracaoSegundos = Duration.between(partida.getDataInicio(), agora).getSeconds();
        partida.setDuracaoEmSegundos(duracaoSegundos);

        partida.setVencedor(vencedor);
        vencedor.setPontuacaoAcumulada(vencedor.getPontuacaoAcumulada() + PONTOS_VITORIA);

        jogadorRepository.save(vencedor);
        return partidaRepository.save(partida);
    }

    /**
     * Busca os dados atuais da partida
     */
    public Partida obterDadosPartida(Long partidaId) {
        return buscarPartidaPorId(partidaId);
    }

    private Partida buscarPartidaPorId(Long partidaId) {
        return partidaRepository.findById(partidaId)
                .orElseThrow(() -> new JogoException("Partida não encontrada com o ID " + partidaId));
    }

    private void validarStatusPartida(Partida partida) {
        if (!partida.isEmAndamento()) {
            throw new JogoException("Esta partida já foi finalizada");
        }
    }

    public Integer sortearPedraMaior() {
        return secureRandom.nextInt(100) + 1;
    }
}
