package br.com.bingofamilia.controller;

import br.com.bingofamilia.domain.Partida;
import br.com.bingofamilia.domain.TipoJogo;
import br.com.bingofamilia.service.BingoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/partidas")
@CrossOrigin(origins = "*")
public class BingoController {

    private final BingoService bingoService;

    public BingoController(BingoService bingoService) {
        this.bingoService = bingoService;
    }

    @PostMapping
    public ResponseEntity<Partida> criarPartida(@RequestParam(defaultValue = "BINGO_75")TipoJogo tipoJogo) {
        Partida novaPartida = bingoService.iniciarNovaPartida(tipoJogo);
        return ResponseEntity.ok(novaPartida);
    }

    @PostMapping("/{id}/sortear")
    public ResponseEntity<Map<String, Object>> sortearNumero(@PathVariable Long id) {
        Integer numero = bingoService.realizarSorteio(id);
        Partida partidaAtualizada = bingoService.obterDadosPartida(id);

        return ResponseEntity.ok(Map.of(
                "ultimoNumero", numero,
                "todosSorteados", partidaAtualizada.getNumerossorteados()
        ));
    }

    @GetMapping("/{partidaId}")
    public ResponseEntity<Partida> consultarPartida(@PathVariable Long partidaId) {
        return ResponseEntity.ok(bingoService.obterDadosPartida(partidaId));
    }
}
