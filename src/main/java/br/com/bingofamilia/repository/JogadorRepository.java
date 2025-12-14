package br.com.bingofamilia.repository;

import br.com.bingofamilia.domain.Jogador;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface JogadorRepository extends JpaRepository<Jogador, Long> {

    List<Jogador> findAllByOrderByPontuacaoAcumuladaDesc();

    List<Jogador> findByAtivoTrueOrderByPontuacaoAcumuladaDesc();

    Optional<Jogador> findByNomeIgnoreCase(String nome);
}