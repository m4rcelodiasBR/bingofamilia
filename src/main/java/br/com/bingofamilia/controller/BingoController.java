package br.com.bingofamilia.controller;

import br.com.bingofamilia.domain.Jogador;
import br.com.bingofamilia.domain.Partida;
import br.com.bingofamilia.domain.RegraVitoria;
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

    @PutMapping("/jogadores/{id}")
    public ResponseEntity<Jogador> editarJogador(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        return ResponseEntity.ok(bingoService.atualizarJogador(id, payload.get("nome")));
    }

    @DeleteMapping("/jogadores/{id}")
    public ResponseEntity<Void> excluirJogador(@PathVariable Long id) {
        bingoService.inativarJogador(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/jogadores")
    public ResponseEntity<List<Jogador>> listarJogadores() {
        return ResponseEntity.ok(bingoService.listarJogadoresAtivos());
    }

    @GetMapping("/ranking")
    public ResponseEntity<List<Jogador>> obterRanking() {
        return ResponseEntity.ok(bingoService.listarRanking());
    }

    @GetMapping("/partidas")
    public ResponseEntity<List<Partida>> listarHistorico() {
        return ResponseEntity.ok(bingoService.listarHistoricoPartidas());
    }

    @DeleteMapping("/partidas/{id}")
    public ResponseEntity<Void> anularPartida(@PathVariable Long id) {
        bingoService.anularPartida(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/partidas")
    public ResponseEntity<Partida> criarPartida(@RequestBody NovaPartidaRequest request) {
        return ResponseEntity.ok(bingoService.iniciarNovaPartida(
                request.tipo(),
                request.regraVitoria(),
                request.participantes()
        ));
    }

    @PostMapping("/partidas/{id}/sortear")
    public ResponseEntity<Map<String, Object>> sortear(@PathVariable Long id) {
        Integer numero = bingoService.realizarSorteio(id);
        Partida partida = bingoService.obterDadosPartida(id);

        String letra = bingoService.calcularLetra(numero, partida.getTipoJogo());

        return ResponseEntity.ok(Map.of(
                "ultimoNumero", numero,
                "letra", letra, // Ex: "N"
                "textoNarracao", "Letra " + letra + ". Número " + numero,
                "partida", partida
        ));
    }

    @GetMapping("/partidas/{id}")
    public ResponseEntity<Partida> consultar(@PathVariable Long id) {
        return ResponseEntity.ok(bingoService.obterDadosPartida(id));
    }

    @PostMapping("/partidas/{id}/finalizar")
    public ResponseEntity<Partida> finalizar(@PathVariable Long id, @RequestBody Map<String, Long> payload) {
        return ResponseEntity.ok(bingoService.finalizarPartidaComVencedor(id, payload.get("vencedorId")));
    }

    @GetMapping("/sorteio-extra")
    public ResponseEntity<Map<String, Integer>> sortearExtra() {
        return ResponseEntity.ok(Map.of("numero", bingoService.sortearPedraMaior()));
    }
}

record NovaPartidaRequest(TipoJogo tipo, RegraVitoria regraVitoria, List<Long> participantes) {}