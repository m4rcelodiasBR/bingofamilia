package br.com.bingofamilia.domain;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "jogadores")
@Data
@NoArgsConstructor
public class Jogador {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String nome;

    private int pontuacaoAcumulada = 0;

    @Column(nullable = false)
    private boolean ativo = true;

    public Jogador(String nome) {
        this.nome = nome;
        this.ativo = true;
    }
}