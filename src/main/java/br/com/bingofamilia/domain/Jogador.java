package br.com.bingofamilia.domain;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "jogadores")
@Data
public class Jogador {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true) // Nomes únicos para evitar confusão
    private String nome;

    @Column(nullable = false)
    private Integer pontuacaoAcumulada = 0; // Pontuação global para o Ranking

    public Jogador(String nome) {
        this.nome = nome;
    }

    public Jogador() {}
}

