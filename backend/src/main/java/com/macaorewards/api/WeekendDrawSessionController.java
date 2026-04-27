package com.macaorewards.api;

import com.macaorewards.api.dto.WeekendDrawSessionRequest;
import com.macaorewards.api.dto.WeekendDrawSessionResponse;
import com.macaorewards.security.SecurityUser;
import com.macaorewards.service.WeekendDrawSessionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/weekend-sessions")
public class WeekendDrawSessionController {

    private final WeekendDrawSessionService service;

    public WeekendDrawSessionController(WeekendDrawSessionService service) {
        this.service = service;
    }

    @GetMapping
    public List<WeekendDrawSessionResponse> list() {
        SecurityUser u = CurrentUser.require();
        return service.list(u.getId());
    }

    @GetMapping("/{id}")
    public WeekendDrawSessionResponse get(@PathVariable Long id) {
        SecurityUser u = CurrentUser.require();
        return service.get(id, u.getId());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WeekendDrawSessionResponse create(@Valid @RequestBody WeekendDrawSessionRequest body) {
        SecurityUser u = CurrentUser.require();
        return service.create(u.getId(), body);
    }

    @PatchMapping("/{id}")
    public WeekendDrawSessionResponse update(@PathVariable Long id, @Valid @RequestBody WeekendDrawSessionRequest body) {
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
