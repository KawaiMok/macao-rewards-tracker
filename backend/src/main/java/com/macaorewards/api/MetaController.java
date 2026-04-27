package com.macaorewards.api;

import com.macaorewards.api.dto.WalletMetaDto;
import com.macaorewards.domain.WalletProvider;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/meta")
public class MetaController {

    @GetMapping("/wallets")
    public List<WalletMetaDto> wallets() {
        return Arrays.stream(WalletProvider.values())
                .map(w -> new WalletMetaDto(w.name(), w.getDisplayName()))
                .toList();
    }
}
