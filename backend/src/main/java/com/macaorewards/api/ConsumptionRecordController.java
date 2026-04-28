package com.macaorewards.api;

import com.macaorewards.api.dto.ConsumptionRecordRequest;
import com.macaorewards.api.dto.ConsumptionRecordResponse;
import com.macaorewards.api.dto.UndoExplicitConsumeRequest;
import com.macaorewards.domain.WalletProvider;
import com.macaorewards.security.SecurityUser;
import com.macaorewards.service.ConsumptionRecordService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/consumptions")
public class ConsumptionRecordController {

    private final ConsumptionRecordService service;

    public ConsumptionRecordController(ConsumptionRecordService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ConsumptionRecordResponse create(@Valid @RequestBody ConsumptionRecordRequest body) {
        SecurityUser u = CurrentUser.require();
        return service.create(u.getId(), body);
    }

    @GetMapping("/current-week")
    public List<ConsumptionRecordResponse> currentWeek(@RequestParam WalletProvider wallet) {
        SecurityUser u = CurrentUser.require();
        return service.listCurrentWeek(u.getId(), wallet);
    }

    @PostMapping("/undo-explicit")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void undoExplicit(@Valid @RequestBody UndoExplicitConsumeRequest body) {
        SecurityUser u = CurrentUser.require();
        service.undoExplicitConsume(u.getId(), body);
    }
}
