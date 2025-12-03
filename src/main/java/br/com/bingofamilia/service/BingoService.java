package br.com.bingofamilia.service;

import br.com.bingofamilia.domain.Partida;
import br.com.bingofamilia.domain.TipoJogo;
import br.com.bingofamilia.exception.JogoException;
import br.com.bingofamilia.repository.PartidaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class BingoService {

    private final PartidaRepository partidaRepository;
    private final SecureRandom secureRandom = new SecureRandom();

    public BingoService(PartidaRepository partidaRepository) {
        this.partidaRepository = partidaRepository;
    }

    /**
     * Inicia uma nova partida gravando o timestamp inicial.
     */
    @Transactional
    public Partida iniciarNovaPartida(TipoJogo tipoJogo) {
        Partida partida = new Partida();
        partida.setTipoJogo(tipoJogo);
        partida.setDataInicio(LocalDateTime.now());
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
     * Busca os dados atuais da partida
     */
    public Partida obterDadosPartida(Long partidaId) {
        return buscarPartidaPorId(partidaId);
    }

    /**
     * Finaliza a partida para que não ocorram mais sorteios
     */
    @Transactional
    public Partida finalizarPartida(Long partidaId) {
        Partida partida = buscarPartidaPorId(partidaId);
        partida.setDataFim(LocalDateTime.now());
        return partidaRepository.save(partida);
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

}
