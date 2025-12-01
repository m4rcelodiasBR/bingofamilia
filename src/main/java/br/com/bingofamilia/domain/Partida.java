package br.com.bingofamilia.domain;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Representa uma sessão de jogo de Bingo.
 * Armazena o histórico dos números sorteados e o status da partida.
 */
@Entity
@Table(name = "partidas")
@Data
public class Partida {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoJogo tipoJogo;

    @Column(nullable = false)
    private LocalDateTime dataInicio;

    private LocalDateTime dataFim;

    @ElementCollection
    @CollectionTable(name = "partida_numeros_sorteados", joinColumns = @JoinColumn(name = "partida_id"))
    @Column(name = "numero")
    private List<Integer> numerosSorteados = new ArrayList<>();

    /**
     * Verifica se a partida está ativa.
     * @return true se a dataFim for nula.
     */
    public boolean isEmAndamento() {
        return this.dataFim == null;
    }
}
