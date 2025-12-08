package br.com.bingofamilia.repository;

import br.com.bingofamilia.domain.Jogador;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface JogadorRepository extends JpaRepository<Jogador, Long> {

    List<Jogador> findAllByOrderByPontuacaoAcumuladaDesc();
}
