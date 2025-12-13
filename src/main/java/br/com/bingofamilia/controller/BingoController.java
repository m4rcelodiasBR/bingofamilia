package br.com.bingofamilia.controller;

import br.com.bingofamilia.domain.Jogador;
import br.com.bingofamilia.domain.Partida;
import br.com.bingofamilia.domain.TipoJogo;
import br.com.bingofamilia.service.BingoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class BingoController {

    private final BingoService bingoService;

    public BingoController(BingoService bingoService) {
        this.bingoService = bingoService;
    }

    @PostMapping("/jogadores")
    public ResponseEntity<Jogador> criarJogador(@RequestBody Map<String, String> payload) {
        return ResponseEntity.ok(bingoService.criarJogador(payload.get("nome")));
    }

    @GetMapping("/jogadores")
    public ResponseEntity<List<Jogador>> listarJogadores() {
        return ResponseEntity.ok(bingoService.listarTodosJogadores());
    }

    @GetMapping("/ranking")
    public ResponseEntity<List<Jogador>> obterRanking() {
        return ResponseEntity.ok(bingoService.listarRanking());
    }

    /**
     * Cria partida.
     * Espera JSON: { "tipo": "BINGO_75", "participantes": [1, 2, 5] }
     */
    @PostMapping("/partidas")
    public ResponseEntity<Partida> criarPartida(@RequestBody NovaPartidaRequest request) {
        Partida partida = bingoService.iniciarNovaPartida(request.tipo(), request.participantes());
        return ResponseEntity.ok(partida);
    }

    @PostMapping("/partidas/{id}/sortear")
    public ResponseEntity<Map<String, Object>> sortear(@PathVariable Long id) {
        Integer numero = bingoService.realizarSorteio(id);
        Partida partida = bingoService.obterDadosPartida(id);
        String letra = bingoService.calcularLetra(numero, partida.getTipoJogo());
        Map<String, Object> resposta = Map.of(
                "ultimoNumero", numero,
                "letra", letra,
                "textoNarracao", "Letra " + letra + ". Número " + numero,
                "partida", partida
        );
        return ResponseEntity.ok(resposta);
    }

    @GetMapping("/partidas/{id}")
    public ResponseEntity<Partida> consultar(@PathVariable Long id) {
        return ResponseEntity.ok(bingoService.obterDadosPartida(id));
    }

    /**
     * Finaliza a partida.
     * Espera JSON: { "vencedorId": 5 }
     */
    @PostMapping("/partidas/{id}/finalizar")
    public ResponseEntity<Partida> finalizar(@PathVariable Long id, @RequestBody Map<String, Long> payload) {
        Long vencedorId = payload.get("vencedorId");
        return ResponseEntity.ok(bingoService.finalizarPartidaComVencedor(id, vencedorId));
    }

    @GetMapping("/sorteio-extra")
    public ResponseEntity<Map<String, Integer>> sortearExtra() {
        return ResponseEntity.ok(Map.of("numero", bingoService.sortearPedraMaior()));
    }
}

// Record auxiliar para receber o JSON de criação (pode ficar no mesmo arquivo ou em um DTO separado)
record NovaPartidaRequest(TipoJogo tipo, List<Long> participantes) {}
