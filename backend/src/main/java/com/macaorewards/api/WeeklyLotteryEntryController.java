package com.macaorewards.api;

import com.macaorewards.api.dto.WeeklyLotteryEntryRequest;
import com.macaorewards.api.dto.WeeklyLotteryEntryResponse;
import com.macaorewards.security.SecurityUser;
import com.macaorewards.service.WeeklyLotteryEntryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/weekly-entries")
public class WeeklyLotteryEntryController {

    private final WeeklyLotteryEntryService service;

    public WeeklyLotteryEntryController(WeeklyLotteryEntryService service) {
        this.service = service;
    }

    @GetMapping
    public List<WeeklyLotteryEntryResponse> list() {
        SecurityUser u = CurrentUser.require();
        return service.list(u.getId());
    }

    @GetMapping("/{id}")
    public WeeklyLotteryEntryResponse get(@PathVariable Long id) {
        SecurityUser u = CurrentUser.require();
        return service.get(id, u.getId());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WeeklyLotteryEntryResponse create(@Valid @RequestBody WeeklyLotteryEntryRequest body) {
        SecurityUser u = CurrentUser.require();
        return service.create(u.getId(), body);
    }

    @PatchMapping("/{id}")
    public WeeklyLotteryEntryResponse update(@PathVariable Long id, @Valid @RequestBody WeeklyLotteryEntryRequest body) {
        SecurityUser u = CurrentUser.require();
        return service.update(id, u.getId(), body);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        SecurityUser u = CurrentUser.require();
        service.delete(id, u.getId());
    }
}
