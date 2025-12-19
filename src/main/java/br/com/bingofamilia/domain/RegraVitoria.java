package br.com.bingofamilia.domain;

import lombok.Getter;

@Getter
public enum RegraVitoria {
    CARTELA_CHEIA("Cartela Cheia"),
    LINHA("Linha (5 Números, exclui a linha FREE)"),
    COLUNA("Coluna (5 Números, exclui a coluna FREE)"),
    LINHA_OU_COLUNA("Linha ou Coluna, exclui a linha ou coluna FREE");

    private final String descricao;

    RegraVitoria(String descricao) {
        this.descricao = descricao;
    }

}